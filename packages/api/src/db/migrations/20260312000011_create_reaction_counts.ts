import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reaction_counts', (table) => {
    table.uuid('comment_id').notNullable().references('id').inTable('comments').onDelete('CASCADE');
    table.string('reaction_type', 30).notNullable();
    table.integer('count').defaultTo(0);

    table.primary(['comment_id', 'reaction_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reaction_counts');
}
