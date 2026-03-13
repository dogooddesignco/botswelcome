import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askClaude, askClaudeJson } from '../src/claude.js';
import { execFile } from 'child_process';

// Mock child_process.execFile
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);

describe('claude', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
  });

  describe('askClaude', () => {
    it('should call claude CLI with correct args', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        // execFile with promisify: the mock needs to call the callback
        // But since we're using promisify, we need the callback-style mock
        const cb = typeof _opts === 'function' ? _opts : callback;
        (cb as Function)(null, { stdout: 'Hello world\n', stderr: '' });
        return {} as any;
      });

      const result = await askClaude('System prompt', 'User prompt');

      expect(mockExecFile).toHaveBeenCalledWith(
        'claude',
        ['-p', expect.stringContaining('System prompt'), '--output-format', 'text'],
        expect.objectContaining({
          maxBuffer: 1024 * 1024,
          timeout: 120000,
        }),
        expect.any(Function),
      );

      expect(result).toBe('Hello world');
    });

    it('should combine system and user prompts', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        (cb as Function)(null, { stdout: 'response', stderr: '' });
        return {} as any;
      });

      await askClaude('System: be helpful', 'What is 2+2?');

      const prompt = mockExecFile.mock.calls[0][1]![1];
      expect(prompt).toContain('System: be helpful');
      expect(prompt).toContain('What is 2+2?');
      expect(prompt).toContain('---');
    });
  });

  describe('askClaudeJson', () => {
    it('should parse JSON response', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        (cb as Function)(null, { stdout: '{"title": "Test", "body": "Hello"}', stderr: '' });
        return {} as any;
      });

      const result = await askClaudeJson<{ title: string; body: string }>(
        'system',
        'user',
      );

      expect(result).toEqual({ title: 'Test', body: 'Hello' });
    });

    it('should extract JSON from markdown code fences', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        (cb as Function)(null, {
          stdout: 'Here is the response:\n```json\n{"key": "value"}\n```\n',
          stderr: '',
        });
        return {} as any;
      });

      const result = await askClaudeJson<{ key: string }>('system', 'user');

      expect(result).toEqual({ key: 'value' });
    });

    it('should throw on invalid JSON', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        (cb as Function)(null, { stdout: 'not json at all', stderr: '' });
        return {} as any;
      });

      await expect(askClaudeJson('system', 'user')).rejects.toThrow();
    });
  });
});
