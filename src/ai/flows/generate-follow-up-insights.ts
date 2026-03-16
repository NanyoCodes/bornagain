'use server';
/**
 * @fileOverview A Genkit flow for generating follow-up insights for a new convert.
 *
 * - generateFollowUpInsights - A function that handles the insight generation process.
 * - FollowUpInsightsInput - The input type for the function.
 * - FollowUpInsightsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const FollowUpInsightsInputSchema = z.object({
  firstName: z.string().describe("The soul's first name."),
  status: z.string().describe("The soul's current follow-up status (e.g., New, Contacted, Established)."),
  followUpHistory: z.string().describe('A summary of the recent follow-up interactions.'),
  attendingChurch: z.boolean().describe('Whether the soul is currently attending church.'),
  inBibleStudy: z.boolean().describe('Whether the soul is currently in a Bible study.'),
  hasAppAccount: z.boolean().describe('Whether the soul has an email, indicating they might have an account on the app.'),
});
export type FollowUpInsightsInput = z.infer<typeof FollowUpInsightsInputSchema>;

export const FollowUpInsightsOutputSchema = z.object({
  keyInsight: z.string().describe("A concise, one-sentence summary of the soul's current spiritual state based on the provided data."),
  suggestedNextSteps: z.array(z.string()).describe('A list of 2-3 practical, actionable next steps for follow-up.'),
  suggestedMessage: z.string().describe("A short, encouraging sample message (SMS or WhatsApp) to send to the person. The message should be personal and reference their journey if possible."),
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
  prompt: `You are an AI assistant for "Testify", a Christian evangelism app. Your role is to provide encouraging and practical follow-up advice to users who have led someone to Christ.

A user is asking for insights on how to follow up with a person named {{{firstName}}}.

Analyze the following data about their journey:
- Current Status: {{{status}}}
- Recent Interactions: {{{followUpHistory}}}
- Attending Church: {{{attendingChurch}}}
- In Bible Study: {{{inBibleStudy}}}
- Has App Account (based on email): {{{hasAppAccount}}}

Based on this, generate:
1.  **Key Insight**: A concise, one-sentence summary of the person's current spiritual state.
2.  **Suggested Next Steps**: A list of 2-3 practical, actionable next steps. Be specific. If they are not in church, a step should be to invite them. If they have an account, suggest connecting with them in the app.
3.  **Suggested Message**: A short, encouraging sample message (SMS/WhatsApp) to send. Personalize it with their name and make it sound natural and caring, not robotic.

Keep the tone encouraging, pastoral, and action-oriented.`,
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
