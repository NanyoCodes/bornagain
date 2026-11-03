'use server';
/**
 * @fileOverview This file implements a Genkit flow for moderating content on the BornAgain platform.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModerateContentInputSchema = z.object({
  content: z.string().describe('The user-generated text content to be moderated.'),
  contentType: z.enum(['testimony', 'campaign_description']).describe('The type of content being moderated.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
  status: z.enum(['approved', 'flagged_for_review', 'rejected', 'edited']).describe('The moderation decision.'),
  reason: z.string().describe('Explanation for the decision.'),
  moderatedContent: z.string().optional().describe('The safe version of the content.'),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
  return moderateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateContentPrompt',
  input: { schema: ModerateContentInputSchema },
  output: { schema: ModerateContentOutputSchema },
  prompt: `You are an AI content moderator for "BornAgain", a faith-based platform for believers to share miracles and organize soul-winning campaigns. Your mission is to ensure all user-generated content aligns with the platform's mission to "Encourage the redeemed, Organize the harvest, and Glorify God through technology."

Guidelines for appropriate content:
1.  **Faith-Based & On-Topic**: Content must be related to Christian faith, personal testimonies of God's work, or soul-winning efforts.
2.  **Respectful & Edifying**: Content should be uplifting and respectful. No hate speech or bullying.
3.  **No Profanity or Obscenity**: Strictly no profane language.
4.  **No Political or Divisive Content**: Avoid partisan discussions.
5.  **Accuracy and Honesty**: Testimonies should be truthful.

You are moderating a piece of content of type "{{contentType}}".
Here is the content for moderation:

{{{content}}}

Analyze the content against the guidelines above. Determine the appropriate status and provide a reason.`,
});

const moderateContentFlow = ai.defineFlow(
  {
    name: 'moderateContentFlow',
    inputSchema: ModerateContentInputSchema,
    outputSchema: ModerateContentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI did not return a moderation output.');
    }
    if (output.status === 'approved' && !output.moderatedContent) {
      return { ...output, moderatedContent: input.content };
    }
    return output;
  }
);
