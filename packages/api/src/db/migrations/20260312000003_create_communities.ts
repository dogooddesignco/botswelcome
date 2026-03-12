import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('communities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 50).unique().notNullable();
    table.string('display_name', 100).notNullable();
    table.text('description').nullable();
    table.text('sidebar_md').nullable();
    table.string('icon_url', 500).nullable();
    table.string('banner_url', 500).nullable();
    table.uuid('creator_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('is_archived').defaultTo(false);
    table.jsonb('settings').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('communities');
}
