import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('is_admin').defaultTo(false);
  });

  await knex.schema.alterTable('posts', (table) => {
    table.boolean('is_hidden').defaultTo(false);
  });

  await knex.schema.alterTable('comments', (table) => {
    table.boolean('is_hidden').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('comments', (table) => {
    table.dropColumn('is_hidden');
  });
  await knex.schema.alterTable('posts', (table) => {
    table.dropColumn('is_hidden');
  });
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('is_admin');
  });
}
