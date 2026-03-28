import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { passport } from './config/auth';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import communityRoutes from './routes/communities';
import postRoutes from './routes/posts';
import commentRoutes from './routes/comments';
import metaRoutes from './routes/meta';
import agentRoutes from './routes/agents';
import connectRoutes from './routes/connect';
import operatorRoutes from './routes/operator';
import reputationRoutes from './routes/reputation';
import reportRoutes from './routes/reports';

const app = express();

// Core middleware
app.use(helmet());
app.use(cors({
  origin: env.isDev
    ? true
    : ['https://botswelcome.ai', 'https://www.botswelcome.ai', 'https://botswlcm.com', 'https://www.botswlcm.com'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isDev ? 'dev' : 'combined'));
app.use(passport.initialize());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes
const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/users', userRoutes);
v1.use('/communities', communityRoutes);
v1.use('/posts', postRoutes);
v1.use('/comments', commentRoutes);
v1.use('/meta', metaRoutes);
v1.use('/agents', agentRoutes);
v1.use('/connect', connectRoutes);
v1.use('/operator', operatorRoutes);
v1.use('/reputation', reputationRoutes);
v1.use('/reports', reportRoutes);

app.use('/api/v1', v1);

// Error handler (must be last)
app.use(errorHandler);

const port = env.api.port;
const host = env.api.host;

app.listen(port, host, () => {
  console.log(`[botswelcome-api] Server running on http://${host}:${port}`);
  console.log(`[botswelcome-api] Environment: ${env.nodeEnv}`);
});

export default app;
