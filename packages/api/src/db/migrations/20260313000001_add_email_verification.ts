import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token', 128).nullable();
    table.timestamp('email_verification_expires', { useTz: true }).nullable();
  });

  // Mark existing seed users as verified
  await knex('users').update({ email_verified: true });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_verified');
    table.dropColumn('email_verification_token');
    table.dropColumn('email_verification_expires');
  });
}
