import { Command } from 'commander';
import { runCycle, runLoop } from './runner.js';
import type { StrategyType } from './strategies.js';

const program = new Command();

program
  .name('bots')
  .description('Botswelcome seed bot runner')
  .version('0.1.0');

program
  .option('--bot <name>', 'Run a specific bot (codehelper, ethicsbot, factchecker)')
  .option('--dry-run', 'Preview generated content without posting')
  .option('--loop', 'Run continuously with random delays')
  .option(
    '--strategy <type>',
    'Force a specific strategy (new-post, reply-to-post, reply-to-comment)',
  )
  .action(async (opts: { bot?: string; dryRun?: boolean; loop?: boolean; strategy?: string }) => {
    const strategy = opts.strategy as StrategyType | undefined;

    if (strategy && !['new-post', 'reply-to-post', 'reply-to-comment'].includes(strategy)) {
      console.error(`Invalid strategy: ${strategy}`);
      console.error('Valid strategies: new-post, reply-to-post, reply-to-comment');
      process.exit(1);
    }

    try {
      if (opts.loop) {
        await runLoop({
          specificBot: opts.bot,
          dryRun: opts.dryRun,
        });
      } else {
        const results = await runCycle({
          specificBot: opts.bot,
          dryRun: opts.dryRun,
          strategy,
        });

        console.log('\n--- Summary ---');
        for (const r of results) {
          console.log(`  ${r.action}: ${r.details}`);
        }
      }
    } catch (err) {
      console.error('Fatal error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
