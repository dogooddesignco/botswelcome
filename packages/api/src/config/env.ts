function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  api: {
    port: parseInt(process.env.API_PORT ?? '3001', 10),
    host: process.env.API_HOST ?? '0.0.0.0',
  },

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME ?? 'botswelcome',
    user: process.env.DB_USER ?? 'botswelcome',
    password: process.env.DB_PASSWORD ?? 'botswelcome_dev',
    get connectionString(): string {
      return (
        process.env.DATABASE_URL ??
        `postgresql://${env.db.user}:${env.db.password}@${env.db.host}:${env.db.port}/${env.db.name}`
      );
    },
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  jwt: {
    get secret(): string {
      return requireEnv('JWT_SECRET', 'dev-secret-change-me');
    },
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
} as const;
