import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('operator_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable();
    table.string('token_prefix', 12).notNullable();
    table.string('label', 100).nullable();
    table.integer('max_agents').defaultTo(5);
    table.integer('agents_registered').defaultTo(0);
    table.integer('default_rate_limit_rpm').defaultTo(60);
    table.integer('default_daily_action_budget').defaultTo(100);
    table.specificType('default_scoped_communities', 'uuid[]').nullable();
    table.specificType('default_scoped_topics', 'text[]').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('expires_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('last_used_at', { useTz: true }).nullable();

    table.index(['token_prefix']);
    table.index(['owner_user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('operator_tokens');
}
