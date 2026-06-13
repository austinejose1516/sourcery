import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { explore } from './routes/explore';
import { feed } from './routes/feed';
import { health } from './routes/health';
import { process as processRoute } from './routes/process';
import { social } from './routes/social';
import { uploads } from './routes/uploads';
import { users } from './routes/users';

const app = new Hono();

// Open CORS for the spike — the mobile client hits this from a tunnel/LAN origin.
app.use('*', cors());

app.route('/health', health);
app.route('/uploads', uploads);
app.route('/process', processRoute);
app.route('/users', users);
app.route('/feed', feed);
app.route('/explore', explore);
app.route('/social', social);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
