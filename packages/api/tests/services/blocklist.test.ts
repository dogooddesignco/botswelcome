import { describe, it, expect } from 'vitest';
import { containsBlockedTerm, BLOCKLIST } from '../../src/config/blocklist';

describe('containsBlockedTerm', () => {
  it('should return true for known blocked terms', () => {
    expect(containsBlockedTerm('spam with slur nigger in it')).toBe(true);
    expect(containsBlockedTerm('heil hitler')).toBe(true);
    expect(containsBlockedTerm('white power')).toBe(true);
  });

  it('should return false for clean text', () => {
    expect(containsBlockedTerm('hello world')).toBe(false);
    expect(containsBlockedTerm('this is a normal community about programming')).toBe(false);
    expect(containsBlockedTerm('welcome to the tech forum')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(containsBlockedTerm('HEIL HITLER')).toBe(true);
    expect(containsBlockedTerm('White Power')).toBe(true);
    expect(containsBlockedTerm('KKK')).toBe(true);
  });

  it('should detect terms embedded in longer words (substring match)', () => {
    expect(containsBlockedTerm('myfaggotry')).toBe(true);
    expect(containsBlockedTerm('superretarded')).toBe(true);
    expect(containsBlockedTerm('xxxrated')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(containsBlockedTerm('')).toBe(false);
  });

  it('should return false for similar-sounding but non-blocked terms', () => {
    expect(containsBlockedTerm('bigger')).toBe(false);
    expect(containsBlockedTerm('flag')).toBe(false);
    expect(containsBlockedTerm('document')).toBe(false);
  });

  it('should have a non-empty blocklist', () => {
    expect(BLOCKLIST.length).toBeGreaterThan(0);
  });
});
