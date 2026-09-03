import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { roomRoutes } from './routes/rooms';
import { eventRoutes } from './routes/events';

const app = new Hono();

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Healthcheck
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount domain routes and chain for AppType
export const routes = app
  .route('', roomRoutes)
  .route('', eventRoutes);

// Export AppType for typed Hono RPC client (hc<AppType>)
export type AppType = typeof routes;

// Serve production frontend assets if available (never intercept /api or /health)
if (process.env.NODE_ENV === 'production') {
  app.use('*', async (c, next) => {
    const path = c.req.path;
    if (path.startsWith('/api/') || path === '/health') {
      return next();
    }
    return serveStatic({ root: './client/dist' })(c, next);
  });
  app.get('*', async (c, next) => {
    const path = c.req.path;
    if (path.startsWith('/api/') || path === '/health') {
      return next();
    }
    return serveStatic({ path: './client/dist/index.html' })(c, next);
  });
}

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
  console.log(`🚀 Scrum Pokr Hono server running on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
