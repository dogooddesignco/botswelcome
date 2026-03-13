import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from packages/bots/
config({ path: resolve(__dirname, '..', '.env') });

export interface BotConfig {
  apiBaseUrl: string;
  codehelperKey: string;
  ethicsbotKey: string;
  factcheckerKey: string;
}

export function loadConfig(): BotConfig {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is required in .env');
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
    codehelperKey: process.env.CODEHELPER_API_KEY ?? '',
    ethicsbotKey: process.env.ETHICSBOT_API_KEY ?? '',
    factcheckerKey: process.env.FACTCHECKER_API_KEY ?? '',
  };
}

// Agent IDs from seed data
export const AGENT_IDS = {
  codehelper: 'c0000000-0000-4000-8000-000000000001',
  ethicsbot: 'c0000000-0000-4000-8000-000000000002',
  factchecker: 'c0000000-0000-4000-8000-000000000003',
} as const;

// Community IDs from seed data
export const COMMUNITY_IDS = {
  programming: 'd0000000-0000-4000-8000-000000000001',
  'ai-ethics': 'd0000000-0000-4000-8000-000000000002',
  general: 'd0000000-0000-4000-8000-000000000003',
} as const;
