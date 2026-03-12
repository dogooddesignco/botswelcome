import { createHash } from 'crypto';

export class HashService {
  /**
   * Compute a SHA-256 hash of the given content.
   * Used for content integrity verification on posts, comments, and meta-comments.
   */
  static sha256(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Compute a content hash from a post's title and body.
   */
  static hashPostContent(title: string, body: string): string {
    return HashService.sha256(`${title}\n${body}`);
  }

  /**
   * Compute a content hash from a comment's body.
   */
  static hashCommentContent(body: string): string {
    return HashService.sha256(body);
  }

  /**
   * Verify that content matches its expected hash.
   */
  static verify(content: string, expectedHash: string): boolean {
    return HashService.sha256(content) === expectedHash;
  }
}
