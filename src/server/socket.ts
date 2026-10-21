import type { Socket } from 'socket.io';
import type { Ack } from '../lib/types';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../lib/socket-events';
import { REACTION_EMOJIS } from '../lib/game-config';
import type { GameServer } from './game-server';
import { allow } from './rate-limit';
import {
  chatSchema,
  cosmeticSchema,
  createRoomSchema,
  joinRoomSchema,
  reactionSchema,
  resumeSchema,
  settingsSchema,
  snapshotSchema,
  strokeEndSchema,
  strokePointsSchema,
  strokeStartSchema,
  strokeUndoSchema,
  targetPlayerSchema,
  wordChooseSchema,
} from './schemas';
import { logger } from './logger';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function reply<T>(ack: ((result: Ack<T>) => void) | undefined, result: Ack<T>): void {
  if (typeof ack === 'function') ack(result);
}

function fail(message: string): Ack<never> {
  return { ok: false, error: message };
}

export function registerSocketHandlers(socket: GameSocket, game: GameServer): void {
  const ip = socket.handshake.address || 'unknown';

  const context = () => {
    const room = game.getRoom(socket.data.roomCode);
    const player = game.getPlayer(room, socket.data.playerId);
    if (!room || !player) return null;
    return { room, player };
  };

  socket.on('room:create', (payload, ack) => {
    if (!allow(`create:${ip}`, 6, 60_000)) {
      return reply(ack, fail('Too many rooms created. Please wait a minute.'));
    }
    const parsed = createRoomSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, fail('Invalid room details.'));
    reply(
      ack,
      game.createRoom(
        socket,
        parsed.data.nickname,
        parsed.data.avatarSeed,
        parsed.data.cosmetic,
        ip,
      ),
    );
  });

  socket.on('room:join', (payload, ack) => {
    if (!allow(`join:${ip}`, 20, 60_000)) {
      return reply(ack, fail('Too many join attempts. Please wait a moment.'));
    }
    const parsed = joinRoomSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, fail('Invalid room details.'));
    reply(
      ack,
      game.joinRoom(
        socket,
        parsed.data.code,
        parsed.data.nickname,
        parsed.data.avatarSeed,
        parsed.data.cosmetic,
      ),
    );
  });

  socket.on('room:resume', (payload, ack) => {
    const parsed = resumeSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, fail('Invalid session.'));
    reply(ack, game.resumeRoom(socket, parsed.data.code, parsed.data.playerId, parsed.data.token));
  });

  socket.on('room:leave', (ack) => {
    reply(ack, game.leaveRoom(socket));
  });

  socket.on('room:update-settings', (payload, ack) => {
    const ctx = context();
    if (!ctx) return reply(ack, fail('Join a room first.'));
    const parsed = settingsSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, fail('Invalid settings.'));
    reply(ack, game.updateSettings(ctx.room, ctx.player.id, parsed.data.settings));
  });

  socket.on('room:kick', (payload, ack) => {
    const ctx = context();
    if (!ctx) return reply(ack, fail('Join a room first.'));
    const parsed = targetPlayerSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, fail('Invalid player.'));
    reply(ack, game.kick(ctx.room, ctx.player.id, parsed.data.playerId));
  });

  socket.on('room:transfer-host', (payload, ack) => {
    const ctx = context();
    if (!ctx) return reply(ack, fail('Join a room first.'));
    const parsed = targetPlayerSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, fail('Invalid player.'));
    reply(ack, game.transferHost(ctx.room, ctx.player.id, parsed.data.playerId));
  });

  socket.on('game:start', (ack) => {
    const ctx = context();
    if (!ctx) return reply(ack, fail('Join a room first.'));
    reply(ack, game.start(ctx.room, ctx.player.id));
  });

  socket.on('game:rematch', (ack) => {
    const ctx = context();
    if (!ctx) return reply(ack, fail('Join a room first.'));
    reply(ack, game.rematch(ctx.room, ctx.player.id));
  });

  socket.on('game:to-lobby', (ack) => {
    const ctx = context();
    if (!ctx) return reply(ack, fail('Join a room first.'));
    reply(ack, game.toLobby(ctx.room, ctx.player.id));
  });

  socket.on('word:choose', (payload, ack) => {
    const ctx = context();
    if (!ctx) return reply(ack, fail('Join a room first.'));
    const parsed = wordChooseSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, fail('Invalid word.'));
    reply(ack, game.chooseWord(ctx.room, ctx.player.id, parsed.data.word));
  });

  socket.on('stroke:start', (payload) => {
    const ctx = context();
    if (!ctx) return;
    if (!allow(`stroke:${socket.id}`, 240, 2_000)) return;
    const parsed = strokeStartSchema.safeParse(payload);
    if (!parsed.success) return;
    game.startStroke(ctx.room, ctx.player.id, {
      ...parsed.data.stroke,
      playerId: ctx.player.id,
    });
  });

  socket.on('stroke:points', (payload) => {
    const ctx = context();
    if (!ctx) return;
    if (!allow(`points:${socket.id}`, 200, 2_000)) return;
    const parsed = strokePointsSchema.safeParse(payload);
    if (!parsed.success) return;
    game.appendStrokePoints(ctx.room, ctx.player.id, parsed.data.id, parsed.data.points);
  });

  socket.on('stroke:end', (payload) => {
    const ctx = context();
    if (!ctx) return;
    const parsed = strokeEndSchema.safeParse(payload);
    if (!parsed.success) return;
    game.endStroke(ctx.room, ctx.player.id, parsed.data.id);
  });

  socket.on('stroke:undo', (payload) => {
    const ctx = context();
    if (!ctx) return;
    const parsed = strokeUndoSchema.safeParse(payload);
    if (!parsed.success) return;
    game.undoStroke(ctx.room, ctx.player.id, parsed.data.id);
  });

  socket.on('canvas:clear', () => {
    const ctx = context();
    if (!ctx) return;
    game.clearCanvas(ctx.room, ctx.player.id);
  });

  socket.on('canvas:snapshot', (payload) => {
    const ctx = context();
    if (!ctx) return;
    if (!allow(`snapshot:${socket.id}`, 10, 10_000)) return;
    const parsed = snapshotSchema.safeParse(payload);
    if (!parsed.success) return;
    game.setSnapshot(ctx.room, ctx.player.id, parsed.data.dataUrl);
  });

  socket.on('player:cosmetic', (payload) => {
    const ctx = context();
    if (!ctx) return;
    if (!allow(`cosmetic:${socket.id}`, 6, 10_000)) return;
    const parsed = cosmeticSchema.safeParse(payload);
    if (!parsed.success) return;
    game.setCosmetic(ctx.room, ctx.player.id, parsed.data.cosmetic);
  });

  socket.on('chat:send', (payload) => {
    const ctx = context();
    if (!ctx) return;
    if (!allow(`chat:${socket.id}`, 7, 2_500)) {
      socket.emit('notification', { message: 'Slow down a little!', kind: 'error' });
      return;
    }
    const parsed = chatSchema.safeParse(payload);
    if (!parsed.success) return;
    game.chat(ctx.room, ctx.player.id, parsed.data.text, parsed.data.quick ?? false);
  });

  socket.on('reaction:send', (payload) => {
    const ctx = context();
    if (!ctx) return;
    if (!allow(`reaction:${socket.id}`, 5, 2_000)) return;
    const parsed = reactionSchema.safeParse(payload);
    if (!parsed.success) return;
    if (!(REACTION_EMOJIS as readonly string[]).includes(parsed.data.emoji)) return;
    game.reaction(ctx.room, ctx.player.id, parsed.data.emoji);
  });

  socket.on('ping:rtt', (sentAt, ack) => {
    if (typeof ack === 'function') ack(Date.now());
    void sentAt;
  });

  socket.on('disconnect', (reason) => {
    logger.debug({ reason, socketId: socket.id }, 'socket disconnected');
    game.disconnect(socket);
  });
}
