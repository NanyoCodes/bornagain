'use server';
/**
 * @fileOverview This file provides an AI-powered flow to summarize longer testimonies.
 *
 * - summarizeTestimony - A function that generates a concise summary of a given testimony text.
 * - SummarizeTestimonyInput - The input type for the summarizeTestimony function.
 * - SummarizeTestimonyOutput - The return type for the summarizeTestimony function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTestimonyInputSchema = z
  .string()
  .describe('The full text of the testimony to summarize.');
export type SummarizeTestimonyInput = z.infer<typeof SummarizeTestimonyInputSchema>;

const SummarizeTestimonyOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the testimony.'),
});
export type SummarizeTestimonyOutput = z.infer<typeof SummarizeTestimonyOutputSchema>;

export async function summarizeTestimony(input: SummarizeTestimonyInput): Promise<string> {
  const result = await summarizeTestimonyFlow(input);
  return result.summary;
}

const summarizeTestimonyPrompt = ai.definePrompt({
  name: 'summarizeTestimonyPrompt',
  input: {schema: SummarizeTestimonyInputSchema},
  output: {schema: SummarizeTestimonyOutputSchema},
  prompt: `Please provide a concise summary of the following testimony. Focus on the main points and key events, keeping it brief and easy to understand.

Testimony: {{{this}}}`,
});

const summarizeTestimonyFlow = ai.defineFlow(
  {
    name: 'summarizeTestimonyFlow',
    inputSchema: SummarizeTestimonyInputSchema,
    outputSchema: SummarizeTestimonyOutputSchema,
  },
  async input => {
    const {output} = await summarizeTestimonyPrompt(input);
    if (!output) {
      throw new Error('Failed to generate summary.');
    }
    return output;
  }
);
