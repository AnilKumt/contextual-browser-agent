import { defineConfig } from 'wxt'

const ALLOWED_MODES = new Set(['development', 'production'])
const modeIndex = process.argv.indexOf('--mode')
const mode = modeIndex !== -1 ? process.argv[modeIndex + 1] : 'production'
if (!ALLOWED_MODES.has(mode)) {
  throw new Error(`Invalid mode "${mode}". Allowed: ${[...ALLOWED_MODES].join(', ')}`)
}

export default defineConfig({
  manifest: {
    name: mode === 'development' ? 'Gemma Gem [dev]' : 'Gemma Gem',
    description: 'Browser AI agent powered by Gemma 2 through local Ollama',
    permissions: ['activeTab', 'scripting', 'offscreen', 'storage'],
    host_permissions: ['<all_urls>'],
    web_accessible_resources: [
      {
        resources: ['logo_only.png', 'logo_2_only.png', 'logo_3.png', 'logo_with_title.png'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  },
  vite: () => ({
    build: {
      target: 'esnext',
      sourcemap: true,
      minify: false,
    },
  }),
})
