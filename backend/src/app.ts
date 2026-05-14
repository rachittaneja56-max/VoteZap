import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import globalErrorHandler from './middleware/errorMiddleware';
import { NotFoundError } from './utils/AppError';
import { sendSuccess } from './utils/ResponseHandler';
import authRoutes from './modules/auth/auth.routes';
import pollRoutes from './modules/polls/poll.routes';
import responseRoutes from './modules/responses/response.routes';

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, 'Server is healthy', null);
});

app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/responses', responseRoutes);


app.use((req: Request, res: Response, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

app.use(globalErrorHandler);

export default app;
