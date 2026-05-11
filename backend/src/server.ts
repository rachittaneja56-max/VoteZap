import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/db';

dotenv.config();

const startServer = async (): Promise<void> => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on('unhandledRejection', (err: unknown) => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    if (err instanceof Error) {
      console.log(err.name, err.message);
    } else {
      console.log(err);
    }
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();
