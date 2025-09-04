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

async function promptFlashcardsOptIn(): Promise<boolean> {
  const cli = createCLI();
  const ans = await askQuestion(cli, '🃏  Generate flashcards from summary? (y/N): ');
  closeCLI(cli);
  return /^y(es)?$/i.test(ans.trim());
}

async function promptTranscriptLanguage(): Promise<'en' | 'pt-BR'> {
  const cli = createCLI();
  const ans = await askQuestion(cli, '🌐  Transcript language (en / pt-BR) [en]: ');
  closeCLI(cli);
  const normalized = ans.trim().toLowerCase();
  if (normalized === 'pt-br' || normalized === 'ptbr' || normalized === 'pt') {
    return 'pt-BR';
  }
  if (normalized === 'en' || normalized === '') {
    return 'en';
  }
  console.log(`⚠️  Unsupported language "${ans.trim()}", defaulting to "en".`);
  return 'en';
}

async function loadTranscript(
  videoId: string,
  language: 'en' | 'pt-BR',
): Promise<Document<Record<string, any>>[]> {
  const url = `https://youtu.be/${videoId}`;

  const loader = YoutubeLoader.createFromUrl(url, {
    language,
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
    You are a helpful assistant. Given the following transcript excerpts, produce a concise, well-structured Markdown document:
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

async function generateFlashcards(summaryMd: string): Promise<string> {
  const prompt = ChatPromptTemplate.fromTemplate(`
## Flashcards

You are a helpful assistant. From the Markdown summary below, extract the key concepts and turn each into a flashcard using this exact format:

<Question text>
?
<Answer text>
---

Example flashcard (note that there is no blank line before the '---'):
What is the binary gap problem?
?
The binary gap problem asks for the longest sequence of consecutive zeros surrounded by ones in the binary representation of a positive integer.
---

Summary:
{summary}
  `);

  const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });

  const chain = prompt.pipe(llm);

  const flashcardsMd = await chain.invoke({ summary: summaryMd });

  return typeof flashcardsMd === 'string' ? flashcardsMd : (flashcardsMd as any).text;
}

async function ensureFolder(folder: string): Promise<void> {
  await fs.mkdir(folder, { recursive: true });
}

function makeFileName(videoId: string, title?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (title) {
    const sanitizedTitle = title.replace(/[\/\\:*?"<>|]/g, '-');
    return `${sanitizedTitle}-${timestamp}.md`;
  }
  return `${videoId}-${timestamp}.md`;
}

async function saveMarkdown(folder: string, videoId: string, content: string, title?: string): Promise<void> {
  await ensureFolder(folder);
  const fileName = makeFileName(videoId, title);
  const filePath = path.join(folder, fileName);
  await fs.writeFile(filePath, content);
  console.log(`✅ Summary saved to ${filePath}`);
}

async function main(): Promise<void> {
  const cli = createCLI();
  const videoId = await promptVideoId(cli);

  const wantFlashcards = await promptFlashcardsOptIn();
  const transcriptLang = await promptTranscriptLanguage();

  console.log('LOAD', `Fetching transcript for ${videoId} (language: ${transcriptLang})…`);
  const rawDocs = await loadTranscript(videoId, transcriptLang);
  const title = rawDocs[0]?.metadata?.title;

  if (title) {
    console.log('TITLE', `Using video title for filename: "${title}"`);
  } else {
    console.log('TITLE', 'No title found, using video ID for filename.');
  }

  console.log('SPLIT', `Splitting ${rawDocs.length} raw segments…`);
  const chunks = await splitDocuments(rawDocs);

  const summaryMd = await summarizeChunksToMarkdown(chunks);

  let combined: string;
  if (wantFlashcards) {
    console.log('FLASHCARDS', `Creating flashcards from summary…`);
    const flashcardsMd = await generateFlashcards(summaryMd);
    combined = `${summaryMd}\n\n## Flashcards\n\n${flashcardsMd}\n`;
  } else {
    console.log('SKIP', 'Flashcards generation skipped.');
    combined = summaryMd;
  }

  await saveMarkdown('summaries', videoId, combined, title);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});