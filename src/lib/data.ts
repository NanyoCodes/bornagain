import type { User, Testimony, Campaign, ProgressLog } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

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
    soulsWon: 34,
    currentStreak: 7,
  },
  achievements: [
    { id: 'ach-1', level: 3, name: 'Faithful Witness', description: 'Shared over 10 testimonies.' },
    { id: 'ach-2', level: 2, name: 'Campaign Enthusiast', description: 'Joined 5 campaigns.' },
    { id: 'ach-3', level: 4, name: 'Soul Winner', description: 'Led over 30 people to Christ.' },
  ],
};

export const mockTestimonies: Testimony[] = [
  {
    id: 'test-1',
    author: { id: 'user-02', name: 'Jane Smith', avatarUrl: findImage('user-2') },
    title: 'Healed from a Chronic Illness!',
    content: "For years, I suffered from a debilitating chronic illness. Doctors gave me no hope, but I held onto my faith. Through persistent prayer and the support of my church family, God performed a miracle. I am now completely healed and living a life I never thought possible. All glory to Him!",
    likes: 128,
    createdAt: '2024-07-20T10:00:00Z',
    category: 'Healing',
    mediaUrl: findImage('campaign-image-2'), // Using an existing image for mock
    mediaType: 'image',
  },
  {
    id: 'test-2',
    author: { id: 'user-03', name: 'Samuel Green', avatarUrl: findImage('user-3') },
    title: 'Financial Breakthrough in a Time of Need',
    content: "I lost my job and was on the brink of losing my home. I prayed earnestly for a breakthrough, and God answered in the most unexpected way. A long-lost friend reconnected with me and offered me a position that was even better than my previous one. God is truly our provider!",
    likes: 256,
    createdAt: '2024-07-19T15:30:00Z',
    category: 'Financial Breakthrough',
  },
  {
    id: 'test-3',
    author: { id: 'user-04', name: 'Mary Anne', avatarUrl: findImage('user-4') },
    title: 'Finding Peace in the Midst of Chaos',
    content: "The world feels so chaotic, but I've found a deep and abiding peace in Christ. His promises are my anchor. Whenever I feel overwhelmed, I turn to His word, and His peace, which surpasses all understanding, guards my heart and mind. He is my rock and my salvation.",
    likes: 98,
    createdAt: '2024-07-18T09:00:00Z',
    category: 'General',
  },
    {
    id: 'test-4',
    author: { id: 'user-01', name: 'John Doe', avatarUrl: findImage('user-1') },
    title: 'Delivered from Addiction',
    content: "I was trapped in a cycle of addiction for over a decade. I had lost everything - my family, my job, my self-worth. At my lowest point, I cried out to Jesus, and He met me right where I was. He broke the chains of addiction and has given me a new life. I've been sober for 5 years now, and I'm a new creation!",
    likes: 312,
    createdAt: '2024-07-17T12:00:00Z',
    category: 'Deliverance',
  },
];

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
