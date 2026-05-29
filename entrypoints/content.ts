import { createGemIcon, updateGemProgress, setGemDisabled } from '@/content/gem-icon'
import { ChatOverlay } from '@/content/chat-overlay'
import type { ChatSettings } from '@/content/chat-overlay'
import { executeContentTool } from '@/content/tool-executors'
import type { Message } from '@/shared/messages'
import type { ToolCall } from '@kessler/gemma-agent'
import { MODELS, STORAGE_KEY_MODEL, DEFAULT_MODEL_ID, type ModelId } from '@/shared/models'
import type { QuickActionId } from '@/content/chat-overlay'

const STORAGE_KEY = 'gemma_disabled_sites'
const PAGE_SNAPSHOT_MAX_LENGTH = 8000

type ImageContext = {
  name: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  extractedText: string | null
}

function buildBasicImageContext(file: File): string {
  return [
    `name: ${file.name || 'uploaded-image'}`,
    `mime_type: ${file.type || 'unknown'}`,
    `size: ${formatBytes(file.size)}`,
    'dimensions: unknown (still processing)',
    'detected_text: unknown (still processing)',
  ].join('\n')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function getImageDimensions(file: File): Promise<{ width: number, height: number }> {
  const bitmap = await createImageBitmap(file)
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

async function detectImageText(file: File): Promise<string | null> {
  const TextDetectorCtor = (window as Window & {
    TextDetector?: new () => { detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string }>> }
  }).TextDetector

  if (!TextDetectorCtor) {
    return null
  }

  const bitmap = await createImageBitmap(file)
  try {
    const detector = new TextDetectorCtor()
    const results = await detector.detect(bitmap)
    const text = results
      .map(result => result.rawValue?.trim() ?? '')
      .filter(Boolean)
      .join('\n')
      .trim()
    return text || null
  } catch {
    return null
  } finally {
    bitmap.close()
  }
}

async function buildImageContext(file: File): Promise<ImageContext> {
  const [{ width, height }, extractedText] = await Promise.all([
    getImageDimensions(file),
    detectImageText(file),
  ])

  return {
    name: file.name || 'uploaded-image',
    mimeType: file.type || 'unknown',
    sizeBytes: file.size,
    width,
    height,
    extractedText,
  }
}

function serializeImageContext(ctx: ImageContext): string {
  const lines = [
    `name: ${ctx.name}`,
    `mime_type: ${ctx.mimeType}`,
    `size: ${formatBytes(ctx.sizeBytes)}`,
    `dimensions: ${ctx.width}x${ctx.height}`,
  ]

  if (ctx.extractedText) {
    lines.push('detected_text:')
    lines.push(ctx.extractedText.slice(0, 6000))
  } else {
    lines.push('detected_text: none')
  }

  return lines.join('\n')
}
const LANGUAGE_TO_LOCALE: Record<string, string> = {
  auto: 'auto',
  English: 'en-US',
  Spanish: 'es-ES',
  Hindi: 'hi-IN',
  French: 'fr-FR',
  German: 'de-DE',
  Portuguese: 'pt-BR',
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Arabic: 'ar-SA',
}

function detectPageLanguage(): string {
  const htmlLang = document.documentElement?.lang?.trim()
  if (htmlLang) return htmlLang
  return navigator.language || 'unknown'
}

function getActiveLanguage(settings: ChatSettings, pageLanguage: string): string {
  if (settings.languageMode !== 'auto') return settings.languageMode
  return pageLanguage !== 'unknown' ? pageLanguage : (navigator.language || 'English')
}

function getSpeechLocale(settings: ChatSettings, pageLanguage: string): string {
  if (settings.languageMode !== 'auto') {
    return LANGUAGE_TO_LOCALE[settings.languageMode] || navigator.language || 'en-US'
  }
  return pageLanguage || navigator.language || 'en-US'
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1')
    .replace(/[>#*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function capturePageSnapshot(pageLanguage: string): string {
  const title = document.title
  const url = location.href
  const body = document.body?.innerText ?? ''
  const truncated = body.length > PAGE_SNAPSHOT_MAX_LENGTH
    ? body.slice(0, PAGE_SNAPSHOT_MAX_LENGTH) + '\n...(truncated)'
    : body

  return `url: ${url}\ntitle: ${title}\npage_language: ${pageLanguage}\n\n${truncated}`
}

function buildQuickActionPrompt(action: QuickActionId, settings: ChatSettings, pageLanguage: string): string {
  const targetLanguage = getActiveLanguage(settings, pageLanguage)
  switch (action) {
    case 'summarize-page':
      return `Summarize this page in ${targetLanguage}. Keep it concise, useful, and structured with the most important points first.`
    case 'translate-page':
      return `Translate this page into ${targetLanguage}. Preserve meaning, names, and tone. If the page is already in ${targetLanguage}, say that clearly and summarize it instead.`
    case 'reply-in-language':
      return `Draft a concise reply in ${targetLanguage} based on the current page context. Make it sound natural and ready to send.`
  }
}

function getSiteKey(): string {
  return location.hostname
}

async function isDisabledForSite(): Promise<boolean> {
  const data = await browser.storage.local.get(STORAGE_KEY)
  const sites: string[] = data[STORAGE_KEY] ?? []
  return sites.includes(getSiteKey())
}

async function setDisabledForSite(disabled: boolean): Promise<void> {
  const data = await browser.storage.local.get(STORAGE_KEY)
  const sites: string[] = data[STORAGE_KEY] ?? []
  const site = getSiteKey()

  if (disabled && !sites.includes(site)) {
    sites.push(site)
  } else if (!disabled) {
    const idx = sites.indexOf(site)
    if (idx !== -1) sites.splice(idx, 1)
  }

  await browser.storage.local.set({ [STORAGE_KEY]: sites })
}

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    let siteDisabled = await isDisabledForSite()
    let pendingImageContext: string | null = null
    let imageProcessing = false

    const modelData = await browser.storage.local.get(STORAGE_KEY_MODEL)
    const initialModelId: ModelId = modelData[STORAGE_KEY_MODEL] ?? DEFAULT_MODEL_ID
    const SpeechRecognitionCtor = (window as Window & {
      SpeechRecognition?: new () => any
      webkitSpeechRecognition?: new () => any
    }).SpeechRecognition ?? (window as Window & {
      SpeechRecognition?: new () => any
      webkitSpeechRecognition?: new () => any
    }).webkitSpeechRecognition ?? null

    let speechRecognition: any = null
    let speechBaseText = ''
    let speechListening = false

    function stopSpeechSynthesis(): void {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }

    function speakReply(text: string): void {
      if (!chat.settings.speakReplies) return
      if (!('speechSynthesis' in window)) return

      const cleanText = stripMarkdown(text)
      if (!cleanText) return

      stopSpeechSynthesis()
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = getSpeechLocale(chat.settings, detectPageLanguage())
      window.speechSynthesis.speak(utterance)
    }

    function stopVoiceRecognition(): void {
      if (speechRecognition && speechListening) {
        try {
          speechRecognition.stop()
        } catch {
          // ignore
        }
      }
      speechListening = false
      chat.setVoiceState('idle')
    }

    function startVoiceRecognition(): void {
      if (!SpeechRecognitionCtor) {
        chat.setVoiceState('unsupported', 'Speech recognition is not supported in this browser')
        chat.updateStatus('Voice input is not supported here')
        return
      }

      if (speechListening) {
        stopVoiceRecognition()
        return
      }

      speechRecognition = new SpeechRecognitionCtor()
      speechBaseText = chat.getInputValue()
      speechListening = true
      chat.setVoiceState('listening', 'Listening... click again to stop')
      chat.updateStatus('Listening...')

      speechRecognition.lang = getSpeechLocale(chat.settings, detectPageLanguage())
      speechRecognition.continuous = true
      speechRecognition.interimResults = true
      speechRecognition.maxAlternatives = 1

      speechRecognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        chat.setInputValue(`${speechBaseText}${transcript}`.trim())
      }

      speechRecognition.onerror = (event: any) => {
        speechListening = false
        chat.setVoiceState('error', event.error ? `Voice input error: ${event.error}` : 'Voice input error')
        chat.updateStatus(`Error: ${event.error ?? 'voice input failed'}`)
      }

      speechRecognition.onend = () => {
        speechListening = false
        if (chat.settings.speakReplies) {
          chat.setVoiceState('idle', 'Push to talk')
        } else {
          chat.setVoiceState('idle')
        }
        if (chat.getInputValue().trim()) {
          chat.updateStatus('Voice transcribed')
        }
      }

      try {
        speechRecognition.start()
      } catch (error) {
        speechListening = false
        chat.setVoiceState('error', 'Could not start voice input')
        chat.updateStatus('Error: could not start voice input')
      }
    }

    function sendPrompt(userText: string): void {
      const trimmedUserText = userText.trim()
      const defaultImagePrompt = pendingImageContext
        ? 'Explain the attached image and answer any question using the extracted image text and metadata.'
        : ''
      const basePrompt = trimmedUserText || defaultImagePrompt
      if (!basePrompt) return

      const finalPrompt = pendingImageContext
        ? [
            basePrompt,
            '',
            'The following image context was extracted locally from an uploaded image:',
            pendingImageContext,
            imageProcessing ? 'note: image extraction is still running; dimensions/text may be incomplete.' : '',
            '',
            'Important: You are Gemma 2 (text-only). You do not receive image pixels directly. Use only this extracted context and clearly state uncertainty when needed.',
          ].join('\n')
        : basePrompt

      stopped = false
      stopSpeechSynthesis()
      chat.setGenerating(true)
      chat.setInputEnabled(false)
      chat.setModelSwitchEnabled(false)
      chat.showTyping()
      chat.updateStatus('Waiting for Ollama response...')
      const pageLanguage = detectPageLanguage()
      const pageContext = capturePageSnapshot(pageLanguage)
      safeSend({ type: 'chat:send', text: finalPrompt, settings: chat.settings, pageContext, pageLanguage } as any)

      if (pendingImageContext) {
        pendingImageContext = null
        imageProcessing = false
        chat.clearAttachedImage()
      }
    }

    function safeSend(message: Message): void {
      try {
        browser.runtime.sendMessage(message).catch(() => {
          chat.updateStatus('Extension reloaded — refresh the page')
        })
      } catch {
        chat.updateStatus('Extension reloaded — refresh the page')
      }
    }

    const chat = new ChatOverlay({
      onSend(text) {
        sendPrompt(text)
      },
      onStop() {
        stopped = true
        stopVoiceRecognition()
        stopSpeechSynthesis()
        safeSend({ type: 'chat:stop' } as any)
        chat.finalizeThinkingStream()
        chat.finalizeStream('')
        chat.addMessage('Stopped', 'stopped')
        chat.updateStatus('Ready')
        chat.setInputEnabled(true)
        chat.setModelSwitchEnabled(true)
      },
      onSettingsChange(settings: ChatSettings) {
        safeSend({ type: 'settings:update', settings } as any)
      },
      onClearContext() {
        safeSend({ type: 'context:clear' } as any)
      },
      onDisableSite() {
        siteDisabled = true
        setDisabledForSite(true)
        chat.hide()
        setGemDisabled(true)
        chat.updateStatus('Disabled on this site')
      },
      onModelSwitch(modelId: ModelId) {
        chat.setInputEnabled(false)
        chat.setModelSwitchEnabled(false)
        chat.addMessage(`Switching to ${MODELS[modelId].label}...`, 'agent')
        chat.updateStatus(`Switching to ${MODELS[modelId].label}...`)
        modelReady = false
        shownLoadingMessage = false
        safeSend({ type: 'model:switch', modelId })
      },
      onVoiceToggle() {
        startVoiceRecognition()
      },
      onQuickAction(action: QuickActionId) {
        sendPrompt(buildQuickActionPrompt(action, chat.settings, detectPageLanguage()))
      },
      onImageAttach(file: File) {
        imageProcessing = true
        pendingImageContext = buildBasicImageContext(file)
        chat.setAttachedImage(file.name || 'uploaded-image')
        chat.updateStatus('Processing image locally...')
        void (async () => {
          try {
            const context = await buildImageContext(file)
            pendingImageContext = serializeImageContext(context)
            imageProcessing = false
            chat.setAttachedImage(context.name)
            if (context.extractedText) {
              chat.updateStatus(`Image ready (${context.width}x${context.height}, OCR found)`)
            } else {
              chat.updateStatus(`Image ready (${context.width}x${context.height})`)
              chat.addMessage('Image attached. Gemma 2 is text-only, so image answers will use local OCR and metadata from your file.', 'agent')
            }
          } catch {
            imageProcessing = false
            // Keep basic context so user can still query the image by metadata
            chat.updateStatus('Image attached (basic context only)')
          }
        })()
      },
      onImageClear() {
        pendingImageContext = null
        imageProcessing = false
        chat.updateStatus('Image removed')
      },
    })

    chat.setSelectedModel(initialModelId)
    chat.updateStatus(siteDisabled ? 'Disabled on this site' : 'Waiting for model...')

    let modelReady = false
    let shownLoadingMessage = false
    let stopped = false

    const icon = createGemIcon(() => {
      if (siteDisabled) {
        if (confirm('Re-enable Gemma Gem on this site?')) {
          siteDisabled = false
          setDisabledForSite(false)
          setGemDisabled(false)
          chat.updateStatus('Waiting for model...')
        }
        return
      }
      chat.toggle()
      safeSend({ type: 'chat:open' })
    })

    document.body.appendChild(icon)
    document.body.appendChild(chat.getElement())

    if (siteDisabled) {
      setGemDisabled(true)
    }

    browser.runtime.onMessage.addListener((message: Message) => {
      switch (message.type) {
        case 'agent:response':
          if (stopped) break
          chat.finalizeThinkingStream()
          chat.finalizeStream(message.text)
          chat.setInputEnabled(true)
          chat.setModelSwitchEnabled(true)
          speakReply(message.text)
          break

        case 'agent:chunk':
          if (stopped) break
          if (message.text.startsWith('[Tool]')) {
            chat.finalizeThinkingStream()
            chat.addMessage(message.text, 'tool')
          } else if (message.text.startsWith('[Thinking]')) {
            chat.appendThinkingStream(message.text.replace(/^\[Thinking\]\s*/, ''))
          } else if (message.text.trim()) {
            chat.finalizeThinkingStream()
            chat.appendStream(message.text)
          }
          break

        case 'agent:tool_call':
          handleToolCall(message.requestId, message.call)
          break

        case 'gpu:warning':
          chat.addMessage(message.text, 'agent')
          chat.updateStatus(`Error: ${message.text}`)
          break

        case 'model:status':
          if (message.status === 'loading') {
            const pct = message.progress != null ? Math.round(message.progress) : 0
            updateGemProgress(pct)
            chat.updateStatus(`Connecting to Ollama... ${pct}%`)
            chat.setInputEnabled(false)
            chat.setModelSwitchEnabled(false)
            if (!shownLoadingMessage) {
              shownLoadingMessage = true
              const modelConfig = MODELS[message.modelId ?? initialModelId]
              chat.addMessage(`Connecting to Ollama for ${modelConfig.label}... Make sure Ollama is running locally and the model is installed.`, 'agent')
            }
          } else if (message.status === 'ready') {
            updateGemProgress(-1)
            chat.updateStatus('Ready')
            chat.setInputEnabled(true)
            chat.setModelSwitchEnabled(true)
            chat.setVoiceState('idle')
            if (message.modelId) {
              chat.setSelectedModel(message.modelId)
            }
            if (!modelReady) {
              modelReady = true
              chat.addMessage('Model loaded. How can I help with this page?', 'agent')
            }
          } else if (message.status === 'error') {
            updateGemProgress(-1)
            chat.updateStatus(`Error: ${message.error}`)
            chat.setModelSwitchEnabled(true)
            chat.setVoiceState('error', message.error ?? 'Model error')
          }
          break
      }
    })

    function handleToolCall(requestId: string, call: ToolCall): void {
      const result = executeContentTool(call)
      if (result) {
        safeSend({ type: 'tool:result', requestId, result: result.result })
      }
    }
  },
})
