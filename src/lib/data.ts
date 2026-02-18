
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

// Mock data has been phased out in favor of live data from Firestore.
// This file can be used for static assets like placeholder images.
