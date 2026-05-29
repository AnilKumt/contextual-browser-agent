![Gemma Banner](public/logo_with_title.png)

Gemmo is a browser extension that runs the Gemma 2 assistant locally via Ollama, providing an in-page conversational AI with voice input, image explanation, and quick action helpers. Gemma is used as the local assistant backend (via the offscreen agent) to handle user prompts, interpret attached image context, and generate streamed replies.

```mermaidupdated readme
flowchart LR
	subgraph Browser
		CS["Content Script\n(content/chat-overlay.ts)"]
		BG["Background Service Worker\n(background/message-router.ts)"]
		OFF["Offscreen Document\n(entrypoints/offscreen/main.ts)"]
	end
	OLLAMA["Ollama Local Server\nhttp://127.0.0.1:11434"]
	TOOLS["Tool Executors\n(shared/tool-definitions.ts)"]
	PUBLIC["Public assets\n(public/logo_with_title.png)"]

	CS -- "user UI: messages, voice, image attach" --> BG
	BG -- "ensure offscreen + forward agent:run (pageLanguage, imageContext)" --> OFF
	OFF -- "text generation (streaming)" --> OLLAMA
	OFF -- "invoke tools / tool calls" --> TOOLS
	TOOLS -- "tool results / events" --> BG
	BG -- "responses / events" --> CS
	CS -- "loads banner" --> PUBLIC

	style OLLAMA fill:#f9f,stroke:#333,stroke-width:1px
	style PUBLIC fill:#eef,stroke:#333,stroke-width:1px
```

