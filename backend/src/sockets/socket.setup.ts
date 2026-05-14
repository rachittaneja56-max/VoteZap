import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // note: Adjust to frontend origin in production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('join-poll-room', (pollId: string) => {
      socket.join(pollId);
      console.log(`Socket ${socket.id} joined room: ${pollId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const emitNewResponse = (pollId: string, responseData: any): void => {
  if (!io) {
    console.error('Socket.io has not been initialized');
    return;
  }
  io.to(pollId).emit('new-response', responseData);
};
