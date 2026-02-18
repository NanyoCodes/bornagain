import type { ProgressLog } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

// Mock data is being phased out in favor of live data from Firestore.
// Some mock data may remain for components that are not yet connected.

export const mockProgressData: ProgressLog[] = [
  { date: 'Jan', soulsWon: 4 },
  { date: 'Feb', soulsWon: 8 },
  { date: 'Mar', soulsWon: 15 },
  { date: 'Apr', soulsWon: 7 },
  { date: 'May', soulsWon: 12 },
  { date: 'Jun', soulsWon: 18 },
  { date: 'Jul', soulsWon: 22 },
];
