'use server';
/**
 * @fileOverview This file provides an AI-powered flow to rephrase testimonies.
 *
 * - summarizeTestimony - A function that generates a rephrased version of a given testimony text.
 * - SummarizeTestimonyInput - The input type for the summarizeTestimony function.
 * - SummarizeTestimonyOutput - The return type for the summarizeTestimony function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTestimonyInputSchema = z
  .string()
  .describe('The full text of the testimony to rephrase.');
export type SummarizeTestimonyInput = z.infer<typeof SummarizeTestimonyInputSchema>;

const SummarizeTestimonyOutputSchema = z.object({
  summary: z.string().describe('A rephrased version of the testimony.'),
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
  prompt: `Rephrase the following testimony to make it more engaging, fluent, and eloquent. Keep the original meaning and tone, but improve the wording and flow. Do not summarize it; instead, enhance the existing text.

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
      throw new Error('Failed to generate rephrased content.');
    }
    return output;
  }
);
