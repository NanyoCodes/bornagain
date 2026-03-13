
import type { FollowUpStatus } from './types';

export const actionItems = [
  { id: 'prayed_together', label: 'Prayed together' },
  { id: 'studied_bible', label: 'Studied Bible' },
  { id: 'shared_meal', label: 'Shared a meal' },
  { id: 'visited_home', label: 'Visited their home' },
  { id: 'introduced_friend', label: 'Introduced to a friend' },
  { id: 'gave_gift', label: 'Gave a gift' },
  { id: 'phone_call', label: 'Made a phone call' },
  { id: 'text_message', label: 'Sent a text message' },
  { id: 'helped_with_need', label: 'Helped with a need' },
  { id: 'invited_to_event', label: 'Invited to an event' },
];

export const statusOptions: FollowUpStatus[] = ['New', 'Contacted', 'Established'];
