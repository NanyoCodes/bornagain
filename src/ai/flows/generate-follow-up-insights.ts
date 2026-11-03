'use server';
/**
 * @fileOverview A Genkit flow for generating follow-up insights for the BornAgain platform.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FollowUpInsightsInputSchema = z.object({
  firstName: z.string().describe("The soul's first name."),
  status: z.string().describe("The soul's current follow-up status."),
  followUpHistory: z.string().describe('A summary of the recent interactions.'),
  attendingChurch: z.boolean().describe('Whether the soul is currently attending church.'),
  inBibleStudy: z.boolean().describe('Whether the soul is currently in a Bible study.'),
  hasAppAccount: z.boolean().describe('Whether the soul has an email.'),
});
export type FollowUpInsightsInput = z.infer<typeof FollowUpInsightsInputSchema>;

const FollowUpInsightsOutputSchema = z.object({
  keyInsight: z.string().describe("Summary of the soul's current spiritual state."),
  suggestedNextSteps: z.array(z.string()).describe('List of practical next steps.'),
  suggestedMessage: z.string().describe("Encouraging sample message."),
});
export type FollowUpInsightsOutput = z.infer<typeof FollowUpInsightsOutputSchema>;

export async function generateFollowUpInsights(
  input: FollowUpInsightsInput
): Promise<FollowUpInsightsOutput> {
  return generateFollowUpInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFollowUpInsightsPrompt',
  input: {schema: FollowUpInsightsInputSchema},
  output: {schema: FollowUpInsightsOutputSchema},
  prompt: `You are an AI assistant for "BornAgain", a Christian mobilization app. Your role is to provide encouraging and practical follow-up advice to users who have lead someone into the new birth journey.

A user is asking for insights on how to follow up with a person named {{{firstName}}}.

Analyze the following data about their journey:
- Current Status: {{{status}}}
- Recent Interactions: {{{followUpHistory}}}
- Attending Church: {{{attendingChurch}}}
- In Bible Study: {{{inBibleStudy}}}
- Has App Account (based on email): {{{hasAppAccount}}}

Based on this, generate:
1.  **Key Insight**: A concise summary of their spiritual state.
2.  **Suggested Next Steps**: Practical, actionable steps to deepen their faith.
3.  **Suggested Message**: A short, personal message (WhatsApp/SMS) to encourage them.

Keep the tone encouraging, pastoral, and focused on the concept of the new creation.`,
});

const generateFollowUpInsightsFlow = ai.defineFlow(
  {
    name: 'generateFollowUpInsightsFlow',
    inputSchema: FollowUpInsightsInputSchema,
    outputSchema: FollowUpInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI did not return a valid insight.');
    }
    return output;
  }
);
