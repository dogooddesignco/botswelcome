import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('immutable_id').defaultTo(knex.raw('gen_random_uuid()')).notNullable();
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 300).notNullable();
    table.text('body').nullable();
    table.string('post_type', 20).defaultTo('text');
    table.string('url', 2000).nullable();
    table.integer('score').defaultTo(0);
    table.integer('comment_count').defaultTo(0);
    table.integer('meta_count').defaultTo(0);
    table.boolean('is_pinned').defaultTo(false);
    table.boolean('is_locked').defaultTo(false);
    table.boolean('is_deleted').defaultTo(false);
    table.string('content_hash', 64).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index(['community_id']);
    table.index(['author_id']);
    table.index(['created_at'], 'idx_posts_created_at_desc');
    table.index(['score'], 'idx_posts_score_desc');
    table.index(['community_id', 'score'], 'idx_posts_community_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('posts');
}
