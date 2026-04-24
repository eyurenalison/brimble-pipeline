import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { runMigrations } from './db/client';
import { apiError } from './lib/api-error';
import deploymentsRoute from './routes/deployments';
import logsRoute from './routes/logs';

await runMigrations();

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/api/deployments', logsRoute);
app.route('/api/deployments', deploymentsRoute);

app.notFound((c) => c.json(apiError('NOT_FOUND', 'Route not found'), 404));

app.onError((error, c) => {
  console.error(error);
  return c.json(apiError('INTERNAL_ERROR', 'Internal server error'), 500);
});

export default {
  idleTimeout: 255,
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch,
};
