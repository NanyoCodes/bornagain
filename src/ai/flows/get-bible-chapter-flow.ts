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
  version: z.string().optional().describe('The Bible version/translation slug (e.g., kjv, web).'),
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
const PUBLIC_BIBLE_API_URL = 'https://bible-api.com/';


/**
 * Fetches a Bible chapter from the public bible-api.com.
 */
async function fetchFromPublicApi(book: string, chapter: number, version?: string): Promise<BibleChapterOutput> {
  let url = `${PUBLIC_BIBLE_API_URL}${encodeURIComponent(book)}+${chapter}`;
  if (version) {
    url += `?translation=${version}`;
  }

  try {
    const response = await fetch(url, { 
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Public Bible API Error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Public Bible API returned status ${response.status}. It may be temporarily unavailable.`);
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
  } catch (error: any) {
    console.error('Error fetching from public Bible API:', error);
    if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        throw new Error('The Bible API could not be reached. Please check your internet connection and try again.');
    }
    throw error;
  }
}


/**
 * Fetches a chapter of the Bible.
 */
export async function getBibleChapter(input: BibleChapterInput): Promise<BibleChapterOutput> {
  const { book, chapter, version } = input;
  const requestedVersion = version || 'kjv';

  return fetchFromPublicApi(book, chapter, requestedVersion);
}
