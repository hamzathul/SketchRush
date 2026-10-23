import type {
  Ack,
  CanvasInit,
  ChatMessage,
  Point,
  PublicState,
  ReactionEvent,
  RoomSettings,
  Stroke,
  NotificationKind,
} from './types';

export interface CreateRoomPayload {
  nickname: string;
  avatarSeed: string;
  cosmetic?: string;
}

export interface JoinRoomPayload {
  code: string;
  nickname: string;
  avatarSeed: string;
  cosmetic?: string;
}

export interface ResumePayload {
  code: string;
  playerId: string;
  token: string;
}

export interface StrokeStartPayload {
  stroke: Stroke;
}

export interface StrokePointsPayload {
  id: string;
  points: Point[];
}

export interface StrokeEndPayload {
  id: string;
}

export interface StrokeUndoPayload {
  id: string;
}

export interface CanvasSnapshotPayload {
  dataUrl: string;
}

export interface ChatSendPayload {
  text: string;
  /** Quick lines are chatter only — they never count as guesses. */
  quick?: boolean;
}

export interface ReactionSendPayload {
  emoji: string;
}

export interface SettingsPayload {
  settings: Partial<RoomSettings>;
}

export interface TargetPlayerPayload {
  playerId: string;
}

export interface WordChoosePayload {
  word: string;
}

export interface CosmeticPayload {
  cosmetic: string | null;
}

export interface RoomCreatedData {
  code: string;
  playerId: string;
  token: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: (r: Ack<RoomCreatedData>) => void) => void;
  'room:join': (payload: JoinRoomPayload, ack: (r: Ack<RoomCreatedData>) => void) => void;
  'room:resume': (payload: ResumePayload, ack: (r: Ack) => void) => void;
  'room:leave': (ack: (r: Ack) => void) => void;
  'room:update-settings': (payload: SettingsPayload, ack: (r: Ack) => void) => void;
  'room:kick': (payload: TargetPlayerPayload, ack: (r: Ack) => void) => void;
  'room:transfer-host': (payload: TargetPlayerPayload, ack: (r: Ack) => void) => void;
  'game:start': (ack: (r: Ack) => void) => void;
  'game:rematch': (ack: (r: Ack) => void) => void;
  'game:to-lobby': (ack: (r: Ack) => void) => void;
  'word:choose': (payload: WordChoosePayload, ack: (r: Ack) => void) => void;
  'stroke:start': (payload: StrokeStartPayload) => void;
  'stroke:points': (payload: StrokePointsPayload) => void;
  'stroke:end': (payload: StrokeEndPayload) => void;
  'stroke:undo': (payload: StrokeUndoPayload) => void;
  'canvas:clear': () => void;
  'canvas:snapshot': (payload: CanvasSnapshotPayload) => void;
  /** Undo the most recent bucket fill or clear (restores the flattened canvas). */
  'canvas:undo': () => void;
  'chat:send': (payload: ChatSendPayload) => void;
  'player:cosmetic': (payload: CosmeticPayload) => void;
  'reaction:send': (payload: ReactionSendPayload) => void;
  'ping:rtt': (sentAt: number, ack: (serverAt: number) => void) => void;
}

export interface ServerToClientEvents {
  state: (state: PublicState) => void;
  'chat:init': (messages: ChatMessage[]) => void;
  'chat:message': (message: ChatMessage) => void;
  'canvas:init': (canvas: CanvasInit) => void;
  'stroke:start': (stroke: Stroke) => void;
  'stroke:points': (payload: StrokePointsPayload) => void;
  'stroke:end': (payload: StrokeEndPayload) => void;
  'stroke:remove': (payload: StrokeUndoPayload) => void;
  'canvas:reset': () => void;
  'canvas:snapshot': (payload: CanvasSnapshotPayload) => void;
  'canvas:restore': (payload: CanvasInit) => void;
  reaction: (reaction: ReactionEvent) => void;
  notification: (payload: { message: string; kind?: NotificationKind }) => void;
  'room:ended': (payload: { reason: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId?: string;
  roomCode?: string;
}
