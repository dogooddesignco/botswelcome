import { describe, it, expect } from 'vitest';

/**
 * Test the search query sanitization logic from PostService.search().
 *
 * The escape pattern from postService.ts (line 190):
 *   const searchTerm = `%${query.replace(/[%_]/g, '\\$&')}%`;
 *
 * This escapes SQL LIKE wildcards:
 *   % -> \%
 *   _ -> \_
 * Then wraps the result with % on both sides for a LIKE "%...%" query.
 */
function sanitizeSearchTerm(query: string): string {
  return `%${query.replace(/[%_]/g, '\\$&')}%`;
}

describe('Search Query Sanitization', () => {
  it('should wrap a plain query with % wildcards', () => {
    expect(sanitizeSearchTerm('hello')).toBe('%hello%');
  });

  it('should escape % characters in the query', () => {
    expect(sanitizeSearchTerm('100%')).toBe('%100\\%%');
  });

  it('should escape _ characters in the query', () => {
    expect(sanitizeSearchTerm('snake_case')).toBe('%snake\\_case%');
  });

  it('should escape both % and _ in the same query', () => {
    expect(sanitizeSearchTerm('50%_discount')).toBe('%50\\%\\_discount%');
  });

  it('should handle multiple % characters', () => {
    expect(sanitizeSearchTerm('a%b%c')).toBe('%a\\%b\\%c%');
  });

  it('should handle multiple _ characters', () => {
    expect(sanitizeSearchTerm('a_b_c')).toBe('%a\\_b\\_c%');
  });

  it('should not escape other special characters', () => {
    expect(sanitizeSearchTerm("hello world! @#$^&*()")).toBe("%hello world! @#$^&*()%");
  });

  it('should handle empty query', () => {
    expect(sanitizeSearchTerm('')).toBe('%%');
  });

  it('should handle query that is just %', () => {
    expect(sanitizeSearchTerm('%')).toBe('%\\%%');
  });

  it('should handle query that is just _', () => {
    expect(sanitizeSearchTerm('_')).toBe('%\\_%');
  });

  it('should handle query with consecutive special chars', () => {
    expect(sanitizeSearchTerm('%%__')).toBe('%\\%\\%\\_\\_%');
  });

  it('should preserve normal text around escaped characters', () => {
    expect(sanitizeSearchTerm('before%after')).toBe('%before\\%after%');
  });

  it('should handle realistic search queries', () => {
    expect(sanitizeSearchTerm('node.js')).toBe('%node.js%');
    expect(sanitizeSearchTerm('C++')).toBe('%C++%');
    expect(sanitizeSearchTerm('user-input')).toBe('%user-input%');
  });

  it('should handle backslash in query (not a LIKE special char)', () => {
    // Backslash is not % or _, so it passes through unescaped by this function
    expect(sanitizeSearchTerm('path\\to\\file')).toBe('%path\\to\\file%');
  });
});
