export type ModelId = 'gemma-2-2b' | 'gemma-2-9b'

export interface ModelConfig {
  id: ModelId
  ollamaModels: string[]
  label: string
  downloadSize: string
  contextLimit: number
}

export const MODELS: Record<ModelId, ModelConfig> = {
  'gemma-2-2b': {
    id: 'gemma-2-2b',
    ollamaModels: ['gemma2:2b', 'gemma2', 'gemma2:latest'],
    label: 'Gemma 2 2B (Ollama)',
    downloadSize: 'local',
    contextLimit: 8192,
  },
  'gemma-2-9b': {
    id: 'gemma-2-9b',
    ollamaModels: ['gemma2:9b', 'gemma2:latest'],
    label: 'Gemma 2 9B (Ollama)',
    downloadSize: 'local',
    contextLimit: 8192,
  },
}

export const DEFAULT_MODEL_ID: ModelId = 'gemma-2-2b'
export const STORAGE_KEY_MODEL = 'gemma_selected_model'
