'use server';
/**
 * @fileOverview A Genkit flow for generating creative ministry innovations for soul winning.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InnovationInputSchema = z.object({
  soulFirstName: z.string().describe("The convert's first name."),
  soulStatus: z.string().describe("Current spiritual status (New, Contacted, Established)."),
  soulRelationship: z.string().describe("How the user knows this person (Family, Friend, Outreach, etc.)."),
  userFirstName: z.string().describe("The user's name for personalization."),
});
export type InnovationInput = z.infer<typeof InnovationInputSchema>;

const InnovationOutputSchema = z.object({
  title: z.string().describe('A catchy, inspiring name for the ministry innovation.'),
  description: z.string().describe('A detailed explanation of the creative strategy.'),
  scripture: z.string().describe('A relevant scriptural foundation for this approach.'),
  actionSteps: z.array(z.string()).describe('3-5 practical steps to implement the idea.'),
});
export type InnovationOutput = z.infer<typeof InnovationOutputSchema>;

export async function generateMinistryInnovation(input: InnovationInput): Promise<InnovationOutput> {
  return generateMinistryInnovationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMinistryInnovationPrompt',
  input: {schema: InnovationInputSchema},
  output: {schema: InnovationOutputSchema},
  prompt: `You are a Kingdom Innovation Strategist for "Testify". Your goal is to help {{{userFirstName}}} come up with a highly creative, out-of-the-box ministry "innovation" to reach and nurture {{{soulFirstName}}}.

Context:
- Convert: {{{soulFirstName}}}
- Status: {{{soulStatus}}}
- Relationship: {{{soulRelationship}}}

Task:
Generate a unique "Kingdom Innovation"—a specific, creative method to deepen the spiritual connection or share a new dimension of faith. Think beyond standard church invites. Consider:
- Creative "Acts of Kindness" tailored to their current life season.
- Themed "Discovery Sessions" (e.g., using art, business, or sports to bridge to the Word).
- Digital ministry techniques or unique communal experiences.

Format the output to be highly professional, encouraging, and anchored in the Word.`,
});

const generateMinistryInnovationFlow = ai.defineFlow(
  {
    name: 'generateMinistryInnovationFlow',
    inputSchema: InnovationInputSchema,
    outputSchema: InnovationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate Kingdom innovation.');
    }
    return output;
  }
);
