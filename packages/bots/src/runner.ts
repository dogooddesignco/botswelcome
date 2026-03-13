import { ApiClient } from './api-client.js';
import { loadConfig, type BotConfig } from './config.js';
import { getPersona, getAllPersonaIds, type Persona } from './personas.js';
import {
  pickStrategy,
  executeNewPost,
  executeReplyToPost,
  executeReplyToComment,
  type StrategyResult,
  type StrategyType,
} from './strategies.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minSec: number, maxSec: number): number {
  return (minSec + Math.random() * (maxSec - minSec)) * 1000;
}

function getApiKey(config: BotConfig, persona: Persona): string {
  const key = config[persona.configKey];
  if (!key) {
    throw new Error(
      `No API key configured for ${persona.name}. Run bootstrap-keys first and check .env`,
    );
  }
  return key;
}

/** Run a single cycle: pick 1-2 bots, execute their strategies */
export async function runCycle(opts: {
  specificBot?: string;
  dryRun?: boolean;
  strategy?: StrategyType;
}): Promise<StrategyResult[]> {
  const config = loadConfig();
  const results: StrategyResult[] = [];

  let botIds: string[];

  if (opts.specificBot) {
    botIds = [opts.specificBot];
  } else {
    // Pick 1-2 random bots
    const allIds = getAllPersonaIds();
    const shuffled = allIds.sort(() => Math.random() - 0.5);
    const count = Math.random() < 0.5 ? 1 : 2;
    botIds = shuffled.slice(0, count);
  }

  for (const botId of botIds) {
    const persona = getPersona(botId);
    const apiKey = getApiKey(config, persona);
    const client = new ApiClient(config.apiBaseUrl, apiKey);

    const strategy = opts.strategy ?? pickStrategy();

    console.log(`[${persona.name}] Strategy: ${strategy}`);

    try {
      let result: StrategyResult;

      switch (strategy) {
        case 'new-post':
          result = await executeNewPost(client, persona, opts.dryRun ?? false);
          break;
        case 'reply-to-post':
          result = await executeReplyToPost(client, persona, opts.dryRun ?? false);
          break;
        case 'reply-to-comment':
          result = await executeReplyToComment(client, persona, opts.dryRun ?? false);
          break;
      }

      console.log(`[${persona.name}] ${result.action}: ${result.details}`);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${persona.name}] Error: ${message}`);
      results.push({
        action: 'skipped',
        details: `${persona.name} errored: ${message}`,
      });
    }

    // Random delay between bots (30s-5min), unless dry run
    if (!opts.dryRun && botIds.indexOf(botId) < botIds.length - 1) {
      const delay = randomDelay(30, 300);
      console.log(`Waiting ${Math.round(delay / 1000)}s before next bot...`);
      await sleep(delay);
    }
  }

  return results;
}

/** Continuous loop mode */
export async function runLoop(opts: {
  specificBot?: string;
  dryRun?: boolean;
}): Promise<never> {
  console.log('Starting continuous loop mode. Press Ctrl+C to stop.');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log(`\n--- Cycle at ${new Date().toISOString()} ---`);
    await runCycle(opts);

    // Wait 5-15 minutes between cycles
    const delay = randomDelay(300, 900);
    console.log(`Next cycle in ${Math.round(delay / 60000)} minutes...`);
    await sleep(delay);
  }
}
