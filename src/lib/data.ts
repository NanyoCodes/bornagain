import type { User, Campaign, ProgressLog, Soul } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

export const mockSoulsWon: Soul[] = [
  {
    id: 'soul-1',
    name: 'Peter James',
    contact: 'peter.j@example.com',
    source: 'Campaign',
    sourceDetails: 'Nairobi City-Wide Outreach',
    wonAt: '2024-07-20T10:00:00Z',
    status: 'Attending Church',
    followUpLog: [
      { date: '2024-07-22T10:00:00Z', note: 'Called and invited to church.' },
      { date: '2024-07-28T10:00:00Z', note: 'Attended Sunday service.' },
    ],
    attendingChurch: true,
    inBibleStudy: false,
    attendingPrayer: false,
  },
  {
    id: 'soul-2',
    name: 'Mary Magdalene',
    contact: 'mary.m@example.com',
    source: 'Personal',
    wonAt: '2024-07-18T14:00:00Z',
    status: 'New',
    followUpLog: [],
    attendingChurch: false,
    inBibleStudy: false,
    attendingPrayer: false,
  },
  {
    id: 'soul-3',
    name: 'Paul Barnabas',
    contact: 'paul.b@example.com',
    source: 'Referral',
    sourceDetails: 'Jane Smith',
    wonAt: '2024-07-15T18:00:00Z',
    status: 'Established',
    followUpLog: [
      { date: '2024-07-16T10:00:00Z', note: 'Met for coffee, discussed discipleship.' },
      { date: '2024-07-21T10:00:00Z', note: 'Joined a small group for bible study.' },
      { date: '2024-07-28T10:00:00Z', note: 'Is now a regular at church and small group.' },
    ],
    attendingChurch: true,
    inBibleStudy: true,
    attendingPrayer: true,
  },
];

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
    soulsWon: mockSoulsWon.length,
    currentStreak: 7,
  },
  achievements: [
    { id: 'ach-1', level: 3, name: 'Faithful Witness', description: 'Shared over 10 testimonies.' },
    { id: 'ach-2', level: 2, name: 'Campaign Enthusiast', description: 'Joined 5 campaigns.' },
    { id: 'ach-3', level: 4, name: 'Soul Winner', description: 'Led over 30 people to Christ.' },
  ],
};

export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    title: 'Nairobi City-Wide Outreach',
    description: 'A 3-day event to spread the gospel across the city of Nairobi through street evangelism, concerts, and community service.',
    goal: 'Reach 10,000 people and see 1,000 souls saved.',
    location: 'Nairobi, Kenya',
    participants: 152,
    progress: 75,
    imageUrl: findImage('campaign-image-1'),
    createdAt: '2024-07-15T11:00:00Z',
    organizer: { id: 'user-01', name: 'John Doe' },
  },
  {
    id: 'camp-2',
    title: 'Campus Revival at UoN',
    description: 'A week-long revival meeting aimed at the students of the University of Nairobi.',
    goal: 'Ignite a passion for Christ among the youth.',
    location: 'University of Nairobi',
    participants: 48,
    progress: 40,
    imageUrl: findImage('campaign-image-2'),
    createdAt: '2024-07-10T08:00:00Z',
    organizer: { id: 'user-02', name: 'Jane Smith' },
  },
];

export const mockProgressData: ProgressLog[] = [
  { date: 'Jan', soulsWon: 4 },
  { date: 'Feb', soulsWon: 8 },
  { date: 'Mar', soulsWon: 15 },
  { date: 'Apr', soulsWon: 7 },
  { date: 'May', soulsWon: 12 },
  { date: 'Jun', soulsWon: 18 },
  { date: 'Jul', soulsWon: 22 },
];
