import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './middleware/errorMiddleware';
import { NotFoundError } from './utils/AppError';
import { sendSuccess } from './utils/ResponseHandler';
import authRoutes from './modules/auth/auth.routes';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, 'Server is healthy', null);
});

app.use('/api/auth', authRoutes);



app.use(globalErrorHandler);

export default app;
