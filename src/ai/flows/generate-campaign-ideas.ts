'use server';
/**
 * @fileOverview A Genkit flow for generating creative campaign names and descriptions.
 *
 * - generateCampaignIdeas - A function that handles the campaign idea generation process.
 * - CampaignIdeaInput - The input type for the generateCampaignIdeas function.
 * - CampaignIdeaOutput - The return type for the generateCampaignIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CampaignIdeaInputSchema = z.object({
  goal: z.string().describe('The primary goal of the campaign (e.g., evangelism, community outreach).'),
  location: z.string().describe('The geographical location or target area for the campaign.'),
  targetAudience: z.string().describe('The demographic or group the campaign aims to reach.'),
});
export type CampaignIdeaInput = z.infer<typeof CampaignIdeaInputSchema>;

const CampaignIdeaOutputSchema = z.object({
  campaignNames: z.array(z.string()).describe('A list of creative and compelling campaign names.'),
  description: z
    .string()
    .describe(
      'A compelling and engaging description for the campaign, encouraging participation.'
    ),
});
export type CampaignIdeaOutput = z.infer<typeof CampaignIdeaOutputSchema>;

export async function generateCampaignIdeas(
  input: CampaignIdeaInput
): Promise<CampaignIdeaOutput> {
  return generateCampaignIdeasFlow(input);
}

const generateCampaignIdeasPrompt = ai.definePrompt({
  name: 'generateCampaignIdeasPrompt',
  input: {schema: CampaignIdeaInputSchema},
  output: {schema: CampaignIdeaOutputSchema},
  prompt: `You are an AI assistant specialized in creating engaging and inspirational campaign ideas for faith-based initiatives.

Based on the following keywords, generate 3-5 creative and compelling campaign names, and a detailed, engaging description (2-3 paragraphs) that clearly communicates the campaign's purpose and encourages participation.

Goal: {{{goal}}}
Location: {{{location}}}
Target Audience: {{{targetAudience}}}

Ensure the names are catchy and relevant to the goal, and the description is inspiring and clear.`,
});

const generateCampaignIdeasFlow = ai.defineFlow(
  {
    name: 'generateCampaignIdeasFlow',
    inputSchema: CampaignIdeaInputSchema,
    outputSchema: CampaignIdeaOutputSchema,
  },
  async input => {
    const {output} = await generateCampaignIdeasPrompt(input);
    if (!output) {
      throw new Error('Failed to generate campaign ideas.');
    }
    return output;
  }
);
