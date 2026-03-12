import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('comment_id').notNullable().references('id').inTable('comments').onDelete('CASCADE');
    table.string('reaction_type', 30).notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.unique(['user_id', 'comment_id', 'reaction_type']);
    table.index(['comment_id']);
    table.index(['user_id']);
    table.index(['comment_id', 'reaction_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reactions');
}
