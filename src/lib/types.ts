export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  coverBannerUrl: string;
  bio: string;
  location: string;
  phone: string;
  website: string;
  stats: {
    testimonies: number;
    campaignsJoined: number;
    soulsWon: number;
    currentStreak: number;
  };
  achievements: Achievement[];
};

export type Achievement = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
};

export type Testimony = {
  id: string;
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  title: string;
  content: string;
  likes: number;
  createdAt: string;
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
  createdAt: string;
  organizer: Pick<User, 'id' | 'name'>;
};

export type ProgressLog = {
  date: string;
  soulsWon: number;
};
