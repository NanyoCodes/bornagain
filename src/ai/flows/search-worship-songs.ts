'use server';
/**
 * @fileOverview A Genkit flow for searching worship songs on YouTube.
 *
 * - searchWorshipSongs - A function that returns curated worship songs based on a query or atmosphere.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchSongsInputSchema = z.object({
  query: z.string().describe('The song title, artist, or keyword to search for.'),
  atmosphere: z.string().optional().describe('The spiritual atmosphere or vibe (e.g., Victory, Healing, Gratitude).'),
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

/**
 * Genkit flow for searching worship songs with a focus on diverse gospel genres.
 */
const searchWorshipSongsFlow = ai.defineFlow(
  {
    name: 'searchWorshipSongsFlow',
    inputSchema: SearchSongsInputSchema,
    outputSchema: SearchSongsOutputSchema,
  },
  async (input) => {
    const atmosphereQuery = input.atmosphere ? ` with a "${input.atmosphere}" atmosphere` : '';
    const response = await ai.generate({
      prompt: `You are a Kingdom Worship Expert. Find the most relevant, powerful, and diverse Christian worship songs for the query: "${input.query}"${atmosphereQuery}.

Include a mix of global gospel styles:
- Contemporary Worship (e.g., Elevation, Hillsong, Bethel)
- Afro-Gospel & Highlife (e.g., Sinach, Nathaniel Bassey, Dunsin Oyekan)
- Black Gospel & Soul (e.g., Maverick City, Tasha Cobbs, Kirk Franklin)

Return a list of exactly 5 songs. Each must have:
1. title: The accurate song name.
2. artist: The primary worship leader or group.
3. url: A valid YouTube URL for a high-quality version of the song.

Ensure the link is functional and the selection is highly edifying for a testimony context.`,
      output: {
        schema: SearchSongsOutputSchema,
      },
    });

    if (!response.output) {
      throw new Error('AI failed to generate song results.');
    }

    return response.output;
  }
);

/**
 * Server action wrapper for the worship song search flow.
 */
export async function searchWorshipSongs(input: SearchSongsInput): Promise<SearchSongsOutput> {
  return searchWorshipSongsFlow(input);
}
