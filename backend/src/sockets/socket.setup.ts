import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: 'https://votezap.rachittaneja.in',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    const joinPollRoom = (pollId: string) => {
      if (!pollId || typeof pollId !== 'string') {
        return;
      }
      void socket.join(pollId);
      console.log(`Socket ${socket.id} joined room: ${pollId}`);
    };

    socket.on('join-poll-room', joinPollRoom);
    socket.on('joinRoom', joinPollRoom);

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
  io.to(pollId).emit('analyticsUpdate', responseData);
};
