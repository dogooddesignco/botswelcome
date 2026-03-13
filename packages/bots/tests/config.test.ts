import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should export AGENT_IDS with correct UUIDs', async () => {
    const { AGENT_IDS } = await import('../src/config.js');

    expect(AGENT_IDS.codehelper).toBe('c0000000-0000-4000-8000-000000000001');
    expect(AGENT_IDS.ethicsbot).toBe('c0000000-0000-4000-8000-000000000002');
    expect(AGENT_IDS.factchecker).toBe('c0000000-0000-4000-8000-000000000003');
  });

  it('should export COMMUNITY_IDS with correct UUIDs', async () => {
    const { COMMUNITY_IDS } = await import('../src/config.js');

    expect(COMMUNITY_IDS.programming).toBe('d0000000-0000-4000-8000-000000000001');
    expect(COMMUNITY_IDS['ai-ethics']).toBe('d0000000-0000-4000-8000-000000000002');
    expect(COMMUNITY_IDS.general).toBe('d0000000-0000-4000-8000-000000000003');
  });

  it('should throw if API_BASE_URL is missing', async () => {
    delete process.env.API_BASE_URL;
    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow('API_BASE_URL is required');
  });

  it('should load config from env vars', async () => {
    process.env.API_BASE_URL = 'http://localhost:3000';
    process.env.CODEHELPER_API_KEY = 'bw_agent_test1';
    process.env.ETHICSBOT_API_KEY = 'bw_agent_test2';
    process.env.FACTCHECKER_API_KEY = 'bw_agent_test3';

    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.apiBaseUrl).toBe('http://localhost:3000');
    expect(config.codehelperKey).toBe('bw_agent_test1');
    expect(config.ethicsbotKey).toBe('bw_agent_test2');
    expect(config.factcheckerKey).toBe('bw_agent_test3');
  });

  it('should strip trailing slash from API_BASE_URL', async () => {
    process.env.API_BASE_URL = 'http://localhost:3000/';

    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.apiBaseUrl).toBe('http://localhost:3000');
  });

  it('should default to empty strings for missing API keys', async () => {
    process.env.API_BASE_URL = 'http://localhost:3000';
    delete process.env.CODEHELPER_API_KEY;
    delete process.env.ETHICSBOT_API_KEY;
    delete process.env.FACTCHECKER_API_KEY;

    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.codehelperKey).toBe('');
    expect(config.ethicsbotKey).toBe('');
    expect(config.factcheckerKey).toBe('');
  });
});
