

import type { Timestamp } from "firebase/firestore";

export type ReadingHistoryItem = {
  book: string;
  chapter: number;
  readAt: Timestamp;
};

export type DailyDisciplineLog = {
  id: string; // The date string YYYY-MM-DD
  completed: string[];
  date: Timestamp;
};

export type UserProfile = {
  id: string;
  displayName: string;
  displayName_lowercase?: string;
  displayName_tokens?: string[];
  email: string;
  photoURL?: string;
  bio?: string;
  location?: {
    city?: string;
    country?: string;
  };
  phone?: string;
  dailyDiscipline?: {
    completed: string[];
    lastUpdated: Timestamp;
  };
  readingHistory?: ReadingHistoryItem[];
  notificationSettings?: {
    newCampaignsInArea?: boolean;
    weeklyDigest?: boolean;
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'private';
    showLocation?: boolean;
  };
  accountabilityPartnerId?: string;
  accountabilityPartnerName?: string;
  lastChurchAttended?: string;
  churchInfo?: {
    name?: string;
    schedule?: {
      day: string;
      time: string;
    }[];
  };
  attendanceHistory?: {
    churchName: string;
    attendedAt: Timestamp;
  }[];
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
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  goal: string;
  location: string;
  latitude?: number;
  longitude?: number;
  coverageRadius?: number; // in meters
  startDate: Timestamp;
  endDate: Timestamp;
  startTime: string;
  endTime: string;
  participants: number;
  maxParticipants?: number;
  createdAt: Timestamp;
  organizerId: string;
  organizerName: string;
  status?: 'active' | 'deleted';
  lastUpdateReason?: string;
  deletionReason?: string;
  deletedAt?: Timestamp;
  scripture?: string;
  scriptureTestimony?: string;
  soulsLogged?: number;
  streamUrl?: string;
  hasGroupChat?: boolean;
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
  email?: string;
  phone?: string;
  church?: string;
  source: 'Campaign' | 'Personal' | 'Referral';
  sourceDetails?: string; // e.g., Campaign name or referrer name
  campaignId?: string;
  userLocation?: {
    city?: string;
    country?: string;
  };
  locationWon?: string;
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
    email?: string;
  }
};

export type Chat = {
  id: string;
  participantIds: string[];
  participantInfo: ChatParticipantInfo;
  campaignId?: string;
  campaignTitle?: string;
  lastUpdatedAt: Timestamp;
  hasMessages?: boolean;
  isGroupChat?: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text?: string;
  createdAt: Timestamp;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
};

export type Notification = {
  id: string;
  userId: string;
  type: 'campaign_join' | 'new_chat_message' | 'accountability_nudge' | 'accountability_request' | 'request_accepted' | 'request_declined';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Timestamp;
};

export type AccountabilityRequest = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhotoURL?: string;
  toUserId: string;
  toUserName: string;
  toUserPhotoURL?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  participantIds: string[];
};
