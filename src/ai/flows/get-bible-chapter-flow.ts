'use server';
/**
 * @fileOverview A Genkit flow for fetching Bible chapter content from external APIs.
 * - getBibleChapter - Fetches a chapter of the Bible by routing to the appropriate API.
 * - BibleChapterInput - The input type.
 * - BibleChapterOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BibleChapterInputSchema = z.object({
  book: z.string().describe('The name of the book (e.g., John).'),
  chapter: z.number().describe('The chapter number.'),
  version: z.string().optional().describe('The Bible version/translation slug (e.g., kjv, web, nlt).'),
});
export type BibleChapterInput = z.infer<typeof BibleChapterInputSchema>;

const VerseSchema = z.object({
  verse: z.number(),
  text: z.string(),
});

const BibleChapterOutputSchema = z.object({
  book: z.string(),
  chapter: z.number(),
  verses: z.array(VerseSchema),
  translation: z.string().optional(),
});
export type BibleChapterOutput = z.infer<typeof BibleChapterOutputSchema>;

// --- API Configuration ---

// API 1: Public Domain Bibles (bible-api.com)
const PUBLIC_BIBLE_API_URL = 'https://bible-api.com/';

// API 2: Premium/Modern Bibles (Placeholder)
// To use a premium API for versions like NLT, you would get an API key from a provider
// and fill in the details below from your .env file.
const PREMIUM_BIBLE_API_URL = process.env.PREMIUM_BIBLE_API_URL;
const PREMIUM_BIBLE_API_KEY = process.env.PREMIUM_BIBLE_API_KEY;
const PREMIUM_VERSIONS = ['nlt'];

/**
 * Fetches a Bible chapter from the public bible-api.com.
 */
async function fetchFromPublicApi(book: string, chapter: number, version?: string): Promise<BibleChapterOutput> {
  let url = `${PUBLIC_BIBLE_API_URL}${encodeURIComponent(book)}+${chapter}`;
  if (version) {
    url += `?translation=${version}`;
  }

  try {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Public Bible API Error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch chapter from public API. Status: ${response.status}`);
    }

    const data = await response.json();
    const formattedVerses = data.verses.map((v: any) => ({
      verse: v.verse,
      text: v.text.trim(),
    }));

    return {
      book: data.verses[0]?.book_name || book,
      chapter: parseInt(data.verses[0]?.chapter || chapter, 10),
      verses: formattedVerses,
      translation: data.translation_name,
    };
  } catch (error) {
    console.error('Error fetching from public Bible API:', error);
    throw new Error('Could not retrieve Bible chapter from the public API.');
  }
}

/**
 * Placeholder function for fetching from a premium Bible API.
 * This needs to be implemented with a real API provider to work.
 */
async function fetchFromPremiumApi(book: string, chapter: number, version: string): Promise<BibleChapterOutput> {
  // This is a placeholder. You would need to replace this with the actual logic
  // for your chosen premium API provider.
  
  if (!PREMIUM_BIBLE_API_URL || !PREMIUM_BIBLE_API_KEY) {
    throw new Error(
      `The "${version.toUpperCase()}" translation requires a premium API key. ` +
      `Please get a key from a Bible API provider and add PREMIUM_BIBLE_API_URL and PREMIUM_BIBLE_API_KEY to your environment variables.`
    );
  }
  
  // Example of what the logic might look like:
  // const url = `${PREMIUM_BIBLE_API_URL}/...`; // <-- Adjust URL structure
  // const headers = { 'api-key': PREMIUM_BIBLE_API_KEY };
  // const response = await fetch(url, { headers });
  // const data = await response.json();
  // ... parse the data into BibleChapterOutputSchema format ...

  // For now, we just throw an error indicating it's not set up.
  throw new Error(`Fetching for "${version.toUpperCase()}" is not implemented. Please configure a premium API provider.`);
}


/**
 * Fetches a chapter of the Bible, routing to the correct API based on version.
 */
export async function getBibleChapter(input: BibleChapterInput): Promise<BibleChapterOutput> {
  const { book, chapter, version } = input;
  const requestedVersion = version || 'kjv'; // Default to KJV if no version is provided

  if (PREMIUM_VERSIONS.includes(requestedVersion.toLowerCase())) {
    return fetchFromPremiumApi(book, chapter, requestedVersion);
  }
  
  return fetchFromPublicApi(book, chapter, requestedVersion);
}
