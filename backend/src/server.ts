import app from './app';
import { env } from './config/env';
import connectDB from './config/db';
import { initSocket } from './sockets/socket.setup';

const startServer = async (): Promise<void> => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });

  initSocket(server);

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
