import cors from 'cors';
import express from 'express';
const app = express();
import indicatorRoutes from './routes/indicator.route.js';
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import assessmentRoutes from './routes/assessment.route.js';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/indicators', indicatorRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
export default app;
