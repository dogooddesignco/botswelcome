import { ApiClient, type Post, type Comment, type SelfEvalData } from './api-client.js';
import { askClaude, askClaudeJson } from './claude.js';
import type { Persona } from './personas.js';

export type StrategyType = 'new-post' | 'reply-to-post' | 'reply-to-comment';

export interface StrategyResult {
  action: 'posted' | 'commented' | 'skipped';
  details: string;
}

interface GeneratedPost {
  title: string;
  body: string;
  post_type: 'text' | 'question';
}

interface GeneratedSelfEval {
  body: string;
  self_eval_data: SelfEvalData;
}

/** Pick a strategy based on weighted random selection */
export function pickStrategy(): StrategyType {
  const roll = Math.random();
  if (roll < 0.30) return 'new-post';
  if (roll < 0.85) return 'reply-to-post';
  return 'reply-to-comment';
}

/** Create a new discussion post */
export async function executeNewPost(
  client: ApiClient,
  persona: Persona,
  dryRun: boolean,
): Promise<StrategyResult> {
  const communityId =
    persona.communities[Math.floor(Math.random() * persona.communities.length)];

  // Generate a post
  const post = await askClaudeJson<GeneratedPost>(
    persona.systemPrompt,
    `Create a new discussion post for this community. Think about what would spark genuine, interesting conversation.

Return your response as JSON with this exact format:
{
  "title": "your post title",
  "body": "your post body (can use markdown)",
  "post_type": "text" or "question"
}

If you really can't think of anything worthwhile to post, return:
{"title": "SKIP", "body": "SKIP", "post_type": "text"}`,
  );

  if (post.title === 'SKIP') {
    return { action: 'skipped', details: `${persona.name} had nothing to post` };
  }

  if (dryRun) {
    return {
      action: 'skipped',
      details: `[DRY RUN] ${persona.name} would post: "${post.title}":\n${post.body}`,
    };
  }

  // Generate self-eval
  const selfEval = await generateSelfEval(persona, `Post: "${post.title}"\n\n${post.body}`);

  await client.createPost({
    community_id: communityId,
    title: post.title,
    body: post.body,
    post_type: post.post_type,
    self_eval: selfEval,
  });

  return {
    action: 'posted',
    details: `${persona.name} created post: "${post.title}"`,
  };
}

/** Reply to a recent post */
export async function executeReplyToPost(
  client: ApiClient,
  persona: Persona,
  dryRun: boolean,
): Promise<StrategyResult> {
  // Fetch recent posts
  const feed = await client.getPosts('new', 15);
  const posts = feed.data;

  if (posts.length === 0) {
    return { action: 'skipped', details: 'No posts to reply to' };
  }

  // Filter to posts in communities this bot can access
  const eligiblePosts = posts.filter((p) =>
    persona.communities.includes(p.community_id),
  );

  if (eligiblePosts.length === 0) {
    return {
      action: 'skipped',
      details: `${persona.name} has no eligible posts in its communities`,
    };
  }

  // Pick a random post, weighted toward newer ones
  const post = eligiblePosts[Math.floor(Math.random() * Math.min(5, eligiblePosts.length))];

  // Get discussion context
  const context = await client.getContext(post.id);

  const contextSummary = formatContext(context.post, context.comments);

  const reply = await askClaude(
    persona.systemPrompt,
    `Here's a discussion you might want to contribute to:

${contextSummary}

Write a reply to this post. Be natural and conversational. Add genuine value — don't just agree or restate what's been said.

If you have nothing useful to add, respond with just: SKIP

Otherwise, write your comment directly (no JSON wrapper, just the comment text in markdown).`,
  );

  if (reply.trim() === 'SKIP') {
    return {
      action: 'skipped',
      details: `${persona.name} skipped post "${post.title}"`,
    };
  }

  if (dryRun) {
    return {
      action: 'skipped',
      details: `[DRY RUN] ${persona.name} would reply to "${post.title}":\n${reply}`,
    };
  }

  const selfEval = await generateSelfEval(persona, `Reply to "${post.title}":\n\n${reply}`);

  await client.createComment({
    post_id: post.id,
    body: reply,
    self_eval: selfEval,
  });

  return {
    action: 'commented',
    details: `${persona.name} replied to "${post.title}"`,
  };
}

/** Reply to a specific comment in a thread */
export async function executeReplyToComment(
  client: ApiClient,
  persona: Persona,
  dryRun: boolean,
): Promise<StrategyResult> {
  // Fetch recent posts
  const feed = await client.getPosts('new', 10);
  const posts = feed.data;

  // Find a post with comments in an eligible community
  const eligiblePosts = posts.filter(
    (p) =>
      persona.communities.includes(p.community_id) && p.comment_count > 0,
  );

  if (eligiblePosts.length === 0) {
    return {
      action: 'skipped',
      details: `${persona.name} found no posts with comments to reply to`,
    };
  }

  const post = eligiblePosts[Math.floor(Math.random() * Math.min(3, eligiblePosts.length))];
  const context = await client.getContext(post.id);

  if (context.comments.length === 0) {
    return { action: 'skipped', details: 'Post had no comments' };
  }

  // Pick a comment to reply to (prefer non-bot comments, but allow any)
  const targetComments = context.comments.filter(
    (c) => c.depth < 3, // Don't go too deep
  );

  if (targetComments.length === 0) {
    return { action: 'skipped', details: 'No suitable comments to reply to' };
  }

  const targetComment =
    targetComments[Math.floor(Math.random() * targetComments.length)];

  const contextSummary = formatContext(context.post, context.comments);

  const reply = await askClaude(
    persona.systemPrompt,
    `Here's a discussion thread:

${contextSummary}

You're replying specifically to this comment by ${targetComment.author?.username ?? 'someone'}:
"${targetComment.body}"

Write a reply to this specific comment. Be natural and conversational.

If you have nothing useful to add, respond with just: SKIP

Otherwise, write your comment directly (no JSON wrapper, just the comment text in markdown).`,
  );

  if (reply.trim() === 'SKIP') {
    return {
      action: 'skipped',
      details: `${persona.name} skipped comment by ${targetComment.author?.username ?? 'unknown'}`,
    };
  }

  if (dryRun) {
    return {
      action: 'skipped',
      details: `[DRY RUN] ${persona.name} would reply to comment by ${targetComment.author?.username ?? 'unknown'}:\n${reply}`,
    };
  }

  const selfEval = await generateSelfEval(persona, `Reply to comment:\n\n${reply}`);

  await client.createComment({
    post_id: post.id,
    body: reply,
    parent_id: targetComment.id,
    self_eval: selfEval,
  });

  return {
    action: 'commented',
    details: `${persona.name} replied to ${targetComment.author?.username ?? 'unknown'}'s comment on "${post.title}"`,
  };
}

function formatContext(post: Post, comments: Comment[]): string {
  let ctx = `Post: "${post.title}" by ${post.author?.username ?? 'unknown'} (${post.post_type})\n`;
  ctx += `---\n${post.body}\n---\n`;

  if (comments.length > 0) {
    ctx += `\nComments (${comments.length}):\n`;
    for (const c of comments.slice(0, 15)) {
      const indent = '  '.repeat(c.depth);
      const author = c.author?.username ?? 'unknown';
      const botTag = c.author?.is_bot ? ' [bot]' : '';
      ctx += `${indent}- ${author}${botTag}: ${c.body.slice(0, 300)}${c.body.length > 300 ? '...' : ''}\n`;
    }
  }

  return ctx;
}

async function generateSelfEval(
  persona: Persona,
  content: string,
): Promise<GeneratedSelfEval> {
  const evalData = await askClaudeJson<SelfEvalData>(
    `You are generating a self-evaluation for an AI bot's response. Be honest and calibrated.`,
    `The bot "${persona.name}" just generated this content:

${content}

Generate a self-evaluation as JSON:
{
  "confidence": <0-1 number, how confident the bot should be in this response>,
  "tone": "${persona.selfEvalDefaults.tone}",
  "potential_risks": ["list of potential risks or downsides of this response"],
  "uncertainty_areas": ["areas where the bot is unsure or could be wrong"],
  "intent": "what the bot was trying to accomplish",
  "limitations": "known limitations of this response"
}`,
  );

  return {
    body: `Self-evaluation: confidence ${evalData.confidence}, tone: ${evalData.tone}. ${evalData.intent}`,
    self_eval_data: evalData,
  };
}
