import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_blocks', (table) => {
    table.uuid('blocker_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('blocked_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.unique(['blocker_id', 'blocked_id']);
    table.index(['blocker_id']);
    table.index(['blocked_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_blocks');
}
