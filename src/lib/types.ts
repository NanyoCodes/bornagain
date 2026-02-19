

import type { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  phone?: string;
  currentStreak?: number;
  longestStreak?: number;
  lastLogin?: Timestamp;
  notificationSettings?: {
    newCampaignsInArea?: boolean;
    weeklyDigest?: boolean;
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'private';
    showLocation?: boolean;
  };
};

export type Achievement = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
};

export type TestimonyCategory = 'Healing' | 'Financial Breakthrough' | 'Salvation' | 'Relationships' | 'Deliverance' | 'General';

export type Testimony = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  category: TestimonyCategory;
  mediaUrl?: string;
  mediaType?: 'image';
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  goal: string;
  location: string;
  startDate: Timestamp;
  endDate: Timestamp;
  startTime: string;
  endTime: string;
  participants: number;
  createdAt: Timestamp;
  organizerId: string;
  organizerName: string;
  status?: 'active' | 'deleted';
  lastUpdateReason?: string;
  deletionReason?: string;
  deletedAt?: Timestamp;
  scripture?: string;
  imageUrl?: string;
};

export type JoinedCampaign = {
  id: string;
  campaignId: string;
  joinedAt: Timestamp;
}

export type CampaignParticipant = {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  joinedAt: Timestamp;
};

export type ProgressLog = {
  date: string;
  soulsWon: number;
};

export type FollowUpStatus = 'New' | 'Contacted' | 'Attending Church' | 'In Bible Study' | 'Established';

export type FollowUpLogItem = {
  date: Timestamp;
  note?: string;
  checklist?: string[];
};

export type Soul = {
  id: string;
  userId: string;
  name: string;
  contact?: string;
  church?: string;
  source: 'Campaign' | 'Personal' | 'Referral';
  sourceDetails?: string; // e.g., Campaign name or referrer name
  wonAt: Timestamp; // ISO date string
  status: FollowUpStatus;
  followUpLog: FollowUpLogItem[];
  attendingChurch: boolean;
  inBibleStudy: boolean;
  attendingPrayer: boolean;
};

export type ChatParticipantInfo = {
  [key: string]: {
    displayName: string;
    photoURL?: string;
  }
};

export type Chat = {
  id: string;
  participantIds: string[];
  participantInfo: ChatParticipantInfo;
  campaignId: string;
  campaignTitle: string;
  lastUpdatedAt: Timestamp;
  hasMessages?: boolean;
  isGroupChat?: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: Timestamp;
};

export type Notification = {
  id: string;
  userId: string;
  type: 'campaign_join' | 'new_chat_message';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Timestamp;
};
