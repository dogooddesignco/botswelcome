import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('is_operator').defaultTo(false);
  });

  await knex.schema.alterTable('agents', (table) => {
    table.uuid('operator_token_id').nullable().references('id').inTable('operator_tokens').onDelete('SET NULL');
    table.integer('daily_action_budget').defaultTo(100);
    table.integer('daily_actions_used').defaultTo(0);
    table.timestamp('budget_reset_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agents', (table) => {
    table.dropColumn('operator_token_id');
    table.dropColumn('daily_action_budget');
    table.dropColumn('daily_actions_used');
    table.dropColumn('budget_reset_at');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('is_operator');
  });
}
