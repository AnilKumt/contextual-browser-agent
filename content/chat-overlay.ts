import { marked } from 'marked'
import { MODELS, DEFAULT_MODEL_ID, type ModelId } from '@/shared/models'
import type { LanguageMode } from '@/shared/messages'

marked.setOptions({ breaks: true })

export interface ChatSettings {
  thinking: boolean
  maxIterations: number
  languageMode: LanguageMode
  speakReplies: boolean
}

export type QuickActionId = 'translate-page' | 'summarize-page' | 'reply-in-language'

const DEFAULT_SETTINGS: ChatSettings = {
  thinking: true,
  maxIterations: 10,
  languageMode: 'auto',
  speakReplies: false,
}

const LANGUAGE_OPTIONS: Array<{ label: string, value: LanguageMode }> = [
  { label: 'Auto detect', value: 'auto' },
  { label: 'English', value: 'English' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'French', value: 'French' },
  { label: 'German', value: 'German' },
  { label: 'Portuguese', value: 'Portuguese' },
  { label: 'Japanese', value: 'Japanese' },
  { label: 'Korean', value: 'Korean' },
  { label: 'Arabic', value: 'Arabic' },
]

const STYLES = `
  :host {
    all: initial;
    font-family: Roboto, 'Segoe UI', Arial, sans-serif;
  }

  .chat-container {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 380px;
    height: 500px;
    background: #ffffff;
    border: 1px solid #dfe3eb;
    border-radius: 16px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.08);
    color: #1f2937;
    font-size: 14px;
  }

  /* Header */
  .chat-header {
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .chat-header-title {
    font-weight: 500;
    font-size: 14px;
    color: #111827;
    user-select: none;
    letter-spacing: 0.01em;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .chat-header-mark {
    width: 22px;
    height: 22px;
    display: block;
    flex-shrink: 0;
  }
  .chat-status { font-size: 11px; color: #6b7280; user-select: none; }
  .chat-header-right { display: flex; align-items: center; gap: 6px; }
  .chat-header-btn {
    background: transparent; border: none; color: #6b7280; cursor: pointer;
    font-size: 15px; padding: 4px 6px; line-height: 1; transition: color 0.2s, background 0.2s, border-radius 0.2s;
  }
  .chat-header-btn:hover { color: #111827; background: #eef2ff; border-radius: 8px; }

  .brand-banner {
    margin: 12px 12px 4px;
    padding: 14px 16px;
    border: 1px solid #dbe4ef;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: center;
    min-height: 104px;
    overflow: hidden;
  }
  .brand-banner img {
    width: 100%;
    max-width: 300px;
    height: auto;
    display: block;
    flex-shrink: 0;
  }
  .brand-banner-fallback {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-width: 0;
    color: #111827;
    font-size: 13px;
    font-weight: 600;
  }

  .quick-actions {
    margin: 0 12px 8px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .quick-action {
    appearance: none;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #1f2937;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .quick-action:hover {
    background: #f8fafc;
    border-color: #bfdbfe;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }
  .quick-action.primary {
    background: #1a73e8;
    border-color: #1a73e8;
    color: #ffffff;
  }
  .quick-action.primary:hover {
    background: #1558b0;
    border-color: #1558b0;
  }

  .welcome-card {
    margin: 12px 12px 4px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    background: #f8fafc;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .welcome-card img {
    width: 100%;
    max-width: 240px;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .welcome-card-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    text-align: center;
  }
  .welcome-card-copy {
    font-size: 12px;
    line-height: 1.5;
    color: #4b5563;
    text-align: center;
  }

  /* Settings panel */
  .settings-panel {
    padding: 12px 16px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    display: none;
    flex-direction: column;
    gap: 10px;
  }
  .settings-panel.open { display: flex; }
  .setting-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }
  .setting-label { font-size: 12px; color: #94a3b8; }
  .setting-toggle {
    position: relative; width: 36px; height: 20px; cursor: pointer;
  }
  .setting-toggle input { opacity: 0; width: 0; height: 0; }
  .setting-toggle .slider {
    position: absolute; inset: 0; background: #d1d5db; border-radius: 10px; transition: background 0.2s;
  }
  .setting-toggle .slider::before {
    content: ''; position: absolute; width: 14px; height: 14px; left: 3px; bottom: 3px;
    background: #ffffff; border-radius: 50%; transition: transform 0.2s, background 0.2s;
  }
  .setting-toggle input:checked + .slider { background: #1d4ed8; }
  .setting-toggle input:checked + .slider::before { transform: translateX(16px); background: #ffffff; }
  .setting-number {
    width: 50px; background: #ffffff; border: 1px solid #d1d5db;
    border-radius: 8px; padding: 3px 6px; color: #111827; font-size: 12px; text-align: center; outline: none;
  }
  .setting-number:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12); }
  .setting-select {
    background: #ffffff; border: 1px solid #d1d5db;
    border-radius: 8px; padding: 3px 6px; color: #111827; font-size: 12px; outline: none; cursor: pointer;
  }
  .setting-select:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12); }
  .setting-select:disabled { opacity: 0.4; cursor: not-allowed; }
  .setting-disable {
    background: #ffffff; border: 1px solid #fca5a5;
    border-radius: 8px; padding: 8px 12px; color: #b91c1c; cursor: pointer;
    font-size: 12px; width: 100%; transition: background 0.2s;
  }
  .setting-disable:hover { background: #fef2f2; }

  /* Messages */
  .chat-messages {
    flex: 1; overflow-y: auto; padding: 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .message {
    padding: 8px 12px; border-radius: 8px; max-width: 85%;
    word-wrap: break-word; line-height: 1.4;
  }
  .message-user {
    white-space: pre-wrap; align-self: flex-end;
    background: #e8f0fe; border: 1px solid #d2e3fc; color: #0f172a;
  }
  .message-agent {
    white-space: normal; align-self: flex-start;
    background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937;
  }
  .message-agent p { margin: 0 0 8px 0; }
  .message-agent p:last-child { margin-bottom: 0; }
  .message-agent code {
    background: #f1f5f9; padding: 1px 5px; border-radius: 4px;
    font-size: 13px; font-family: 'SF Mono', Menlo, Consolas, monospace;
  }
  .message-agent pre {
    background: #f8fafc; padding: 8px 10px; border-radius: 6px;
    overflow-x: auto; margin: 6px 0;
  }
  .message-agent pre code { background: none; padding: 0; }
  .message-agent ul, .message-agent ol { margin: 4px 0; padding-left: 20px; }
  .message-agent li { margin: 2px 0; }
  .message-agent strong { color: #1d4ed8; }
  .message-agent a { color: #1a73e8; }
  .message-agent h1, .message-agent h2, .message-agent h3 {
    font-size: 14px; font-weight: 600; color: #1f2937; margin: 8px 0 4px 0;
  }
  .message-stopped {
    align-self: flex-start; background: #fef2f2;
    border: 1px solid #fecaca; font-size: 12px; color: #b91c1c;
  }
  .message-tool {
    align-self: flex-start; background: #f8fafc;
    border: 1px solid #e5e7eb; font-size: 12px; color: #4b5563; font-family: monospace;
    opacity: 0.85; transition: opacity 0.2s ease;
  }
  .message-tool:hover { opacity: 1; }
  .message-thinking {
    align-self: flex-start; background: #f8fafc;
    border: 1px solid #e5e7eb; font-size: 12px; color: #0f766e; font-style: italic;
    cursor: pointer;
    opacity: 0.9; transition: opacity 0.2s ease;
  }
  .message-thinking:hover { opacity: 1; }
  .message-thinking.pinned { opacity: 1; }
  .thinking-header {
    font-weight: 600; margin-bottom: 4px; user-select: none;
  }
  .thinking-body {
    position: relative; overflow: hidden; transition: max-height 0.3s ease;
  }
  .thinking-body.collapsed {
    max-height: 3.6em;
    -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  }
  .thinking-body.expanded {
    max-height: none;
    -webkit-mask-image: none;
    mask-image: none;
  }
  .message-thinking .thinking-content { white-space: normal; }
  .message-thinking .thinking-content p { margin: 0 0 8px 0; }
  .message-thinking .thinking-content p:last-child { margin-bottom: 0; }
  .message-thinking .thinking-content code {
    background: #f1f5f9; padding: 1px 5px; border-radius: 3px;
    font-size: 13px; font-family: 'SF Mono', Menlo, Consolas, monospace;
  }
  .message-thinking .thinking-content pre {
    background: #f8fafc; padding: 8px 10px; border-radius: 6px;
    overflow-x: auto; margin: 6px 0;
  }
  .message-thinking .thinking-content pre code { background: none; padding: 0; }
  .message-thinking .thinking-content ul, .message-thinking .thinking-content ol { margin: 4px 0; padding-left: 20px; }
  .message-thinking .thinking-content li { margin: 2px 0; }
  .message-thinking .thinking-content strong { color: #0f766e; }
  .message-thinking .thinking-content a { color: #1a73e8; }

  /* Typing indicator */
  .typing-indicator {
    align-self: flex-start; padding: 10px 16px;
    background: #ffffff; border: 1px solid #e5e7eb;
    border-radius: 8px; display: flex; gap: 4px; align-items: center;
  }
  .typing-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #94a3b8;
    animation: typing-bounce 1.4s infinite ease-in-out both;
  }
  .typing-dot:nth-child(1) { animation-delay: 0s; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  /* Input */
  .chat-input-area {
    padding: 12px; border-top: 1px solid #e5e7eb;
    display: flex; gap: 8px; align-items: flex-end;
    flex-direction: column;
  }
  .chat-input-top {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  .chat-drop-hint {
    width: 100%;
    padding: 8px 10px;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
    font-size: 11px;
    line-height: 1.3;
    text-align: center;
    user-select: none;
    transition: border-color 0.2s, background 0.2s, color 0.2s;
  }
  .chat-drop-hint.active {
    border-color: #1a73e8;
    background: #e8f0fe;
    color: #1d4ed8;
  }
  .attachment-badge {
    width: 100%;
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid #dbeafe;
    background: #eff6ff;
    color: #1e3a8a;
    border-radius: 10px;
    padding: 7px 10px;
    font-size: 12px;
  }
  .attachment-badge.visible {
    display: flex;
  }
  .attachment-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .attachment-clear {
    border: none;
    background: transparent;
    color: #1e3a8a;
    font-size: 14px;
    cursor: pointer;
    line-height: 1;
  }
  .input-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .icon-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #475569;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, color 0.2s, transform 0.2s;
  }
  .icon-btn:hover {
    background: #f8fafc;
    border-color: #bfdbfe;
    color: #1d4ed8;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }
  .icon-btn.active {
    background: #e8f0fe;
    border-color: #1a73e8;
    color: #1a73e8;
  }
  .icon-btn.error {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #b91c1c;
  }
  .chat-input {
    flex: 1; background: #ffffff; border: 1px solid #d1d5db;
    border-radius: 10px; padding: 10px 12px; color: #111827; font-size: 14px;
    outline: none; font-family: inherit; resize: none;
  }
  .chat-input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12); }
  .chat-input::placeholder { color: #9ca3af; }
  .chat-send, .chat-stop {
    background: #1a73e8; border: none; border-radius: 10px;
    width: 38px; height: 38px; color: white; cursor: pointer; transition: background 0.2s, box-shadow 0.2s;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .chat-send:hover { background: #1558b0; box-shadow: 0 4px 10px rgba(26, 115, 232, 0.18); }
  .chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
  .chat-stop { background: #d93025; }
  .chat-stop:hover { background: #b3261e; box-shadow: 0 4px 10px rgba(217, 48, 37, 0.18); }
  .chat-send svg, .chat-stop svg { width: 18px; height: 18px; }
`

export interface ChatOverlayCallbacks {
  onSend: (text: string) => void
  onStop: () => void
  onSettingsChange: (settings: ChatSettings) => void
  onClearContext: () => void
  onDisableSite: () => void
  onModelSwitch: (modelId: ModelId) => void
  onVoiceToggle: () => void
  onQuickAction: (action: QuickActionId) => void
  onImageAttach: (file: File) => void
  onImageClear: () => void
}

export class ChatOverlay {
  private host: HTMLElement
  private shadow: ShadowRoot
  private container: HTMLElement
  private messagesEl: HTMLElement
  private inputEl: HTMLTextAreaElement
  private sendBtn: HTMLButtonElement
  private stopBtn: HTMLButtonElement
  private statusEl: HTMLElement
  private brandBanner: HTMLElement
  private settingsPanel: HTMLElement
  private modelSelect: HTMLSelectElement
  private languageSelect: HTMLSelectElement
  private speakRepliesToggle: HTMLInputElement
  private micBtn: HTMLButtonElement
  private attachBtn: HTMLButtonElement
  private attachInput: HTMLInputElement
  private attachmentBadge: HTMLElement
  private attachmentClearBtn: HTMLButtonElement
  private attachedImageName: string | null = null
  private typingEl: HTMLElement | null = null
  private streamEl: HTMLElement | null = null
  private streamText = ''
  private thinkingStreamEl: HTMLElement | null = null
  private thinkingStreamText = ''
  private visible = false
  settings: ChatSettings = { ...DEFAULT_SETTINGS }

  constructor(callbacks: ChatOverlayCallbacks) {
    this.host = document.createElement('div')
    this.host.id = 'gemma-gem-chat'
    this.shadow = this.host.attachShadow({ mode: 'closed' })

    const style = document.createElement('style')
    style.textContent = STYLES
    this.shadow.appendChild(style)

    this.container = document.createElement('div')
    this.container.className = 'chat-container'
    this.container.style.display = 'none'

    // Header
    const header = document.createElement('div')
    header.className = 'chat-header'
    const title = document.createElement('span')
    title.className = 'chat-header-title'
    title.innerHTML = `<img class="chat-header-mark" src="${chrome.runtime.getURL('logo_3.png')}" alt="Build with Gemma">Build with Gemma`
    this.statusEl = document.createElement('span')
    this.statusEl.className = 'chat-status'
    this.statusEl.textContent = 'Initializing...'

    const gearBtn = document.createElement('button')
    gearBtn.className = 'chat-header-btn'
    gearBtn.textContent = '\u2699' // gear
    gearBtn.title = 'Settings'
    gearBtn.addEventListener('click', () => {
      this.settingsPanel.classList.toggle('open')
    })

    const minimizeBtn = document.createElement('button')
    minimizeBtn.className = 'chat-header-btn'
    minimizeBtn.textContent = '\u2013'
    minimizeBtn.title = 'Minimize'
    minimizeBtn.addEventListener('click', () => this.toggle())

    const headerRight = document.createElement('div')
    headerRight.className = 'chat-header-right'
    headerRight.appendChild(this.statusEl)
    headerRight.appendChild(gearBtn)
    headerRight.appendChild(minimizeBtn)
    header.appendChild(title)
    header.appendChild(headerRight)

    this.brandBanner = document.createElement('div')
    this.brandBanner.className = 'brand-banner'
    this.brandBanner.innerHTML = `
      <img src="${chrome.runtime.getURL('logo_with_title.png')}" alt="Build with Gemma" loading="eager" decoding="async">
      <div class="brand-banner-fallback">Build with Gemma</div>
    `
    const brandImage = this.brandBanner.querySelector('img') as HTMLImageElement | null
    const brandFallback = this.brandBanner.querySelector('.brand-banner-fallback') as HTMLElement | null
    if (brandImage && brandFallback) {
      brandImage.addEventListener('error', () => {
        brandImage.style.display = 'none'
        brandFallback.style.display = 'flex'
      })
    }

    // Settings panel
    this.settingsPanel = document.createElement('div')
    this.settingsPanel.className = 'settings-panel'

    const modelOptions = Object.values(MODELS).map(m =>
      `<option value="${m.id}">${m.label} (${m.downloadSize})</option>`
    ).join('')

    this.settingsPanel.innerHTML = `
      <div class="setting-row">
        <span class="setting-label">Model</span>
        <select class="setting-select" data-setting="modelId">${modelOptions}</select>
      </div>
      <div class="setting-row">
        <span class="setting-label">Language</span>
        <select class="setting-select" data-setting="languageMode"></select>
      </div>
      <div class="setting-row">
        <span class="setting-label">Thinking</span>
        <label class="setting-toggle">
          <input type="checkbox" data-setting="thinking" ${this.settings.thinking ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <span class="setting-label">Speak replies</span>
        <label class="setting-toggle">
          <input type="checkbox" data-setting="speakReplies" ${this.settings.speakReplies ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <span class="setting-label">Max tool iterations</span>
        <input type="number" class="setting-number" data-setting="maxIterations" value="${this.settings.maxIterations}" min="1" max="50">
      </div>
    `
    this.modelSelect = this.settingsPanel.querySelector('[data-setting="modelId"]') as HTMLSelectElement
    this.languageSelect = this.settingsPanel.querySelector('[data-setting="languageMode"]') as HTMLSelectElement
    this.speakRepliesToggle = this.settingsPanel.querySelector('[data-setting="speakReplies"]') as HTMLInputElement
    this.languageSelect.innerHTML = LANGUAGE_OPTIONS.map(option => `<option value="${option.value}">${option.label}</option>`).join('')
    this.languageSelect.value = this.settings.languageMode
    this.speakRepliesToggle.checked = this.settings.speakReplies
    const disableBtn = document.createElement('button')
    disableBtn.className = 'setting-disable'
    disableBtn.textContent = 'Disable on this site'
    disableBtn.addEventListener('click', () => callbacks.onDisableSite())
    this.settingsPanel.appendChild(disableBtn)

    this.settingsPanel.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      const key = target.dataset.setting
      if (key === 'modelId') {
        const newModelId = target.value as ModelId
        callbacks.onModelSwitch(newModelId)
        return
      }
      if (key === 'languageMode') {
        this.settings.languageMode = target.value as LanguageMode
      } else if (key === 'speakReplies') {
        this.settings.speakReplies = target.checked
      } else if (key === 'thinking') {
        this.settings.thinking = target.checked
      } else if (key === 'maxIterations') {
        this.settings.maxIterations = parseInt(target.value, 10) || 10
      }
      callbacks.onSettingsChange(this.settings)
    })

    const quickActions = document.createElement('div')
    quickActions.className = 'quick-actions'
    quickActions.innerHTML = `
      <button class="quick-action primary" data-action="summarize-page">Summarize page</button>
      <button class="quick-action" data-action="translate-page">Translate page</button>
      <button class="quick-action" data-action="reply-in-language">Reply in selected language</button>
    `
    quickActions.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const action = target.dataset.action as QuickActionId | undefined
      if (!action) return
      callbacks.onQuickAction(action)
    })

    // Messages
    this.messagesEl = document.createElement('div')
    this.messagesEl.className = 'chat-messages'

    // Input area
    const inputArea = document.createElement('div')
    inputArea.className = 'chat-input-area'
    this.inputEl = document.createElement('textarea')
    this.inputEl.className = 'chat-input'
    this.inputEl.placeholder = 'Ask about this page...'
    this.inputEl.rows = 1
    this.micBtn = document.createElement('button')
    this.micBtn.className = 'icon-btn'
    this.micBtn.type = 'button'
    this.micBtn.title = 'Push to talk'
    this.micBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v3"/><path d="M8 21h8"/></svg>'
    this.micBtn.addEventListener('click', () => callbacks.onVoiceToggle())
    this.attachBtn = document.createElement('button')
    this.attachBtn.className = 'icon-btn'
    this.attachBtn.type = 'button'
    this.attachBtn.title = 'Attach image'
    this.attachBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.2-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48"/></svg>'
    this.attachInput = document.createElement('input')
    this.attachInput.type = 'file'
    this.attachInput.accept = 'image/*'
    this.attachInput.style.display = 'none'
    this.attachBtn.addEventListener('click', () => this.attachInput.click())
    this.attachInput.addEventListener('change', () => {
      const file = this.attachInput.files?.[0]
      if (!file) return
      this.setAttachedImage(file.name)
      callbacks.onImageAttach(file)
      this.attachInput.value = ''
    })
    this.sendBtn = document.createElement('button')
    this.sendBtn.className = 'chat-send'
    this.sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'

    this.stopBtn = document.createElement('button')
    this.stopBtn.className = 'chat-stop'
    this.stopBtn.style.display = 'none'
    this.stopBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'

    const inputActions = document.createElement('div')
    inputActions.className = 'input-actions'
    inputActions.appendChild(this.attachBtn)
    inputActions.appendChild(this.micBtn)
    inputActions.appendChild(this.sendBtn)
    inputActions.appendChild(this.stopBtn)

    const inputTop = document.createElement('div')
    inputTop.className = 'chat-input-top'
    inputTop.appendChild(this.inputEl)
    inputTop.appendChild(inputActions)

    const dropHint = document.createElement('div')
    dropHint.className = 'chat-drop-hint'
    dropHint.textContent = 'Drop or paste an image here to ask Gemma about it'

    this.attachmentBadge = document.createElement('div')
    this.attachmentBadge.className = 'attachment-badge'
    const attachmentName = document.createElement('span')
    attachmentName.className = 'attachment-name'
    attachmentName.textContent = ''
    this.attachmentClearBtn = document.createElement('button')
    this.attachmentClearBtn.className = 'attachment-clear'
    this.attachmentClearBtn.type = 'button'
    this.attachmentClearBtn.title = 'Remove image'
    this.attachmentClearBtn.textContent = 'x'
    this.attachmentClearBtn.addEventListener('click', () => {
      this.clearAttachedImage()
      callbacks.onImageClear()
    })
    this.attachmentBadge.appendChild(attachmentName)
    this.attachmentBadge.appendChild(this.attachmentClearBtn)

    const preventDefaults = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    const deactivateDropHint = () => dropHint.classList.remove('active')

    this.container.addEventListener('dragenter', (e) => {
      preventDefaults(e)
      dropHint.classList.add('active')
    })
    this.container.addEventListener('dragover', (e) => {
      preventDefaults(e)
      dropHint.classList.add('active')
    })
    this.container.addEventListener('dragleave', (e) => {
      preventDefaults(e)
      if (e.relatedTarget && this.container.contains(e.relatedTarget as Node)) return
      deactivateDropHint()
    })
    this.container.addEventListener('drop', (e) => {
      preventDefaults(e)
      deactivateDropHint()
      const file = e.dataTransfer?.files?.[0]
      if (!file || !file.type.startsWith('image/')) return
      this.setAttachedImage(file.name)
      callbacks.onImageAttach(file)
    })

    this.inputEl.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (!item.type.startsWith('image/')) continue
        const file = item.getAsFile()
        if (!file) continue
        this.setAttachedImage(file.name || 'pasted-image')
        callbacks.onImageAttach(file)
        e.preventDefault()
        break
      }
    })

    inputArea.appendChild(inputTop)
    inputArea.appendChild(this.attachmentBadge)
    inputArea.appendChild(dropHint)
    inputArea.appendChild(this.attachInput)

    this.container.appendChild(header)
    this.container.appendChild(this.brandBanner)
    this.container.appendChild(quickActions)
    this.container.appendChild(this.settingsPanel)
    this.container.appendChild(this.messagesEl)
    this.container.appendChild(inputArea)
    this.shadow.appendChild(this.container)

    this.sendBtn.addEventListener('click', () => this.handleSend(callbacks.onSend))
    this.stopBtn.addEventListener('click', () => callbacks.onStop())

    for (const event of ['keydown', 'keyup', 'keypress'] as const) {
      this.inputEl.addEventListener(event, (e) => e.stopPropagation())
    }

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.handleSend(callbacks.onSend)
      }
    })
  }

  private handleSend(onSend: (text: string) => void): void {
    const text = this.inputEl.value.trim()
    if (!text && !this.attachedImageName) return
    this.addMessage(text || `Image attached: ${this.attachedImageName ?? 'image'}`, 'user')
    this.inputEl.value = ''
    onSend(text)
  }

  setAttachedImage(name: string): void {
    this.attachedImageName = name
    const nameEl = this.attachmentBadge.querySelector('.attachment-name') as HTMLElement | null
    if (nameEl) {
      nameEl.textContent = `Image: ${name}`
    }
    this.attachmentBadge.classList.add('visible')
  }

  clearAttachedImage(): void {
    this.attachedImageName = null
    this.attachmentBadge.classList.remove('visible')
    const nameEl = this.attachmentBadge.querySelector('.attachment-name') as HTMLElement | null
    if (nameEl) {
      nameEl.textContent = ''
    }
  }

  toggle(): void {
    this.visible = !this.visible
    this.container.style.display = this.visible ? 'flex' : 'none'
    if (this.visible) this.inputEl.focus()
  }

  setVoiceState(state: 'idle' | 'listening' | 'processing' | 'error' | 'unsupported', detail?: string): void {
    this.micBtn.classList.remove('active', 'error')
    this.micBtn.title = detail ?? 'Push to talk'
    if (state === 'listening') this.micBtn.classList.add('active')
    if (state === 'error' || state === 'unsupported') this.micBtn.classList.add('error')
    this.micBtn.innerHTML = state === 'listening'
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v3"/><path d="M8 21h8"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v3"/><path d="M8 21h8"/></svg>'
  }

  setInputValue(value: string): void {
    this.inputEl.value = value
    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }))
  }

  appendInputValue(value: string): void {
    this.setInputValue(`${this.inputEl.value}${value}`)
  }

  getInputValue(): string {
    return this.inputEl.value
  }

  hide(): void {
    this.visible = false
    this.container.style.display = 'none'
  }

  appendStream(text: string): void {
    this.hideTyping()
    this.streamText += text

    if (!this.streamText.trim()) return

    if (!this.streamEl) {
      this.streamEl = document.createElement('div')
      this.streamEl.className = 'message message-agent'
      if (this.typingEl) {
        this.messagesEl.insertBefore(this.streamEl, this.typingEl)
      } else {
        this.messagesEl.appendChild(this.streamEl)
      }
    }

    const lastNewline = this.streamText.lastIndexOf('\n')
    if (lastNewline === -1) {
      this.streamEl.textContent = this.streamText
    } else {
      const rendered = this.streamText.slice(0, lastNewline + 1)
      const pending = this.streamText.slice(lastNewline + 1)
      this.streamEl.innerHTML = marked.parse(rendered) as string
      if (pending) {
        this.streamEl.appendChild(document.createTextNode(pending))
      }
    }

    this.messagesEl.scrollTop = this.messagesEl.scrollHeight
  }

  finalizeStream(fullText: string): void {
    this.hideTyping()
    if (!this.streamEl) {
      if (fullText) this.addMessage(fullText, 'agent')
      return
    }
    if (!fullText) {
      this.streamEl.remove()
    } else {
      this.streamEl.innerHTML = marked.parse(fullText) as string
    }
    this.streamEl = null
    this.streamText = ''
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight
  }

  appendThinkingStream(text: string): void {
    this.hideTyping()

    if (!this.thinkingStreamEl) {
      const msg = document.createElement('div')
      msg.className = 'message message-thinking'
      const header = document.createElement('div')
      header.className = 'thinking-header'
      header.textContent = 'Thinking...'
      const body = document.createElement('div')
      body.className = 'thinking-body collapsed'
      const content = document.createElement('div')
      content.className = 'thinking-content'
      body.appendChild(content)
      msg.appendChild(header)
      msg.appendChild(body)
      msg.addEventListener('click', () => {
        msg.classList.toggle('pinned')
        body.classList.toggle('collapsed')
        body.classList.toggle('expanded')
      })
      this.messagesEl.appendChild(msg)
      this.thinkingStreamEl = content
    }

    this.thinkingStreamText += text
    this.thinkingStreamEl.textContent = this.thinkingStreamText
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight
  }

  finalizeThinkingStream(): void {
    if (this.thinkingStreamEl) {
      this.thinkingStreamEl.innerHTML = marked.parse(this.thinkingStreamText) as string
      this.thinkingStreamEl = null
      this.thinkingStreamText = ''
    }
  }

  addMessage(text: string, type: 'user' | 'agent' | 'tool' | 'thinking' | 'stopped'): void {
    if (type === 'user' || type === 'agent') {
      this.hideTyping()
    }
    const msg = document.createElement('div')
    msg.className = `message message-${type}`

    if (type === 'agent') {
      msg.innerHTML = marked.parse(text) as string
    } else if (type === 'thinking') {
      const header = document.createElement('div')
      header.className = 'thinking-header'
      header.textContent = 'Thinking...'
      const body = document.createElement('div')
      body.className = 'thinking-body collapsed'
      const content = document.createElement('div')
      content.className = 'thinking-content'
      content.innerHTML = marked.parse(text.replace(/^\[Thinking\]\s*/, '')) as string
      body.appendChild(content)
      msg.appendChild(header)
      msg.appendChild(body)
      msg.addEventListener('click', () => {
        msg.classList.toggle('pinned')
        body.classList.toggle('collapsed')
        body.classList.toggle('expanded')
      })
    } else {
      msg.textContent = text
    }

    // Insert before typing indicator so it stays at the bottom
    if (this.typingEl) {
      this.messagesEl.insertBefore(msg, this.typingEl)
    } else {
      this.messagesEl.appendChild(msg)
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight
  }

  showTyping(): void {
    if (this.typingEl) return
    this.typingEl = document.createElement('div')
    this.typingEl.className = 'typing-indicator'
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div')
      dot.className = 'typing-dot'
      this.typingEl.appendChild(dot)
    }
    this.messagesEl.appendChild(this.typingEl)
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight
  }

  hideTyping(): void {
    if (this.typingEl) {
      this.typingEl.remove()
      this.typingEl = null
    }
  }

  clearMessages(): void {
    this.messagesEl.innerHTML = ''
    this.streamEl = null
    this.streamText = ''
    this.thinkingStreamEl = null
    this.thinkingStreamText = ''
  }

  setModelSwitchEnabled(enabled: boolean): void {
    this.modelSelect.disabled = !enabled
  }

  setSelectedModel(modelId: ModelId): void {
    this.modelSelect.value = modelId
  }

  updateStatus(status: string): void {
    this.statusEl.textContent = status
  }

  private generating = false

  setInputEnabled(enabled: boolean): void {
    this.inputEl.disabled = !enabled
    this.sendBtn.disabled = !enabled
    if (enabled) {
      this.generating = false
      this.sendBtn.style.display = 'flex'
      this.stopBtn.style.display = 'none'
    } else if (this.generating) {
      this.sendBtn.style.display = 'none'
      this.stopBtn.style.display = 'flex'
    }
  }

  setGenerating(generating: boolean): void {
    this.generating = generating
    if (generating) {
      this.sendBtn.style.display = 'none'
      this.stopBtn.style.display = 'flex'
    }
  }

  getElement(): HTMLElement {
    return this.host
  }
}
