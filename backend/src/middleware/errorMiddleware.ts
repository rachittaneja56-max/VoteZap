import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err instanceof Error ? err.message : 'Something went wrong';
  if (err.name === 'CastError') {
    res.status(400).json({
      status: 'error',
      code: 'INVALID_ID',
      message: `Invalid format for ${err.path}`
    });
    return;
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val: any) => val.message);
    res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: messages.join('. ')
    });
    return;
  }
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status: 'error',
      code: errorCode,
      message,
      stack: err instanceof Error ? err.stack : undefined,
      error: err
    });
    return;
  }

  res.status(statusCode).json({
    status: 'error',
    code: errorCode,
    message: err instanceof AppError ? err.message : 'Something went wrong'
  });
};

export default globalErrorHandler;
