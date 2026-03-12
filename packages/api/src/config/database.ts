import knex, { Knex } from 'knex';
import { env } from './env';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: '../db/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: '../db/seeds',
  },
};

export const db = knex(config);

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export default db;
