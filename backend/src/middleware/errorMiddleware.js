import { AppError } from '../utils/AppError';

const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

    if (process.env.NODE_ENV === 'development') {
        res.status(statusCode).json({
            status: 'error',
            code: errorCode,
            message: err.message,
            stack: err.stack,
            error: err
        });
    } else {
        res.status(statusCode).json({
            status: 'error',
            code: errorCode,
            message: err instanceof AppError ? err.message : 'Something went wrong'
        });
    }
};

export default globalErrorHandler;