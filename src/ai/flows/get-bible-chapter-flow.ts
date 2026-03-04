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

// API 2: Premium/Modern Bibles (api.scripture.api.bible)
const PREMIUM_BIBLE_API_URL = process.env.PREMIUM_BIBLE_API_URL;
const PREMIUM_BIBLE_API_KEY = process.env.PREMIUM_BIBLE_API_KEY;

// The Bible ID for NLT on api.scripture.api.bible is for the second edition (NLT-SE)
const PREMIUM_VERSIONS = [
  { id: 'nlt', bibleId: 'de4e12af7f28f599-01', name: 'New Living Translation' }
];


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
 * Fetches a chapter from a premium Bible API (api.scripture.api.bible).
 */
async function fetchFromPremiumApi(book: string, chapter: number, version: string): Promise<BibleChapterOutput> {
  if (!PREMIUM_BIBLE_API_URL || !PREMIUM_BIBLE_API_KEY) {
    throw new Error(
      `The "${version.toUpperCase()}" translation requires a premium API key. ` +
      `Please get a key from a Bible API provider and add PREMIUM_BIBLE_API_URL and PREMIUM_BIBLE_API_KEY to your environment variables.`
    );
  }
  
  const bibleVersionInfo = PREMIUM_VERSIONS.find(v => v.id === version.toLowerCase());
  if (!bibleVersionInfo) {
      throw new Error(`The version "${version}" is not configured as a premium version.`);
  }

  const bookNameToAbbr: { [key: string]: string } = {
    "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM", "Deuteronomy": "DEU",
    "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI",
    "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR", "Nehemiah": "NEH", "Esther": "EST",
    "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO", "Ecclesiastes": "ECC", "Song of Solomon": "SNG",
    "Isaiah": "ISA", "Jeremiah": "JER", "Lamentations": "LAM", "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS",
    "Joel": "JOL", "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON", "Micah": "MIC", "Nahum": "NAM", "Habakkuk": "HAB",
    "Zephaniah": "ZEP", "Haggai": "HAG", "Zechariah": "ZEC", "Malachi": "MAL",
    "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN", "Acts": "ACT", "Romans": "ROM",
    "1 Corinthians": "1CO", "2 Corinthians": "2CO", "Galatians": "GAL", "Ephesians": "EPH", "Philippians": "PHP",
    "Colossians": "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI", "2 Timothy": "2TI",
    "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB", "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE",
    "1 John": "1JN", "2 John": "2JN", "3 John": "3JN", "Jude": "JUD", "Revelation": "REV"
  };
  
  const bookAbbreviation = bookNameToAbbr[book];
  if (!bookAbbreviation) {
    throw new Error(`Could not find a Bible abbreviation for the book: ${book}`);
  }

  const chapterId = `${bookAbbreviation}.${chapter}`;
  const url = `${PREMIUM_BIBLE_API_URL}/bibles/${bibleVersionInfo.bibleId}/chapters/${chapterId}?content-type=text&include-verse-numbers=true`;

  try {
    const response = await fetch(url, { headers: { 'api-key': PREMIUM_BIBLE_API_KEY } });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Premium Bible API Error:", errorText);
        let errorMessage = `Failed to fetch chapter. Status: ${response.status}.`;
        if (response.status === 401 || response.status === 403) {
            errorMessage += ' The API key may be invalid or lacks permission for this Bible version.';
        }
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const contentText = data.data.content;
    
    const verses: { verse: number, text: string }[] = [];
    const verseRegex = /\[(\d+)\]\s*([\s\S]*?)(?=\s*\[\d+\]|$)/g;
    let match;
    while ((match = verseRegex.exec(contentText)) !== null) {
        verses.push({
            verse: parseInt(match[1], 10),
            text: match[2].trim().replace(/\n/g, ' '),
        });
    }

    return {
        book: book,
        chapter: parseInt(data.data.number, 10),
        verses: verses,
        translation: bibleVersionInfo.name,
    };
  } catch (error: any) {
    console.error('Error fetching from premium Bible API:', error);
    throw new Error(error.message || `Could not retrieve Bible chapter from the premium API. Please check your API key and network connection.`);
  }
}


/**
 * Fetches a chapter of the Bible, routing to the correct API based on version.
 */
export async function getBibleChapter(input: BibleChapterInput): Promise<BibleChapterOutput> {
  const { book, chapter, version } = input;
  const requestedVersion = version || 'kjv';

  if (PREMIUM_VERSIONS.some(v => v.id === requestedVersion.toLowerCase())) {
    return fetchFromPremiumApi(book, chapter, requestedVersion);
  }
  
  return fetchFromPublicApi(book, chapter, requestedVersion);
}
