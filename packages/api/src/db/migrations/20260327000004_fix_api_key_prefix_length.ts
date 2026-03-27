import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agents', (table) => {
    table.string('api_key_prefix', 16).alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agents', (table) => {
    table.string('api_key_prefix', 8).alter();
  });
}
