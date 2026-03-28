import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('reporter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('target_type', 20).notNullable();
    table.uuid('target_id').notNullable();
    table.string('reason', 30).notNullable();
    table.text('description').nullable();
    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('auto_action', 20).notNullable().defaultTo('none');
    table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index(['target_type', 'target_id']);
    table.index(['status']);
    table.index(['reporter_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reports');
}
