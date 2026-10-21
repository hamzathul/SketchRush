import { create } from 'zustand';
import type { ChatMessage, PublicState, ReactionEvent, Stroke } from './types';

interface ReactionWithKey extends ReactionEvent {
  key: string;
}

interface CanvasState {
  baseImage: string | null;
  strokes: Stroke[];
  active: Stroke[];
  revision: number;
}

interface GameStore {
  state: PublicState | null;
  chat: ChatMessage[];
  connected: boolean;
  connectionEpoch: number;
  ping: number | null;
  endedReason: string | null;
  clockOffset: number;
  canvas: CanvasState;
  reactions: ReactionWithKey[];
  setState: (state: PublicState) => void;
  setChat: (messages: ChatMessage[]) => void;
  addChat: (message: ChatMessage) => void;
  setConnected: (connected: boolean) => void;
  setPing: (ping: number | null) => void;
  setEnded: (reason: string) => void;
  clearEnded: () => void;
  setCanvas: (canvas: { baseImage: string | null; strokes: Stroke[]; active: Stroke[] }) => void;
  startActive: (stroke: Stroke) => void;
  appendActive: (id: string, points: Stroke['points']) => void;
  endActive: (id: string) => void;
  removeStroke: (id: string) => void;
  resetCanvas: () => void;
  setSnapshot: (dataUrl: string) => void;
  addReaction: (reaction: ReactionEvent) => void;
  removeReaction: (key: string) => void;
  resetRoom: () => void;
}

const emptyCanvas: CanvasState = { baseImage: null, strokes: [], active: [], revision: 0 };

export const useGameStore = create<GameStore>((set) => ({
  state: null,
  chat: [],
  connected: false,
  connectionEpoch: 0,
  ping: null,
  endedReason: null,
  clockOffset: 0,
  canvas: emptyCanvas,
  reactions: [],

  setState: (state) =>
    set((current) => ({
      state,
      clockOffset: state.serverNow - Date.now(),
      endedReason: null,
      // If the room code changed, wipe stale chat/canvas state.
      chat: current.state && current.state.code !== state.code ? [] : current.chat,
      canvas:
        current.state && current.state.code !== state.code ? { ...emptyCanvas } : current.canvas,
      // Reactions belong to the screen they were sent on — drop them when the phase or room changes.
      reactions:
        current.state && current.state.code === state.code && current.state.phase === state.phase
          ? current.reactions
          : [],
    })),

  setChat: (messages) => set({ chat: messages.slice(-200) }),

  addChat: (message) =>
    set((current) => ({
      chat: [...current.chat, message].slice(-200),
    })),

  setConnected: (connected) =>
    set((current) =>
      connected
        ? { connected, connectionEpoch: current.connectionEpoch + 1 }
        : { connected, ping: null },
    ),

  setPing: (ping) => set({ ping }),
  setEnded: (reason) => set({ endedReason: reason }),
  clearEnded: () => set({ endedReason: null }),

  setCanvas: (canvas) =>
    set((current) => ({
      canvas: {
        baseImage: canvas.baseImage,
        strokes: canvas.strokes,
        active: canvas.active,
        revision: current.canvas.revision + 1,
      },
    })),

  startActive: (stroke) =>
    set((current) => ({
      canvas: {
        ...current.canvas,
        active: [...current.canvas.active.filter((item) => item.id !== stroke.id), stroke],
        revision: current.canvas.revision + 1,
      },
    })),

  appendActive: (id, points) =>
    set((current) => ({
      canvas: {
        ...current.canvas,
        active: current.canvas.active.map((stroke) =>
          stroke.id === id ? { ...stroke, points: [...stroke.points, ...points] } : stroke,
        ),
        revision: current.canvas.revision + 1,
      },
    })),

  endActive: (id) =>
    set((current) => {
      const stroke = current.canvas.active.find((item) => item.id === id);
      if (!stroke) return current;
      return {
        canvas: {
          ...current.canvas,
          active: current.canvas.active.filter((item) => item.id !== id),
          strokes: [...current.canvas.strokes, stroke],
          revision: current.canvas.revision + 1,
        },
      };
    }),

  removeStroke: (id) =>
    set((current) => ({
      canvas: {
        ...current.canvas,
        active: current.canvas.active.filter((item) => item.id !== id),
        strokes: current.canvas.strokes.filter((item) => item.id !== id),
        revision: current.canvas.revision + 1,
      },
    })),

  resetCanvas: () =>
    set((current) => ({
      canvas: {
        baseImage: null,
        strokes: [],
        active: [],
        revision: current.canvas.revision + 1,
      },
    })),

  setSnapshot: (dataUrl) =>
    set((current) => ({
      canvas: {
        baseImage: dataUrl,
        strokes: [],
        active: [],
        revision: current.canvas.revision + 1,
      },
    })),

  addReaction: (reaction) =>
    set((current) => ({
      reactions: [...current.reactions.slice(-14), { ...reaction, key: reaction.id }],
    })),

  removeReaction: (key) =>
    set((current) => ({ reactions: current.reactions.filter((reaction) => reaction.key !== key) })),

  resetRoom: () =>
    set({
      state: null,
      chat: [],
      ping: null,
      endedReason: null,
      clockOffset: 0,
      canvas: { ...emptyCanvas, revision: 0 },
      reactions: [],
    }),
}));
