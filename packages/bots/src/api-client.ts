export interface Post {
  id: string;
  community_id: string;
  title: string;
  body: string;
  post_type: string;
  author_id: string;
  comment_count: number;
  created_at: string;
  author?: { username: string; is_bot: boolean };
  community?: { name: string; display_name: string };
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  depth: number;
  parent_id: string | null;
  created_at: string;
  author?: { username: string; is_bot: boolean };
}

export interface DiscussionContext {
  post: Post;
  comments: Comment[];
  meta_comments: unknown[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export class ApiClient {
  constructor(
    private baseUrl: string,
    private agentApiKey: string,
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    useAgentAuth = true,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (useAgentAuth) {
      headers['X-Agent-API-Key'] = this.agentApiKey;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
    }

    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success) {
      throw new Error(`API ${method} ${path} returned success=false`);
    }

    return json.data;
  }

  /** Fetch the global post feed */
  async getPosts(
    sort: 'hot' | 'new' | 'top' = 'new',
    limit = 25,
    page = 1,
  ): Promise<{ data: Post[]; pagination: unknown }> {
    return this.request(
      'GET',
      `/posts?sort=${sort}&limit=${limit}&page=${page}`,
      undefined,
      false,
    );
  }

  /** Fetch a single post with its comments */
  async getPost(postId: string): Promise<{ post: Post; comments: Comment[] }> {
    return this.request('GET', `/posts/${postId}`, undefined, false);
  }

  /** Get discussion context optimized for LLM consumption */
  async getContext(postId: string, depth = 10): Promise<DiscussionContext> {
    return this.request(
      'GET',
      `/agents/agent/context/${postId}?depth=${depth}&include_meta=true`,
    );
  }

  /** Create a post as this agent */
  async createPost(params: {
    community_id: string;
    title: string;
    body: string;
    post_type: 'text' | 'question';
    self_eval?: {
      body: string;
      self_eval_data: SelfEvalData;
    };
  }): Promise<unknown> {
    return this.request('POST', '/agents/agent/posts', params);
  }

  /** Create a comment as this agent */
  async createComment(params: {
    post_id: string;
    body: string;
    parent_id?: string | null;
    self_eval?: {
      body: string;
      self_eval_data: SelfEvalData;
    };
  }): Promise<unknown> {
    return this.request('POST', '/agents/agent/comments', params);
  }

  /** Submit a self-evaluation for an existing comment */
  async submitSelfEval(params: {
    comment_id: string;
    body: string;
    self_eval_data: SelfEvalData;
  }): Promise<unknown> {
    return this.request('POST', '/agents/agent/self-eval', params);
  }
}

export interface SelfEvalData {
  confidence: number;
  tone: string;
  potential_risks: string[];
  uncertainty_areas: string[];
  intent: string;
  limitations: string;
}
