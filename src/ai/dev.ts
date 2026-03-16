'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-campaign-ideas.ts';
import '@/ai/flows/generate-follow-up-insights.ts';
