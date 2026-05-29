import type { ModelBackend, GenerateOptions } from '@kessler/gemma-agent'
import { log } from '@/shared/logger'
import { MODELS, DEFAULT_MODEL_ID, type ModelId } from '@/shared/models'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

const SPECIAL_TOKENS = new Set([
  '<eos>', '<bos>', '<end_of_turn>', '<start_of_turn>',
  '<|turn>', '<turn|>',
  '<|tool>', '<tool|>',
  '<|tool_call>', '<tool_call|>',
  '<|tool_response>', '<tool_response|>',
  '<|channel>', '<channel|>',
  '<|think|>', '<|image|>',
  '<|"|>',
])

function stripSpecialTokens(text: string): string {
  let result = text
  for (const token of SPECIAL_TOKENS) {
    if (result.includes(token)) {
      result = result.split(token).join('')
    }
  }
  return result
}

function matchesOllamaModel(installedName: string, candidate: string): boolean {
  if (installedName === candidate) return true
  if (installedName.startsWith(`${candidate}:`)) return true
  if (installedName.startsWith(`${candidate}-`)) return true
  return false
}

function formatOllamaAccessError(body: string, endpoint: string): string {
  const trimmedBody = body.trim()
  const originHint = 'If you are running Ollama locally, allow this extension origin with OLLAMA_ORIGINS, for example: OLLAMA_ORIGINS=chrome-extension://* ,moz-extension://* ,safari-web-extension://* ollama serve'

  if (trimmedBody) {
    return `Ollama denied ${endpoint}: ${trimmedBody}. ${originHint}`
  }

  return `Ollama denied ${endpoint}. ${originHint}`
}

type StatusCallback = (status: 'loading' | 'ready' | 'error', progress?: number, error?: string) => void

type OllamaTagsResponse = {
  models?: Array<{ name?: string }>
}

type OllamaGenerateChunk = {
  response?: string
  done?: boolean
  error?: string
}

export class GemmaModelHost implements ModelBackend {
  private currentModelId: ModelId | null = null
  private currentOllamaModel: string | null = null
  private loading = false
  private loadingModelId: ModelId | null = null
  private onStatus: StatusCallback
  private abortController: AbortController | null = null

  constructor(onStatus: StatusCallback) {
    this.onStatus = onStatus
  }

  async load(modelId: ModelId = DEFAULT_MODEL_ID): Promise<void> {
    log.info('load() called:', modelId, '| current:', this.currentModelId, '| loading:', this.loading)

    if (this.currentModelId === modelId && this.currentOllamaModel) {
      this.onStatus('ready')
      return
    }

    if (this.loading) {
      log.warn('load() blocked by loading guard — another load is in progress')
      return
    }

    this.loading = true
    this.loadingModelId = modelId
    this.onStatus('loading', 0)

    const config = MODELS[modelId]
    try {
      this.currentOllamaModel = await this.resolveOllamaModel(config.ollamaModels)
      this.currentModelId = modelId
      this.loadingModelId = null
      this.loading = false
      this.onStatus('ready')
    } catch (e) {
      this.loading = false
      this.loadingModelId = null
      this.currentOllamaModel = null
      const message = e instanceof Error ? e.message : String(e)
      this.onStatus('error', undefined, message)
      throw e
    }
  }

  async unload(): Promise<void> {
    this.currentModelId = null
    this.currentOllamaModel = null
    this.loading = false
  }

  getCurrentModelId(): ModelId | null {
    return this.currentModelId ?? this.loadingModelId
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  async generateRaw(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.currentOllamaModel) {
      throw new Error('Ollama model not loaded')
    }

    if (options?.media && options.media.length > 0) {
      log.warn('Ollama backend does not support media inputs; ignoring attached media')
    }

    this.abortController = new AbortController()
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.currentOllamaModel,
        prompt,
        stream: true,
        options: {
          num_predict: options?.maxTokens ?? 1024,
          temperature: 0,
        },
      }),
      signal: this.abortController.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      if (response.status === 403) {
        throw new Error(formatOllamaAccessError(body, '/api/generate'))
      }
      throw new Error(body.trim() ? `Ollama request failed: ${response.status} ${response.statusText} - ${body.trim()}` : `Ollama request failed: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Ollama response stream unavailable')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let rawResult = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        let newlineIndex = buffer.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim()
          buffer = buffer.slice(newlineIndex + 1)
          if (line) {
            const chunk = JSON.parse(line) as OllamaGenerateChunk
            if (chunk.error) {
              throw new Error(chunk.error)
            }
            if (chunk.response) {
              rawResult += chunk.response
              const clean = stripSpecialTokens(chunk.response)
              if (clean) options?.onChunk?.(clean)
            }
          }
          newlineIndex = buffer.indexOf('\n')
        }
      }

      const tail = buffer.trim()
      if (tail) {
        const chunk = JSON.parse(tail) as OllamaGenerateChunk
        if (chunk.error) {
          throw new Error(chunk.error)
        }
        if (chunk.response) {
          rawResult += chunk.response
          const clean = stripSpecialTokens(chunk.response)
          if (clean) options?.onChunk?.(clean)
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        log.info('Generation aborted by user')
        return rawResult
      }
      throw e
    } finally {
      this.abortController = null
      reader.releaseLock()
    }

    return rawResult
  }

  contextLimit = 8192

  countTokens(text: string): number {
    const trimmed = text.trim()
    if (!trimmed) return 0
    return Math.max(1, Math.ceil(trimmed.length / 4))
  }

  isLoaded(): boolean {
    return this.currentOllamaModel !== null
  }

  private async resolveOllamaModel(candidates: string[]): Promise<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      if (response.status === 403) {
        throw new Error(formatOllamaAccessError(body, '/api/tags'))
      }
      throw new Error(body.trim() ? `Unable to reach Ollama at ${OLLAMA_BASE_URL}: ${response.status} ${response.statusText} - ${body.trim()}` : `Unable to reach Ollama at ${OLLAMA_BASE_URL}: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as OllamaTagsResponse
    const installedModels = data.models?.map(model => model.name).filter((name): name is string => !!name) ?? []

    for (const candidate of candidates) {
      const match = installedModels.find(name => matchesOllamaModel(name, candidate))
      if (match) return match
    }

    throw new Error(`No matching Ollama model found. Tried: ${candidates.join(', ')}`)
  }
}
