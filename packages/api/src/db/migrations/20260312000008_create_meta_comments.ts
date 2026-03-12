import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('meta_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('immutable_id').defaultTo(knex.raw('gen_random_uuid()')).notNullable();
    table.uuid('comment_id').notNullable().references('id').inTable('comments').onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('parent_meta_id').nullable().references('id').inTable('meta_comments').onDelete('CASCADE');
    table.text('body').notNullable();
    table.boolean('is_self_eval').defaultTo(false);
    table.jsonb('self_eval_data').nullable();
    table.integer('score').defaultTo(0);
    table.string('content_hash', 64).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.boolean('is_deleted').defaultTo(false);

    table.index(['comment_id']);
    table.index(['author_id']);
  });

  // Partial index for self-eval meta comments
  await knex.raw(`
    CREATE INDEX idx_meta_comments_self_eval
    ON meta_comments (comment_id, is_self_eval)
    WHERE is_self_eval = true
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('meta_comments');
}
