import type { Response } from 'express';

export const sendSuccess = (res: Response, data: any, statusCode: number = 200, message: string = 'Success') => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};