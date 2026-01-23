import cors from 'cors';
import express from 'express';
const app = express();
import indicatorRoutes from './routes/indicator.route.js';
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import assessmentRoutes from './routes/assessment.route.js';
import referralRoutes from './routes/referral.route.js';
import { UserService } from './service/user.service.js';
import GlobalErrorHandler from './Errors/globalErrorHandler.js';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.use('/test', async (_req, res) => {
  const userService = new UserService();
  const healthWoker = await userService.findSocialHealthWorkerByVillage('rutenga');
  const healthWoker2 = await userService.findSocialHealthWorkerByVillage('ruvumera');

  res.json({ healthWoker, healthWoker2 });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/indicators', indicatorRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/referrals', referralRoutes);

app.all('/{*any}', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  GlobalErrorHandler.getInstance().handleError(err, req, res, next);
});
export default app;
