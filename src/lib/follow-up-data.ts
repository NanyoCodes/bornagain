import type { FollowUpStatus } from './types';

export const actionItems = [
  { id: 'prayed_together', label: 'Pray with' },
  { id: 'studied_bible', label: 'Study the Word with' },
  { id: 'shared_meal', label: 'Share a meal with' },
  { id: 'visited_home', label: 'Visit' },
  { id: 'introduced_friend', label: 'Introduce to a friend' },
  { id: 'gave_gift', label: 'Give a gift to' },
  { id: 'phone_call', label: 'Call' },
  { id: 'text_message', label: 'Message' },
  { id: 'helped_with_need', label: 'Help with a need' },
  { id: 'invited_to_event', label: 'Invite to an event' },
  { id: 'innovate', label: 'Kingdom Innovation' },
];

export const statusOptions: FollowUpStatus[] = ['New', 'Contacted', 'Established'];
