import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import type { Document } from '@langchain/core/documents';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { YoutubeLoader } from '@langchain/community/document_loaders/web/youtube';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';

function createCLI(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(cli: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => cli.question(query, resolve));
}

function closeCLI(cli: readline.Interface): void {
  cli.close();
}

async function promptVideoId(cli: readline.Interface): Promise<string> {
  const id = await askQuestion(cli, '▶️  Enter YouTube video ID: ');
  closeCLI(cli);
  return id.trim();
}

async function loadTranscript(videoId: string): Promise<Document<Record<string, any>>[]> {
  const url = `https://youtu.be/${videoId}`;

  const loader = YoutubeLoader.createFromUrl(url, {
    language: 'en',
    addVideoInfo: true,
  });

  return loader.load();
}

async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  return splitter.splitDocuments(docs);
}

function makeLLM() {
  return new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
}

async function summarizeChunksToMarkdown(chunks: Document[]): Promise<string> {
  const prompt = ChatPromptTemplate.fromTemplate(`
    🎥 Video Summary
    You are a helpful assistant. Given the following transcript excerpts, produce a concise, well‑structured Markdown document:
    - Use H1/H2 headers for main ideas and sections.
    - Use bullet lists for key concepts and supporting details.
    - Discard filler words, disfluencies, and unnecessary jargon.
    Transcript:
    {context}
    `);

  const chain = await createStuffDocumentsChain({
    llm: makeLLM(),
    prompt,
  });

  const result = await chain.invoke({ context: chunks });

  return result;
}

async function ensureFolder(folder: string): Promise<void> {
  await fs.mkdir(folder, { recursive: true });
}

function makeFileName(videoId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${videoId}-${timestamp}.md`;
}

async function saveMarkdown(folder: string, videoId: string, content: string): Promise<void> {
  await ensureFolder(folder);
  const fileName = makeFileName(videoId);
  const filePath = path.join(folder, fileName);
  await fs.writeFile(filePath, content);
  console.log(`✅ Summary saved to ${filePath}`);
}

async function main(): Promise<void> {
  const cli = createCLI();
  const videoId = await promptVideoId(cli);

  console.log('LOAD', `Fetching transcript for ${videoId}…`);
  const rawDocs = await loadTranscript(videoId);

  console.log('SPLIT', `Splitting ${rawDocs.length} raw segments…`);
  const chunks = await splitDocuments(rawDocs);

  const summaryMd = await summarizeChunksToMarkdown(chunks);

  await saveMarkdown('summaries', videoId, summaryMd);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
