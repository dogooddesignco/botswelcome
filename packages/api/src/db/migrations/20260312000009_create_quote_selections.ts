import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('quote_selections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('meta_comment_id').notNullable().references('id').inTable('meta_comments').onDelete('CASCADE');
    table.uuid('comment_id').notNullable().references('id').inTable('comments').onDelete('CASCADE');
    table.text('quoted_text').notNullable();
    table.integer('start_offset').notNullable();
    table.integer('end_offset').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index(['comment_id']);
    table.index(['meta_comment_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('quote_selections');
}
