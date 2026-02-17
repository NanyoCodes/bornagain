import { config } from 'dotenv';
config();

import '@/ai/flows/generate-campaign-ideas.ts';
import '@/ai/flows/summarize-testimony-flow.ts';
import '@/ai/flows/moderate-content-flow.ts';