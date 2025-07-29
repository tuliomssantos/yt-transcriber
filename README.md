# yt-transcriber

> A simple CLI tool to turn YouTube video transcripts into concise, well‑structured Markdown summaries—free of charge!

## 🚀 Features

- Fetch transcripts directly from YouTube using LangChain’s `YoutubeLoader`
- Split large transcripts into manageable chunks
- Summarize transcript chunks with OpenAI’s chat models into Markdown with H1/H2 headers and bullet lists
- Save each summary to `summaries/<videoId>-<timestamp>.md`
- No paid subscription required—leverages your own OpenAI key

## 🛠️ Prerequisites

- Node.js ≥ 16.x
- npm (or yarn)
- An OpenAI API key

## 📦 Installation

```bash
git clone https://github.com/your‑username/yt‑transcriber.git
cd yt‑transcriber
npm install
```

````

## ⚙️ Configuration

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=sk-...
```

## 🎯 Usage

Run the CLI and follow the prompt:

```bash
npm run start
```

1. When asked, paste the **YouTube video ID** (e.g. `dQw4w9WgXcQ`).
2. Wait for the pipeline to **LOAD**, **SPLIT**, **SUMMARIZE**, and **SAVE**.
3. Find your summary in the `summaries/` folder as `videoId-YYYY-MM-DDTHH-MM-SSZ.md`.

## 📁 Project Structure

```
.
├── summaries/                 # Generated Markdown summaries
├── src/
│   └── index.ts               # Main CLI entrypoint
├── .env                       # Environment variables
├── package.json               # Scripts & dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 📜 Scripts

- `npm run start` — Launch the transcription & summarization CLI
- `npm test` — Run tests with Vitest
- `npm run test:watch` — Run tests in watch mode
- `npm run test:coverage` — Generate a coverage report

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/foo`)
3. Commit your changes (`git commit -m 'feat: add foo'`)
4. Push to the branch (`git push origin feature/foo`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
````
