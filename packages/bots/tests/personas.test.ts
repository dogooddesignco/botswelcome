import { describe, it, expect } from 'vitest';
import { PERSONAS, getPersona, getAllPersonaIds } from '../src/personas.js';
import { COMMUNITY_IDS } from '../src/config.js';

describe('personas', () => {
  describe('PERSONAS', () => {
    it('should define 3 personas', () => {
      expect(Object.keys(PERSONAS)).toHaveLength(3);
    });

    it('should have codehelper, ethicsbot, and factchecker', () => {
      expect(PERSONAS.codehelper).toBeDefined();
      expect(PERSONAS.ethicsbot).toBeDefined();
      expect(PERSONAS.factchecker).toBeDefined();
    });

    it('codehelper should be scoped to programming community', () => {
      expect(PERSONAS.codehelper.communities).toEqual([COMMUNITY_IDS.programming]);
    });

    it('ethicsbot should be scoped to ai-ethics and general', () => {
      expect(PERSONAS.ethicsbot.communities).toEqual([
        COMMUNITY_IDS['ai-ethics'],
        COMMUNITY_IDS.general,
      ]);
    });

    it('factchecker should be scoped to all communities', () => {
      expect(PERSONAS.factchecker.communities).toHaveLength(3);
      expect(PERSONAS.factchecker.communities).toContain(COMMUNITY_IDS.programming);
      expect(PERSONAS.factchecker.communities).toContain(COMMUNITY_IDS['ai-ethics']);
      expect(PERSONAS.factchecker.communities).toContain(COMMUNITY_IDS.general);
    });

    it('each persona should have required fields', () => {
      for (const [key, persona] of Object.entries(PERSONAS)) {
        expect(persona.id, `${key}.id`).toBe(key);
        expect(persona.name, `${key}.name`).toBeTruthy();
        expect(persona.configKey, `${key}.configKey`).toBeTruthy();
        expect(persona.communities.length, `${key}.communities`).toBeGreaterThan(0);
        expect(persona.systemPrompt, `${key}.systemPrompt`).toBeTruthy();
        expect(persona.selfEvalDefaults.tone, `${key}.selfEvalDefaults.tone`).toBeTruthy();
        expect(persona.selfEvalDefaults.defaultConfidence, `${key}.selfEvalDefaults.defaultConfidence`).toBeGreaterThanOrEqual(0);
        expect(persona.selfEvalDefaults.defaultConfidence, `${key}.selfEvalDefaults.defaultConfidence`).toBeLessThanOrEqual(1);
      }
    });

    it('each persona system prompt should mention being an AI bot', () => {
      for (const persona of Object.values(PERSONAS)) {
        expect(persona.systemPrompt).toContain('AI bot');
      }
    });

    it('each persona system prompt should mention SKIP', () => {
      for (const persona of Object.values(PERSONAS)) {
        expect(persona.systemPrompt).toContain('SKIP');
      }
    });
  });

  describe('getPersona', () => {
    it('should return persona by name (case-insensitive)', () => {
      expect(getPersona('codehelper').name).toBe('CodeHelper');
      expect(getPersona('CODEHELPER').name).toBe('CodeHelper');
      expect(getPersona('CodeHelper').name).toBe('CodeHelper');
    });

    it('should throw for unknown persona', () => {
      expect(() => getPersona('nonexistent')).toThrow('Unknown persona: nonexistent');
    });
  });

  describe('getAllPersonaIds', () => {
    it('should return all persona IDs', () => {
      const ids = getAllPersonaIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('codehelper');
      expect(ids).toContain('ethicsbot');
      expect(ids).toContain('factchecker');
    });
  });
});
