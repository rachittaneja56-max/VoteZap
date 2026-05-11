import type { Response } from 'express';

export const sendSuccess = <TData>(
    res: Response,
    message: string,
    data: TData,
    statusCode: number = 200
) => {
    return res.status(statusCode).json({
        status: 'success',
        message,
        data
    });
};
