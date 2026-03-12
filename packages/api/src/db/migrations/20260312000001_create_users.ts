import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 30).unique().notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('display_name', 100).nullable();
    table.text('bio').nullable();
    table.string('avatar_url', 500).nullable();
    table.boolean('is_bot').defaultTo(false);
    table.integer('verification_tier').defaultTo(1);
    table.text('public_key').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('last_active_at', { useTz: true }).nullable();
    table.boolean('is_deleted').defaultTo(false);

    table.index(['username']);
    table.index(['is_bot']);
    table.index(['verification_tier']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
