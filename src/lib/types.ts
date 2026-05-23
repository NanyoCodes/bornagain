
import type { Timestamp } from "firebase/firestore";

export type ReadingHistoryItem = {
  book: string;
  chapter: number;
  readAt: Timestamp;
};

export type BibleHighlight = {
  id: string;
  userId: string;
  book: string;
  chapter: number;
  verses: number[];
  color: string; // e.g., 'yellow', 'blue', 'green', 'pink'
  note?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type NoteCategory = 'Personal' | 'Church' | 'Revelation' | 'Other';

export type Note = {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: NoteCategory;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type DailyDisciplineLog = {
  id: string; // The date string YYYY-MM-DD
  completed: string[];
  date: Timestamp;
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  fullName_lowercase?: string;
  name_tokens?: string[];
  email: string;
  photoURL?: string;
  bio?: string;
  videoTestimonyUrl?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    city_lowercase?: string;
    state_lowercase?: string;
    country_lowercase?: string;
    latitude?: number;
    longitude?: number;
  };
  phone?: string;
  defaultMeetingLink?: string;
  dailyDiscipline?: {
    completed: string[];
    lastUpdated: Timestamp;
  };
  readingHistory?: ReadingHistoryItem[];
  prayerLinks?: {
    name: string;
    url: string;
  }[];
  notificationSettings?: {
    newCampaignsInArea?: boolean;
    weeklyDigest?: boolean;
  };
  accountabilityPartners?: {
    userId: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
  }[];
  partnerIds?: string[];
  lastChurchAttended?: string;
  churchInfo?: {
    name?: string;
    branch?: string;
    location?: string;
    schedule?: {
      day: string;
      time: string;
      url?: string;
    }[];
  };
  attendanceHistory?: {
    churchName: string;
    branch?: string;
    location?: string;
    attendedAt: Timestamp;
    reason?: string;
  }[];
  favoritePassages?: string[];
  monthlySoulsGoal?: number;
  lastActive?: Timestamp;
};

export type Achievement = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
};

export type TestimonyCategory = 
  | 'Healing' 
  | 'Financial Breakthrough' 
  | 'Salvation' 
  | 'Relationships' 
  | 'Deliverance' 
  | 'Academic Success' 
  | 'Employment' 
  | 'Family' 
  | 'Protection' 
  | 'Mental Health' 
  | 'Global Missions' 
  | 'Business Growth' 
  | 'General';

export type Testimony = {
  id: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  category: TestimonyCategory;
  campaignId?: string;
  campaignTitle?: string;
  authorLocation?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  supporters?: string[]; // Amen
  inspiredBy?: string[];
  connectedBy?: string[];
  answeredPrayerId?: string;
  answeredPrayerContent?: string;
};

export type TestimonyComment = {
    id: string;
    authorId: string;
    authorFirstName: string;
    authorLastName: string;
    authorAvatarUrl?: string;
    text: string;
    createdAt: Timestamp;
    parentId?: string | null;
    supporters?: string[];
    inspiredBy?: string[];
    connectedBy?: string[];
};

export type PrayerRequest = {
  id: string;
  authorId: string;
  content: string;
  category: TestimonyCategory;
  createdAt: Timestamp;
  usersWhoPrayed?: string[];
  isAnonymous?: boolean;
  authorFirstName?: string;
  authorLastName?: string;
  authorAvatarUrl?: string;
  status?: 'pending' | 'answered';
  answeredTestimonyId?: string;
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
  organizerFirstName: string;
  organizerLastName: string;
  status?: 'active' | 'deleted';
  lastUpdateReason?: string;
  lastUpdatedAt?: Timestamp;
  deletionReason?: string;
  deletedAt?: Timestamp;
  scripture?: string;
  scriptureTestimony?: string;
  soulsLogged?: number;
  streamUrl?: string;
  hasGroupChat?: boolean;
};

export type CampaignParticipant = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  photoURL?: string;
  joinedAt: Timestamp;
  joinReason?: string;
};

export type JoinedCampaign = {
  id: string;
  campaignId: string;
  joinedAt: Timestamp;
};

export type ProgressLog = {
  date: string;
  soulsWon: number;
};

export type FollowUpStatus = 'New' | 'Contacted' | 'Established';

export type FollowUpLogItem = {
  date: Timestamp;
  note?: string;
  actions?: string[];
  memberId?: string;
  memberName?: string;
};

export type Soul = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  church?: string;
  gender?: string;
  nationality?: string;
  source: 'Campaign' | 'Personal';
  sourceDetails?: string;
  campaignId?: string;
  userLocation?: {
    city?: string;
    country?: string;
    city_lowercase?: string;
    country_lowercase?: string;
  };
  locationWon?: {
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  wonAt: Timestamp; // ISO date string
  status: FollowUpStatus;
  followUpLog: FollowUpLogItem[];
  attendingChurch?: boolean;
  inBibleStudy?: boolean;
  attendingPrayer?: boolean;
  inServiceDepartment?: boolean;
  fellowshipId?: string;
  fellowshipName?: string;
  associationId?: string;
  associationName?: string;
};

export type ChatParticipantInfo = {
  [key: string]: {
    firstName: string;
    lastName: string;
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
  fellowshipId?: string;
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
    senderFirstName: string;
    senderLastName: string;
  };
};

export type Notification = {
  id: string;
  userId: string;
  type: 'campaign_join' | 'new_chat_message' | 'accountability_nudge' | 'accountability_request' | 'request_accepted' | 'request_declined' | 'accountability_partner_removed' | 'new_soul_in_fellowship';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Timestamp;
};

export type AccountabilityRequest = {
  id: string;
  fromUserId: string;
  fromUserFirstName: string;
  fromUserLastName: string;
  fromUserPhotoURL?: string;
  toUserId: string;
  toUserFirstName: string;
  toUserLastName: string;
  toUserPhotoURL?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  participantIds: string[];
};

export type Mail = {
  to: string[];
  message: {
    subject: string;
    html: string;
  };
};

export type Fellowship = {
  id: string;
  name: string;
  description: string;
  groupType: 'Fellowship' | 'Association';
  organizerId: string;
  organizerName: string;
  organizerPhotoURL?: string;
  memberCount: number;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  locationType?: 'Physical' | 'Virtual' | 'Physical and Virtual';
  latitude?: number;
  longitude?: number;
  schedule?: string;
  memberIds: string[];
  status?: 'active' | 'deleted';
  streamUrl?: string;
  hasGroupChat?: boolean;
};

export type FellowshipMember = {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
    joinedAt: Timestamp;
};

export type JoinedFellowship = {
    id: string;
    fellowshipId: string;
    joinedAt: Timestamp;
};
