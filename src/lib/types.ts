import type { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  coverBannerUrl?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
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
  authorAvatarUrl: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  category: TestimonyCategory;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  goal: string;
  location: string;
  participants: number;
  progress: number;
  imageUrl: string;
  createdAt: Timestamp;
  organizerId: string;
  organizerName: string;
};

export type JoinedCampaign = {
  id: string;
  campaignId: string;
  joinedAt: Timestamp;
}

export type ProgressLog = {
  date: string;
  soulsWon: number;
};

export type FollowUpStatus = 'New' | 'Contacted' | 'Attending Church' | 'In Bible Study' | 'Established';

export type Soul = {
  id: string;
  userId: string;
  name: string;
  contact?: string;
  source: 'Campaign' | 'Personal' | 'Referral';
  sourceDetails?: string; // e.g., Campaign name or referrer name
  wonAt: Timestamp; // ISO date string
  status: FollowUpStatus;
  followUpLog: {
    date: Timestamp;
    note: string;
  }[];
  attendingChurch: boolean;
  inBibleStudy: boolean;
  attendingPrayer: boolean;
};
