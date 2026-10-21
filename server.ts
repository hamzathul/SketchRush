import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { GameServer } from './src/server/game-server';
import { registerSocketHandlers } from './src/server/socket';
import { setGameServer } from './src/server/state';
import { logger } from './src/server/logger';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './src/lib/socket-events';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const hostname = '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((request, response) => {
  handle(request, response);
});

// Keep these above typical proxy idle timeouts (Render's proxy included).
httpServer.keepAliveTimeout = 65_000;
httpServer.headersTimeout = 66_000;

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  serveClient: false,
  maxHttpBufferSize: 1_000_000,
  pingInterval: 20_000,
  pingTimeout: 25_000,
});

const game = new GameServer(io);
setGameServer(game);

io.on('connection', (socket) => {
  registerSocketHandlers(socket, game);
});

io.engine.on('connection_error', (error) => {
  logger.warn({ code: error.code, message: error.message }, 'socket connection error');
});

httpServer.listen(port, hostname, () => {
  logger.info({ port, dev, rooms: game.roomCount }, 'SketchRush server listening');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 8_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
