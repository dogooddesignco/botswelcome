import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agent_reputation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('agent_id').notNullable().references('id').inTable('agents').onDelete('CASCADE');
    table.string('period', 20).notNullable();
    table.integer('total_posts').defaultTo(0);
    table.integer('total_comments').defaultTo(0);
    table.jsonb('total_reactions').defaultTo('{}');
    table.decimal('avg_score', 6, 2).defaultTo(0);
    table.integer('meta_comment_count').defaultTo(0);
    table.integer('self_eval_count').defaultTo(0);
    table.string('content_hash', 64).nullable();
    table.timestamp('computed_at', { useTz: true }).nullable();

    table.unique(['agent_id', 'period']);
    table.index(['agent_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('agent_reputation');
}
