import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../src/api-client.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve({ success: true, data }),
    text: () => Promise.resolve(JSON.stringify({ success: true, data })),
  };
}

function mockErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ success: false }),
    text: () => Promise.resolve(body),
  };
}

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new ApiClient('http://localhost:3000', 'bw_agent_testkey123');
  });

  describe('getPosts', () => {
    it('should fetch posts without agent auth', async () => {
      const posts = [{ id: '1', title: 'Test' }];
      mockFetch.mockResolvedValue(mockResponse({ data: posts, pagination: {} }));

      const result = await client.getPosts('new', 10, 1);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts?sort=new&limit=10&page=1',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      // Should NOT include agent API key for public endpoints
      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-Agent-API-Key']).toBeUndefined();

      expect(result.data).toEqual(posts);
    });
  });

  describe('getPost', () => {
    it('should fetch a single post without agent auth', async () => {
      const data = { post: { id: '1' }, comments: [] };
      mockFetch.mockResolvedValue(mockResponse(data));

      const result = await client.getPost('post-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts/post-123',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.post).toEqual({ id: '1' });
    });
  });

  describe('getContext', () => {
    it('should fetch context with agent auth', async () => {
      const data = { post: {}, comments: [], meta_comments: [] };
      mockFetch.mockResolvedValue(mockResponse(data));

      await client.getContext('post-123', 5);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'http://localhost:3000/agents/agent/context/post-123?depth=5&include_meta=true',
      );
      expect(opts.headers['X-Agent-API-Key']).toBe('bw_agent_testkey123');
    });
  });

  describe('createPost', () => {
    it('should create a post with agent auth', async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: 'new-post' }));

      await client.createPost({
        community_id: 'comm-1',
        title: 'Test Post',
        body: 'Hello world',
        post_type: 'text',
      });

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/agents/agent/posts');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-Agent-API-Key']).toBe('bw_agent_testkey123');
      expect(JSON.parse(opts.body)).toEqual({
        community_id: 'comm-1',
        title: 'Test Post',
        body: 'Hello world',
        post_type: 'text',
      });
    });

    it('should include self_eval when provided', async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: 'new-post' }));

      await client.createPost({
        community_id: 'comm-1',
        title: 'Test',
        body: 'Body',
        post_type: 'text',
        self_eval: {
          body: 'Self eval text',
          self_eval_data: {
            confidence: 0.7,
            tone: 'instructive',
            potential_risks: ['risk1'],
            uncertainty_areas: ['area1'],
            intent: 'help',
            limitations: 'none',
          },
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.self_eval).toBeDefined();
      expect(body.self_eval.self_eval_data.confidence).toBe(0.7);
    });
  });

  describe('createComment', () => {
    it('should create a comment with agent auth', async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: 'new-comment' }));

      await client.createComment({
        post_id: 'post-1',
        body: 'Great post!',
      });

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/agents/agent/comments');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({
        post_id: 'post-1',
        body: 'Great post!',
      });
    });

    it('should include parent_id for threaded replies', async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: 'new-comment' }));

      await client.createComment({
        post_id: 'post-1',
        body: 'Reply',
        parent_id: 'comment-1',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.parent_id).toBe('comment-1');
    });
  });

  describe('error handling', () => {
    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(401, 'Unauthorized'));

      await expect(client.getContext('post-1')).rejects.toThrow(
        'API GET /agents/agent/context/post-1?depth=10&include_meta=true failed (401): Unauthorized',
      );
    });
  });
});
