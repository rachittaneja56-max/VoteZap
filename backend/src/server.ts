import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/db';

dotenv.config();

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on('unhandledRejection', (err: any) => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();