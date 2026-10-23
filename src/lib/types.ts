export type GamePhase = 'lobby' | 'choosing' | 'drawing' | 'round_end' | 'game_end';
export type Difficulty = 'easy' | 'mixed' | 'hard';
export type Tool = 'pen' | 'marker' | 'highlighter' | 'eraser';
export type ChatKind = 'chat' | 'system' | 'correct';

export interface RoomSettings {
  rounds: number;
  drawTime: number;
  maxPlayers: number;
  hints: number;
  difficulty: Difficulty;
  customWords: string[];
  locked: boolean;
}

export interface PlayerStats {
  correctGuesses: number;
  timesDrawn: number;
  fastestGuessMs: number | null;
  pointsAsArtist: number;
}

export interface PlayerPublic {
  id: string;
  nickname: string;
  avatarSeed: string;
  cosmetic: string | null;
  score: number;
  roundPoints: number;
  streak: number;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  stats: PlayerStats;
}

export interface ChatMessage {
  id: string;
  kind: ChatKind;
  playerId?: string;
  nickname?: string;
  text: string;
  at: number;
}

export interface Point {
  x: number;
  y: number;
  p?: number;
}

export interface Stroke {
  id: string;
  playerId: string;
  tool: Tool;
  color: string;
  size: number;
  opacity: number;
  points: Point[];
}

export interface WordChoice {
  word: string;
  stars: number;
}

export interface GuessResult {
  playerId: string;
  nickname: string;
  points: number;
  timeMs: number;
  order: number;
}

export interface RoundResult {
  word: string;
  artistId: string;
  artistNickname: string;
  artistPoints: number;
  guesses: GuessResult[];
  /** Closest wrong guess of the round, for the "so close" callout. */
  nearMiss: NearMiss | null;
  endedAt: number;
}

export interface NearMiss {
  playerId: string;
  nickname: string;
  text: string;
  offBy: number;
}

export interface GameResult {
  playerId: string;
  nickname: string;
  avatarSeed: string;
  cosmetic: string | null;
  score: number;
  stats: PlayerStats;
}

export interface YouState {
  id: string;
  isArtist: boolean;
  isSpectator: boolean;
  word: string | null;
  maskedWord: string | null;
  choices: WordChoice[];
  canDraw: boolean;
  /** A bucket fill or clear can be rolled back, even though it flattens the stroke log. */
  canUndoFill: boolean;
  votedRematch: boolean;
}

export interface PublicState {
  code: string;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  artistId: string | null;
  phaseEndsAt: number | null;
  serverNow: number;
  hostId: string;
  settings: RoomSettings;
  players: PlayerPublic[];
  you: YouState;
  turnOrder: string[];
  turnIndex: number;
  hintIndices: number[];
  guessedIds: string[];
  roundResult: RoundResult | null;
  gameResults: GameResult[] | null;
  /** Closest wrong guess across the whole game, kept for the end-of-game recap card. */
  gameNearMiss: NearMiss | null;
  rematchVotes: number;
  rematchNeeded: number;
}

export interface CanvasInit {
  baseImage: string | null;
  strokes: Stroke[];
  active: Stroke[];
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  nickname: string;
}

export interface SessionInfo {
  playerId: string;
  token: string;
}

export interface AckOk<T = undefined> {
  ok: true;
  data?: T;
}

export interface AckErr {
  ok: false;
  error: string;
}

export type Ack<T = undefined> = AckOk<T> | AckErr;

export type NotificationKind = 'info' | 'success' | 'error';
