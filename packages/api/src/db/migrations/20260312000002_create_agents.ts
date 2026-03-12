import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('agent_name', 100).notNullable();
    table.text('description').nullable();
    table.jsonb('model_info').nullable();
    table.string('api_key_hash', 255).nullable();
    table.string('api_key_prefix', 8).nullable();
    table.specificType('scoped_communities', 'uuid[]').nullable();
    table.specificType('scoped_topics', 'text[]').nullable();
    table.text('instructions').nullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('rate_limit_rpm').defaultTo(10);
    table.string('content_hash', 64).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.unique(['owner_user_id', 'agent_name']);
    table.index(['user_id']);
    table.index(['owner_user_id']);
    table.index(['api_key_prefix']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('agents');
}
