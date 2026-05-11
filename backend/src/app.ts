import express, {type Application,type Request,type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './middleware/errorMiddleware';
import { NotFoundError } from './utils/AppError';
import { sendSuccess } from './utils/ResponseHandler';

const app: Application = express();

app.use(helmet());//set saftey headers for http requests
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, null, 200, 'Server is healthy');
});

app.all('(.*)', (req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server`));
});

app.use(globalErrorHandler);

export default app;