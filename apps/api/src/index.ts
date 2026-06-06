import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { health } from './routes/health';
import { process as processRoute } from './routes/process';
import { uploads } from './routes/uploads';
import { users } from './routes/users';

const app = new Hono();

// Open CORS for the spike — the mobile client hits this from a tunnel/LAN origin.
app.use('*', cors());

app.route('/health', health);
app.route('/uploads', uploads);
app.route('/process', processRoute);
app.route('/users', users);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
