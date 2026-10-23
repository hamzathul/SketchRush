'use client';

import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type { ClientToServerEvents, ServerToClientEvents } from './socket-events';
import { useGameStore } from './store';
import { clearSession } from './session';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let bound = false;

function startPing(socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>): void {
  if (pingTimer) clearInterval(pingTimer);
  const ping = () => {
    if (!socketInstance.connected) return;
    const sentAt = Date.now();
    socketInstance.emit('ping:rtt', sentAt, () => {
      useGameStore.getState().setPing(Date.now() - sentAt);
    });
  };
  ping();
  pingTimer = setInterval(ping, 6_000);
}

function stopPing(): void {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

function bind(socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>): void {
  if (bound) return;
  bound = true;

  const store = () => useGameStore.getState();

  socketInstance.on('connect', () => {
    store().setConnected(true);
    startPing(socketInstance);
  });

  socketInstance.on('disconnect', () => {
    store().setConnected(false);
    stopPing();
  });

  socketInstance.on('connect_error', () => {
    store().setConnected(false);
  });

  socketInstance.on('state', (state) => {
    store().setState(state);
  });

  socketInstance.on('chat:init', (messages) => {
    store().setChat(messages);
  });

  socketInstance.on('chat:message', (message) => {
    store().addChat(message);
  });

  socketInstance.on('canvas:init', (canvas) => {
    store().setCanvas(canvas);
  });

  socketInstance.on('stroke:start', (stroke) => {
    store().startActive(stroke);
  });

  socketInstance.on('stroke:points', ({ id, points }) => {
    store().appendActive(id, points);
  });

  socketInstance.on('stroke:end', ({ id }) => {
    store().endActive(id);
  });

  socketInstance.on('stroke:remove', ({ id }) => {
    store().removeStroke(id);
  });

  socketInstance.on('canvas:reset', () => {
    store().resetCanvas();
  });

  socketInstance.on('canvas:snapshot', ({ dataUrl }) => {
    store().setSnapshot(dataUrl);
  });

  socketInstance.on('canvas:restore', (canvas) => {
    store().setCanvas(canvas);
  });

  socketInstance.on('reaction', (reaction) => {
    store().addReaction(reaction);
    setTimeout(() => store().removeReaction(reaction.id), 3_200);
  });

  socketInstance.on('notification', ({ message, kind }) => {
    if (kind === 'success') toast.success(message);
    else if (kind === 'error') toast.error(message);
    else toast.info(message);
  });

  socketInstance.on('room:ended', ({ reason }) => {
    const code = useGameStore.getState().state?.code;
    if (code) clearSession(code);
    store().setEnded(reason);
  });
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 6_000,
      timeout: 12_000,
      transports: ['websocket', 'polling'],
    });
    bind(socket);
  }
  return socket;
}
