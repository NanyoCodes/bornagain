import type { User, ProgressLog } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

// Mock data is being phased out in favor of live data from Firestore.
// Some mock data may remain for components that are not yet connected.

export const mockUser: User = {
  id: 'user-01',
  name: 'John Doe',
  email: 'user@testify.com',
  avatarUrl: findImage('user-1'),
  coverBannerUrl: findImage('profile-cover-1'),
  bio: "Spreading the good news, one testimony at a time. Follower of Christ, husband, and father. Passionate about evangelism and community outreach. Let's connect and glorify Him together!",
  location: 'Nairobi, Kenya',
  phone: '+254 712 345678',
  website: 'https://johndoe.testify',
  stats: {
    testimonies: 12,
    campaignsJoined: 5,
    soulsWon: 3,
    currentStreak: 7,
  },
  achievements: [
    { id: 'ach-1', level: 3, name: 'Faithful Witness', description: 'Shared over 10 testimonies.' },
    { id: 'ach-2', level: 2, name: 'Campaign Enthusiast', description: 'Joined 5 campaigns.' },
    { id: 'ach-3', level: 4, name: 'Soul Winner', description: 'Led over 30 people to Christ.' },
  ],
};

export const mockProgressData: ProgressLog[] = [
  { date: 'Jan', soulsWon: 4 },
  { date: 'Feb', soulsWon: 8 },
  { date: 'Mar', soulsWon: 15 },
  { date: 'Apr', soulsWon: 7 },
  { date: 'May', soulsWon: 12 },
  { date: 'Jun', soulsWon: 18 },
  { date: 'Jul', soulsWon: 22 },
];
