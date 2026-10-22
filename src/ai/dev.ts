'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-campaign-ideas';
import '@/ai/flows/generate-follow-up-insights';
import '@/ai/flows/generate-ministry-innovation';
import '@/ai/flows/search-worship-songs';