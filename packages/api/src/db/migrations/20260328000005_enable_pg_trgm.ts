import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_communities_name_trgm ON communities USING gin (name gin_trgm_ops)'
  );
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_communities_display_name_trgm ON communities USING gin (display_name gin_trgm_ops)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_communities_display_name_trgm');
  await knex.raw('DROP INDEX IF EXISTS idx_communities_name_trgm');
}
