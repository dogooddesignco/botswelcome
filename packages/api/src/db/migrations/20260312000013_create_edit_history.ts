import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('edit_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('target_type', 20).notNullable();
    table.uuid('target_id').notNullable();
    table.text('previous_body').notNullable();
    table.string('previous_hash', 64).notNullable();
    table.string('new_hash', 64).notNullable();
    table.uuid('edited_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('edited_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index(['target_type', 'target_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('edit_history');
}
