'use server';
/**
 * @fileOverview A Genkit flow for fetching Bible chapter content from an external API.
 * - getBibleChapter - Fetches a chapter of the Bible.
 * - BibleChapterInput - The input type.
 * - BibleChapterOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BibleChapterInputSchema = z.object({
  book: z.string().describe('The name of the book (e.g., John).'),
  chapter: z.number().describe('The chapter number.'),
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
});
export type BibleChapterOutput = z.infer<typeof BibleChapterOutputSchema>;

// This flow is designed to work with a generic Bible API.
// The default is set to `https://bible-api.com/`, which requires no key.
// To use a different API that requires a key, update the `BIBLE_API_URL`
// and set the `BIBLE_API_KEY` in your .env file.
const BIBLE_API_URL = process.env.BIBLE_API_URL || 'https://bible-api.com/';
const BIBLE_API_KEY = process.env.BIBLE_API_KEY;

// Note: We are not defining a Genkit flow with ai.defineFlow here.
// This is a simple server-side function because it doesn't involve an LLM.
// It's kept in the /ai/flows directory for organizational consistency.
export async function getBibleChapter(
  input: BibleChapterInput
): Promise<BibleChapterOutput> {
  const { book, chapter } = input;
  const url = `${BIBLE_API_URL}${encodeURIComponent(book)}+${chapter}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add the API key to the header if it exists.
  // Some APIs use a different header name (e.g., 'x-api-key').
  // Adjust 'api-key' as needed based on your API provider's documentation.
  if (BIBLE_API_KEY) {
    headers['api-key'] = BIBLE_API_KEY;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Bible API Error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch chapter. Status: ${response.status}`);
    }

    const data = await response.json();

    // The data structure from bible-api.com is { verses: [{ book_name, chapter, verse, text }] }
    // We adapt it to our expected BibleChapterOutputSchema.
    const formattedVerses = data.verses.map((v: any) => ({
        verse: v.verse,
        text: v.text.trim(),
    }));

    return {
      book: data.verses[0]?.book_name || book,
      chapter: parseInt(data.verses[0]?.chapter || chapter, 10),
      verses: formattedVerses,
    };
  } catch (error) {
    console.error('Error fetching Bible chapter:', error);
    // Return a structured error or re-throw
    throw new Error('Could not retrieve Bible chapter from the API.');
  }
}
