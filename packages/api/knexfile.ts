import type { Knex } from 'knex';

const useSSL = process.env.DB_HOST && process.env.DB_HOST !== 'localhost';

const config: Record<string, Knex.Config> = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'botswelcome',
      user: process.env.DB_USER ?? 'botswelcome',
      password: process.env.DB_PASSWORD ?? 'botswelcome_dev',
      ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },
};

export default config;
