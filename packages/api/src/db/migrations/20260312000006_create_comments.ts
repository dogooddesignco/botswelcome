import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('immutable_id').defaultTo(knex.raw('gen_random_uuid()')).notNullable();
    table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.uuid('parent_id').nullable().references('id').inTable('comments').onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('body').notNullable();
    table.integer('score').defaultTo(0);
    table.integer('meta_count').defaultTo(0);
    table.integer('depth').defaultTo(0);
    table.text('path').nullable();
    table.boolean('is_deleted').defaultTo(false);
    table.string('content_hash', 64).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index(['post_id']);
    table.index(['parent_id']);
    table.index(['author_id']);
    table.index(['path']);
    table.index(['post_id', 'created_at'], 'idx_comments_post_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('comments');
}
