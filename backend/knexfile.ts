import 'dotenv/config';
import type { Knex } from 'knex';

type EnvName = 'development' | 'staging' | 'production';
type Prefix = '' | 'STAGING_' | 'PROD_';

const prefixes: Record<EnvName, Prefix> = {
  development: '',
  staging: 'STAGING_',
  production: 'PROD_',
};

function connection(prefix: Prefix): Knex.PgConnectionConfig {
  return {
    host: process.env[`${prefix}DB_HOST`],
    port: Number(process.env[`${prefix}DB_PORT`]),
    user: process.env[`${prefix}DB_USER`],
    database: process.env[`${prefix}DB_NAME`],
    password: process.env[`${prefix}DB_PASSWORD`],
  };
}

const pools: Record<EnvName, Knex.PoolConfig | undefined> = {
  development: undefined,
  staging: { min: 2, max: 10 },
  production: { min: 2, max: 10, idleTimeoutMillis: 30000, acquireTimeoutMillis: 60000 },
};

const env = (process.env.NODE_ENV as EnvName) || 'development';
if (!(env in prefixes)) throw new Error(`Unknown NODE_ENV="${env}"`);

const config: Knex.Config = {
  client: 'pg',
  connection: connection(prefixes[env]),
  pool: pools[env],
  migrations: {
    directory: './v1/migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
  seeds: { directory: './v1/seeds', extension: 'ts', loadExtensions: ['.ts'] },
};

export default config;
