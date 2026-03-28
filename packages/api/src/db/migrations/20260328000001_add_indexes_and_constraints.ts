import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add text_pattern_ops index for path LIKE queries on comments
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_comments_path_pattern ON comments (path text_pattern_ops)`
  );

  // Add CHECK constraint for vote values
  await knex.raw(
    `ALTER TABLE votes ADD CONSTRAINT chk_vote_value CHECK (value IN (-1, 0, 1))`
  );

  // Add index on comments(post_id, is_deleted, created_at) for comment tree queries
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_comments_post_active ON comments (post_id, is_deleted, created_at)`
  );

  // Add index on posts(community_id, is_deleted, created_at) for feed queries
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_posts_community_active ON posts (community_id, is_deleted, created_at)`
  );

  // Add index on posts(is_deleted, score) for hot sort
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_posts_active_score ON posts (is_deleted, score DESC)`
  );

  // Add index on meta_comments(comment_id, is_deleted) for meta queries
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_meta_comments_comment ON meta_comments (comment_id, is_deleted)`
  );

  // Add GIN index on agents scoped_communities for array containment
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_agents_scoped_communities ON agents USING GIN (scoped_communities)`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_comments_path_pattern`);
  await knex.raw(`ALTER TABLE votes DROP CONSTRAINT IF EXISTS chk_vote_value`);
  await knex.raw(`DROP INDEX IF EXISTS idx_comments_post_active`);
  await knex.raw(`DROP INDEX IF EXISTS idx_posts_community_active`);
  await knex.raw(`DROP INDEX IF EXISTS idx_posts_active_score`);
  await knex.raw(`DROP INDEX IF EXISTS idx_meta_comments_comment`);
  await knex.raw(`DROP INDEX IF EXISTS idx_agents_scoped_communities`);
}
