
'use server';
/**
 * @fileOverview This file implements a Genkit flow for moderating user-generated content (testimonies and campaign descriptions) on the Testify platform.
 *
 * - moderateContent - A function that handles the content moderation process.
 * - ModerateContentInput - The input type for the moderateContent function.
 * - ModerateContentOutput - The return type for the moderateContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModerateContentInputSchema = z.object({
  content: z.string().describe('The user-generated text content to be moderated, such as a testimony or campaign description.'),
  contentType: z.enum(['testimony', 'campaign_description']).describe('The type of content being moderated. This helps the AI understand the context and relevant guidelines.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
  status: z.enum(['approved', 'flagged_for_review', 'rejected', 'edited']).describe('The moderation decision: "approved" if appropriate, "flagged_for_review" if borderline, "rejected" if clearly inappropriate, or "edited" if minor inappropriate parts were removed.'),
  reason: z.string().describe('A brief explanation for the moderation decision.'),
  moderatedContent: z.string().optional().describe('If the status is "edited", this field contains the modified content with inappropriate parts removed. If "approved", this will be the same as the original content. If "rejected" or "flagged_for_review", this field is not provided.'),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
  return moderateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateContentPrompt',
  input: { schema: ModerateContentInputSchema },
  output: { schema: ModerateContentOutputSchema },
  prompt: `You are an AI content moderator for "Testify", a faith-based platform for believers to share testimonies and organize soul-winning campaigns. Your mission is to ensure all user-generated content aligns with the platform's mission to "Encourage believers, Organize evangelism efforts, Track progress, Connect the global body of Christ, and Glorify God through technology."

Guidelines for appropriate content:
1.  **Faith-Based & On-Topic**: Content must be related to Christian faith, personal testimonies of God's work, or soul-winning campaign descriptions.
2.  **Respectful & Edifying**: Content should be uplifting, encouraging, and respectful of all users. No hate speech, discrimination, personal attacks, bullying, or derogatory language towards any group or individual.
3.  **No Profanity or Obscenity**: Absolutely no profane, vulgar, or sexually explicit language or imagery.
4.  **No Spam or Self-Promotion**: Do not allow unrelated commercial advertisements, spam, links to external personal websites (unless relevant to a campaign and pre-approved by human moderation), or attempts to solicit money.
5.  **No Political or Divisive Content**: Avoid partisan political discussions or content that is designed to create division within the Christian community or broader society, unless it's directly related to the platform's evangelism mission in a respectful manner.
6.  **No Incitement to Violence or Illegal Activities**: Content promoting violence, illegal activities, or self-harm is strictly forbidden.
7.  **Accuracy and Honesty**: Testimonies should be truthful and campaigns should have clear, achievable goals.

You are moderating a piece of content of type "{{contentType}}".
Here is the content for moderation:

{{{content}}}

Analyze the content against the guidelines above. Determine the appropriate status:
-   **"approved"**: If the content fully complies with all guidelines.
-   **"edited"**: If the content contains minor issues (e.g., a single profane word, a short off-topic phrase) that can be removed without losing the core message. In this case, provide the modified content in 'moderatedContent'.
-   **"flagged_for_review"**: If the content is borderline, ambiguous, or requires human judgment due to complex nuances (e.g., potentially sensitive topics that are not clearly inappropriate but could be misinterpreted, or content that subtly hints at self-promotion).
-   **"rejected"**: If the content clearly and significantly violates one or more guidelines (e.g., hate speech, severe profanity, completely off-topic spam, incitement to violence).

Provide a concise 'reason' for your decision. If the status is "edited", provide the 'moderatedContent'. If "approved", 'moderatedContent' can be the original content. If "rejected" or "flagged_for_review", do not include 'moderatedContent'.`,
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

    // If the status is 'approved' but moderatedContent is not set, set it to the original content.
    // This simplifies client-side logic to always expect moderatedContent if approved/edited.
    if (output.status === 'approved' && !output.moderatedContent) {
      return { ...output, moderatedContent: input.content };
    }
    return output;
  }
);
