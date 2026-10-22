'use server';
/**
 * @fileOverview A Genkit flow for searching worship songs on YouTube Music.
 *
 * - searchWorshipSongs - A function that returns suggested worship songs based on a query.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchSongsInputSchema = z.object({
  query: z.string().describe('The song title, artist, or theme to search for.'),
});
export type SearchSongsInput = z.infer<typeof SearchSongsInputSchema>;

const SongResultSchema = z.object({
  title: z.string().describe('The title of the worship song.'),
  artist: z.string().describe('The artist or worship group.'),
  url: z.string().describe('A valid YouTube watch URL for the song.'),
});

const SearchSongsOutputSchema = z.object({
  songs: z.array(SongResultSchema).describe('A list of matching worship songs.'),
});
export type SearchSongsOutput = z.infer<typeof SearchSongsOutputSchema>;

export async function searchWorshipSongs(input: SearchSongsInput): Promise<SearchSongsOutput> {
  return searchWorshipSongsFlow(input);
}

const searchWorshipSongsPrompt = ai.definePrompt({
  name: 'searchWorshipSongsPrompt',
  input: { schema: SearchSongsInputSchema },
  output: { schema: SearchSongsOutputSchema },
  prompt: `You are a worship music expert. Find the most relevant and powerful Christian worship songs for the query: "{{{query}}}".

Return a list of exactly 5 songs. Each must have:
1. title: The accurate song name.
2. artist: The primary worship leader or group (e.g., Maverick City Music, Hillsong, Sinach).
3. url: A valid YouTube URL for a high-quality version of the song.

Ensure the links are functional and the selections are edifying for a testimony context.`,
});

const searchWorshipSongsFlow = ai.defineFlow(
  {
    name: 'searchWorshipSongsFlow',
    inputSchema: SearchSongsInputSchema,
    outputSchema: SearchSongsOutputSchema,
  },
  async (input) => {
    const { output } = await searchWorshipSongsPrompt(input);
    if (!output) throw new Error('Failed to find worship songs.');
    return output;
  }
);