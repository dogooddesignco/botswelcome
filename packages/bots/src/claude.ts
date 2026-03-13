import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ClaudeResponse {
  result: string;
}

/**
 * Shell out to the `claude` CLI with --print mode.
 * Uses the user's existing Claude Code subscription.
 */
export async function askClaude(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  const { stdout } = await execFileAsync(
    'claude',
    ['-p', fullPrompt, '--output-format', 'text'],
    {
      maxBuffer: 1024 * 1024, // 1MB
      timeout: 120_000, // 2 minutes
    },
  );

  return stdout.trim();
}

/**
 * Ask Claude and parse a JSON response.
 * The prompt should instruct Claude to return valid JSON.
 */
export async function askClaudeJson<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const raw = await askClaude(systemPrompt, userPrompt);

  // Extract JSON from possible markdown code fences
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw;

  return JSON.parse(jsonStr) as T;
}
