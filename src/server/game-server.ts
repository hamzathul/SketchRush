import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type {
  Ack,
  AckErr,
  ChatMessage,
  GamePhase,
  GameResult,
  NearMiss,
  PlayerStats,
  PublicState,
  ReactionEvent,
  RoomSettings,
  RoundResult,
  Stroke,
  WordChoice,
} from '../lib/types';
import type {
  ClientToServerEvents,
  InterServerEvents,
  RoomCreatedData,
  ServerToClientEvents,
  SocketData,
} from '../lib/socket-events';
import { LIMITS, TIMING, sanitizeSettings } from '../lib/game-config';
import {
  artistBonusEligible,
  artistBonusPoints,
  artistPointsForGuess,
  guessScore,
} from '../lib/scoring';
import { isCloseGuess, letterIndices, maskWord, nearMissDistance, normalizeKey, normalizeWord } from '../lib/normalize';
import { pickWordChoices } from '../lib/words';
import { logger } from './logger';
import { AVATAR_EMOJIS, clamp } from '../lib/game-config';
import {
  containsAnswer,
  containsProfanity,
  maskProfanity,
  sanitizeAvatarSeed,
  sanitizeChat,
  sanitizeCosmetic,
  sanitizeNickname,
} from './game/text';

export type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface ServerPlayer {
  id: string;
  socketId: string | null;
  token: string;
  nickname: string;
  avatarSeed: string;
  cosmetic: string | null;
  score: number;
  roundPoints: number;
  streak: number;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
  stats: PlayerStats;
}

interface GuessedEntry {
  at: number;
  points: number;
  timeMs: number;
  order: number;
}

export interface ServerRoom {
  code: string;
  hostId: string;
  createdAt: number;
  lastActivity: number;
  settings: RoomSettings;
  phase: GamePhase;
  round: number;
  artistId: string | null;
  artistDisconnectedAt: number | null;
  turnOrder: string[];
  turnIndex: number;
  word: string | null;
  wordStars: number;
  choices: WordChoice[];
  hintIndices: number[];
  phaseEndsAt: number | null;
  guessed: Map<string, GuessedEntry>;
  roundResult: RoundResult | null;
  nearMiss: NearMiss | null;
  gameResults: GameResult[] | null;
  rematchVotes: Set<string>;
  strokes: Stroke[];
  activeStrokes: Map<string, Stroke>;
  baseImage: string | null;
  chat: ChatMessage[];
  players: Map<string, ServerPlayer>;
  usedWords: Set<string>;
  timer: NodeJS.Timeout | null;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function ok<T = undefined>(data?: T): Ack<T> {
  return { ok: true, data };
}

function err(error: string): AckErr {
  return { ok: false, error };
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function emptyStats(): PlayerStats {
  return { correctGuesses: 0, timesDrawn: 0, fastestGuessMs: null, pointsAsArtist: 0 };
}

function uniqueNickname(room: ServerRoom, desired: string): string {
  const taken = new Set(Array.from(room.players.values(), (player) => player.nickname.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;

  for (let suffix = 2; suffix < 100; suffix++) {
    const tail = ` ${suffix}`;
    const candidate = `${desired.slice(0, LIMITS.nickname.max - tail.length)}${tail}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${desired.slice(0, 11)} ${randomInt(100, 999)}`;
}

function clampPoint(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}

export class GameServer {
  private rooms = new Map<string, ServerRoom>();
  private sweepTimer: NodeJS.Timeout;

  constructor(private io: IO) {
    this.sweepTimer = setInterval(() => this.sweep(), TIMING.sweepIntervalMs);
    this.sweepTimer.unref?.();
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  get playerCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) if (player.connected) count++;
    }
    return count;
  }

  getRoom(code: string | undefined): ServerRoom | undefined {
    if (!code) return undefined;
    return this.rooms.get(code.toUpperCase());
  }

  getPlayer(room: ServerRoom | undefined, playerId: string | undefined): ServerPlayer | undefined {
    if (!room || !playerId) return undefined;
    return room.players.get(playerId);
  }

  // ---------------------------------------------------------------------------
  // Room lifecycle
  // ---------------------------------------------------------------------------

  createRoom(
    socket: GameSocket,
    rawNickname: string,
    rawAvatar: string,
    rawCosmetic: string | undefined,
    ip: string,
  ): Ack<RoomCreatedData> {
    if (socket.data.roomCode && this.rooms.has(socket.data.roomCode)) {
      return err('You are already in a room. Leave it first.');
    }

    const nickname = sanitizeNickname(rawNickname);
    if (nickname.length < LIMITS.nickname.min || nickname.length > LIMITS.nickname.max) {
      return err('Pick a nickname between 2 and 16 characters.');
    }
    if (containsProfanity(nickname)) return err('Please pick a friendlier nickname.');

    const code = this.generateCode();
    const player = this.makePlayer(
      nickname,
      sanitizeAvatarSeed(rawAvatar),
      sanitizeCosmetic(rawCosmetic),
      true,
      false,
    );
    player.socketId = socket.id;

    const room: ServerRoom = {
      code,
      hostId: player.id,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      settings: sanitizeSettings({}),
      phase: 'lobby',
      round: 0,
      artistId: null,
      artistDisconnectedAt: null,
      turnOrder: [],
      turnIndex: 0,
      word: null,
      wordStars: 1,
      choices: [],
      hintIndices: [],
      phaseEndsAt: null,
      guessed: new Map(),
      roundResult: null,
      nearMiss: null,
      gameResults: null,
      rematchVotes: new Set(),
      strokes: [],
      activeStrokes: new Map(),
      baseImage: null,
      chat: [],
      players: new Map([[player.id, player]]),
      usedWords: new Set(),
      timer: null,
    };

    this.rooms.set(code, room);
    this.bindSocket(socket, room, player);

    this.system(room, `${nickname} created the room.`);
    this.pushState(room);
    this.pushCanvas(room);
    this.sendChatInit(room, socket.id);

    logger.info({ code, nickname, ip }, 'room created');
    return ok({ code, playerId: player.id, token: player.token });
  }

  joinRoom(
    socket: GameSocket,
    rawCode: string,
    rawNickname: string,
    rawAvatar: string,
    rawCosmetic: string | undefined,
  ): Ack<RoomCreatedData> {
    if (socket.data.roomCode && this.rooms.has(socket.data.roomCode)) {
      return err('You are already in a room. Leave it first.');
    }

    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return err('Room not found. Check the code and try again.');
    if (room.settings.locked) return err('This room is locked by the host.');
    if (room.players.size >= LIMITS.maxRoomPlayers) return err('This room is full.');

    const nickname = sanitizeNickname(rawNickname);
    if (nickname.length < LIMITS.nickname.min || nickname.length > LIMITS.nickname.max) {
      return err('Pick a nickname between 2 and 16 characters.');
    }
    if (containsProfanity(nickname)) return err('Please pick a friendlier nickname.');

    const spectator = room.phase !== 'lobby';
    if (!spectator) {
      const activePlayers = Array.from(room.players.values()).filter((player) => !player.isSpectator).length;
      if (activePlayers >= room.settings.maxPlayers) {
        return err('This room is full. Try again when a player leaves.');
      }
    }

    const player = this.makePlayer(
      uniqueNickname(room, nickname),
      sanitizeAvatarSeed(rawAvatar),
      sanitizeCosmetic(rawCosmetic),
      false,
      spectator,
    );
    player.socketId = socket.id;
    room.players.set(player.id, player);
    this.bindSocket(socket, room, player);
    this.touch(room);

    this.system(
      room,
      spectator
        ? `${player.nickname} joined as a spectator — they can play next game.`
        : `${player.nickname} joined the room.`,
    );
    this.pushState(room);
    this.pushCanvas(room);
    this.sendChatInit(room, socket.id);

    logger.info({ code, nickname: player.nickname, spectator }, 'player joined');
    return ok({ code, playerId: player.id, token: player.token });
  }

  resumeRoom(socket: GameSocket, rawCode: string, playerId: string, token: string): Ack {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return err('This room no longer exists.');

    const player = room.players.get(playerId);
    if (!player || player.token !== token) return err('Your session expired. Rejoin the room.');

    const reconnected = !player.connected || player.socketId !== socket.id;

    if (player.connected && player.socketId && player.socketId !== socket.id) {
      const previous = this.io.sockets.sockets.get(player.socketId);
      previous?.emit('room:ended', { reason: 'Your session opened in another tab.' });
      previous?.disconnect(true);
    }

    player.connected = true;
    player.socketId = socket.id;
    player.disconnectedAt = null;
    this.bindSocket(socket, room, player);
    this.touch(room);

    if (player.id === room.artistId) room.artistDisconnectedAt = null;

    if (reconnected) this.system(room, `${player.nickname} is back.`);
    this.pushState(room);
    this.pushCanvas(room, socket.id);
    this.sendChatInit(room, socket.id);

    return ok();
  }

  leaveRoom(socket: GameSocket): Ack {
    const room = this.getRoom(socket.data.roomCode);
    const player = this.getPlayer(room, socket.data.playerId);
    if (!room || !player) {
      this.clearSocket(socket);
      return ok();
    }

    socket.leave(room.code);
    this.clearSocket(socket);
    this.removePlayer(room, player, 'left');
    return ok();
  }

  disconnect(socket: GameSocket): void {
    const room = this.getRoom(socket.data.roomCode);
    const player = this.getPlayer(room, socket.data.playerId);
    if (!room || !player || player.socketId !== socket.id) return;

    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = Date.now();
    this.touch(room);

    if (room.hostId === player.id) {
      this.promoteNextHost(room);
    }
    if (room.artistId === player.id && (room.phase === 'choosing' || room.phase === 'drawing')) {
      room.artistDisconnectedAt = Date.now();
    }

    this.system(room, `${player.nickname} disconnected.`);
    this.pushState(room);

    if (room.phase === 'drawing' && room.guessed.size >= this.eligibleGuesserIds(room).length) {
      room.phaseEndsAt = Date.now() + TIMING.allGuessedGraceMs;
    }
  }

  // ---------------------------------------------------------------------------
  // Lobby controls
  // ---------------------------------------------------------------------------

  /** Winner charms are cosmetic only; validate against the list and broadcast. */
  setCosmetic(room: ServerRoom, playerId: string, rawCosmetic: string | null): void {
    const player = room.players.get(playerId);
    if (!player) return;

    const cosmetic = sanitizeCosmetic(rawCosmetic);
    if (player.cosmetic === cosmetic) return;

    player.cosmetic = cosmetic;
    this.touch(room);
    this.pushState(room);
  }

  updateSettings(room: ServerRoom, requesterId: string, patch: Partial<RoomSettings>): Ack {
    if (room.hostId !== requesterId) return err('Only the host can change settings.');
    if (room.phase !== 'lobby') return err('Settings can only change in the lobby.');

    room.settings = sanitizeSettings(patch, room.settings);
    this.touch(room);
    this.pushState(room);
    return ok();
  }

  kick(room: ServerRoom, requesterId: string, targetId: string): Ack {
    if (room.hostId !== requesterId) return err('Only the host can remove players.');
    if (targetId === requesterId) return err('You cannot remove yourself.');
    const target = room.players.get(targetId);
    if (!target) return err('Player not found.');

    if (target.socketId) {
      this.io.to(target.socketId).emit('room:ended', { reason: 'The host removed you from the room.' });
      this.io.sockets.sockets.get(target.socketId)?.leave(room.code);
    }

    room.players.delete(targetId);
    room.rematchVotes.delete(targetId);
    this.system(room, `${target.nickname} was removed by the host.`);

    if (room.artistId === targetId && (room.phase === 'choosing' || room.phase === 'drawing')) {
      this.advanceTurn(room);
    } else {
      this.pushState(room);
    }
    return ok();
  }

  transferHost(room: ServerRoom, requesterId: string, targetId: string): Ack {
    if (room.hostId !== requesterId) return err('Only the host can transfer host.');
    const target = room.players.get(targetId);
    if (!target) return err('Player not found.');
    if (!target.connected) return err('That player is disconnected.');
    this.applyHost(room, target);
    this.pushState(room);
    return ok();
  }

  start(room: ServerRoom, requesterId: string): Ack {
    if (room.hostId !== requesterId) return err('Only the host can start the game.');
    if (room.phase !== 'lobby') return err('The game is already running.');
    return this.beginGame(room);
  }

  rematch(room: ServerRoom, playerId: string): Ack {
    if (room.phase !== 'game_end') return err('There is no finished game to rematch.');
    const player = room.players.get(playerId);
    if (!player || player.isSpectator) return err('Spectators can join the next game automatically.');

    room.rematchVotes.add(playerId);
    const needed = this.rematchVoteCount(room);
    this.touch(room);

    if (room.rematchVotes.size >= needed && needed >= LIMITS.minPlayers) {
      return this.beginGame(room);
    }

    this.system(room, `${player.nickname} wants a rematch (${room.rematchVotes.size}/${needed}).`);
    this.pushState(room);
    return ok();
  }

  toLobby(room: ServerRoom, requesterId: string): Ack {
    if (room.hostId !== requesterId) return err('Only the host can return to the lobby.');
    if (room.phase !== 'game_end' && room.phase !== 'lobby') {
      return err('Finish the current game first.');
    }

    this.stopTimer(room);
    room.phase = 'lobby';
    room.round = 0;
    room.artistId = null;
    room.artistDisconnectedAt = null;
    room.phaseEndsAt = null;
    room.word = null;
    room.choices = [];
    room.hintIndices = [];
    room.guessed.clear();
    room.roundResult = null;
    room.nearMiss = null;
    room.gameResults = null;
    room.rematchVotes.clear();
    room.turnOrder = [];
    room.turnIndex = 0;
    room.strokes = [];
    room.activeStrokes.clear();
    room.baseImage = null;
    for (const player of room.players.values()) {
      if (player.connected) player.isSpectator = false;
    }

    this.system(room, 'Back to the lobby.');
    this.pushState(room);
    this.pushCanvas(room);
    return ok();
  }

  // ---------------------------------------------------------------------------
  // Game flow
  // ---------------------------------------------------------------------------

  chooseWord(room: ServerRoom, playerId: string, word: string): Ack {
    if (room.phase !== 'choosing') return err('It is not time to choose a word.');
    if (room.artistId !== playerId) return err('Only the artist chooses a word.');
    return this.applyWordChoice(room, word);
  }

  private beginGame(room: ServerRoom): Ack {
    const connected = Array.from(room.players.values())
      .filter((player) => player.connected)
      .sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.joinedAt - b.joinedAt);

    if (connected.length < LIMITS.minPlayers) {
      return err('You need at least 2 connected players to start.');
    }

    const participants = connected.slice(0, room.settings.maxPlayers);
    for (const player of room.players.values()) {
      player.isSpectator = !participants.includes(player);
      player.score = 0;
      player.roundPoints = 0;
      player.streak = 0;
      player.stats = emptyStats();
    }

    room.round = 1;
    room.turnOrder = shuffle(participants.map((player) => player.id));
    room.turnIndex = 0;
    room.word = null;
    room.choices = [];
    room.hintIndices = [];
    room.guessed.clear();
    room.roundResult = null;
    room.nearMiss = null;
    room.gameResults = null;
    room.rematchVotes.clear();
    room.usedWords.clear();
    room.strokes = [];
    room.activeStrokes.clear();
    room.baseImage = null;
    room.artistId = null;
    room.artistDisconnectedAt = null;
    room.phaseEndsAt = null;

    this.system(
      room,
      `Game started — ${room.settings.rounds} round${room.settings.rounds === 1 ? '' : 's'}, ${room.settings.drawTime}s per turn.`,
    );
    this.beginTurn(room);
    this.touch(room);
    return ok();
  }

  private beginTurn(room: ServerRoom): void {
    const artist = this.nextArtist(room);
    if (!artist) {
      this.endGame(room);
      return;
    }

    room.artistId = artist.id;
    room.artistDisconnectedAt = null;
    room.phase = 'choosing';
    room.phaseEndsAt = Date.now() + TIMING.choosingMs;
    room.word = null;
    room.wordStars = 1;
    room.choices = pickWordChoices(room.settings.difficulty, room.usedWords, room.settings.customWords);
    room.hintIndices = [];
    room.guessed.clear();
    room.roundResult = null;
    room.nearMiss = null;
    room.strokes = [];
    room.activeStrokes.clear();
    room.baseImage = null;

    for (const player of room.players.values()) player.roundPoints = 0;
    artist.stats.timesDrawn += 1;

    this.system(room, `${artist.nickname} is choosing a word…`);
    this.pushState(room);
    this.pushCanvas(room);
    this.ensureTimer(room);
  }

  private nextArtist(room: ServerRoom): ServerPlayer | null {
    while (room.turnIndex < room.turnOrder.length) {
      const candidate = room.players.get(room.turnOrder[room.turnIndex]);
      if (candidate && candidate.connected && !candidate.isSpectator) return candidate;
      room.turnIndex += 1;
    }
    return null;
  }

  private advanceTurn(room: ServerRoom): void {
    room.turnIndex += 1;
    let artist = this.nextArtist(room);

    if (!artist) {
      if (room.round >= room.settings.rounds) {
        this.endGame(room);
        return;
      }

      const remaining = this.participantIds(room).filter((id) => room.players.get(id)?.connected);
      if (remaining.length < LIMITS.minPlayers) {
        this.endGame(room);
        return;
      }

      room.round += 1;
      room.turnOrder = shuffle(remaining);
      room.turnIndex = 0;
      artist = this.nextArtist(room);
      if (!artist) {
        this.endGame(room);
        return;
      }
    }

    this.beginTurn(room);
  }

  private applyWordChoice(room: ServerRoom, word: string): Ack {
    const choice = room.choices.find((candidate) => candidate.word.toLowerCase() === word.trim().toLowerCase());
    if (!choice) return err('That word is not one of your choices.');

    const artist = room.players.get(room.artistId ?? '');
    if (!artist) return err('Artist not found.');

    room.word = choice.word;
    room.wordStars = choice.stars;
    room.usedWords.add(normalizeKey(choice.word));
    room.choices = [];
    room.phase = 'drawing';
    room.phaseEndsAt = Date.now() + room.settings.drawTime * 1000;
    room.hintIndices = [];
    room.guessed.clear();
    room.strokes = [];
    room.activeStrokes.clear();
    room.baseImage = null;

    this.touch(room);
    this.system(room, `${artist.nickname} is drawing!`);
    this.pushState(room);
    this.pushCanvas(room);
    this.ensureTimer(room);
    return ok();
  }

  private endRound(room: ServerRoom): void {
    if (room.phase !== 'drawing') return;

    const artist = room.players.get(room.artistId ?? '');
    const guesses = Array.from(room.guessed.entries())
      .map(([playerId, entry]) => ({
        playerId,
        nickname: room.players.get(playerId)?.nickname ?? 'Player',
        points: entry.points,
        timeMs: entry.timeMs,
        order: entry.order,
      }))
      .sort((a, b) => a.order - b.order);

    const eligibleGuessers = this.eligibleGuesserIds(room).length;
    if (artist && artistBonusEligible(guesses.length, eligibleGuessers)) {
      const bonus = artistBonusPoints(room.wordStars);
      artist.score += bonus;
      artist.roundPoints += bonus;
      artist.stats.pointsAsArtist += bonus;
    }

    const roundResult: RoundResult = {
      word: room.word ?? '',
      artistId: artist?.id ?? '',
      artistNickname: artist?.nickname ?? 'Artist',
      artistPoints: artist?.roundPoints ?? 0,
      guesses,
      nearMiss: room.nearMiss,
      endedAt: Date.now(),
    };

    room.phase = 'round_end';
    room.phaseEndsAt = Date.now() + TIMING.roundEndMs;
    room.roundResult = roundResult;
    room.choices = [];
    room.hintIndices = letterIndices(room.word ?? '');

    this.touch(room);
    this.system(room, `The word was “${roundResult.word}”.`);
    this.pushState(room);
    this.ensureTimer(room);
  }

  private endGame(room: ServerRoom): void {
    this.stopTimer(room);

    const results: GameResult[] = Array.from(room.players.values())
      .filter((player) => !player.isSpectator)
      .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        avatarSeed: player.avatarSeed,
        cosmetic: player.cosmetic,
        score: player.score,
        stats: { ...player.stats },
      }));

    room.phase = 'game_end';
    room.phaseEndsAt = null;
    room.artistId = null;
    room.artistDisconnectedAt = null;
    room.word = null;
    room.choices = [];
    room.hintIndices = [];
    room.roundResult = null;
    room.nearMiss = null;
    room.gameResults = results;
    room.rematchVotes.clear();

    if (results.length > 0) {
      this.system(room, `Game over — ${results[0].nickname} wins with ${results[0].score} points!`);
    } else {
      this.system(room, 'Game over.');
    }

    this.touch(room);
    this.pushState(room);
  }

  // ---------------------------------------------------------------------------
  // Chat & guessing
  // ---------------------------------------------------------------------------

  chat(room: ServerRoom, playerId: string, rawText: string, quick = false): void {
    const player = room.players.get(playerId);
    if (!player) return;

    const text = sanitizeChat(rawText);
    if (!text) return;

    const isDrawing = room.phase === 'drawing';
    const isArtist = room.artistId === playerId;

    if (isDrawing && isArtist && room.word && containsAnswer(text, room.word)) {
      this.notify(player, 'You cannot say the word!', 'error');
      return;
    }

    // One-tap lines are banter: they never count as guesses and never break a streak.
    if (quick) {
      if (isDrawing && room.word && containsAnswer(text, room.word)) {
        this.notify(player, 'No spoilers!', 'error');
        return;
      }
      this.emitChat(room, {
        id: randomUUID(),
        kind: 'chat',
        playerId: player.id,
        nickname: player.nickname,
        text: maskProfanity(text),
        at: Date.now(),
      });
      return;
    }

    if (isDrawing && !isArtist && !player.isSpectator && room.word) {
      if (room.guessed.has(playerId)) {
        if (containsAnswer(text, room.word)) {
          this.notify(player, 'You already guessed — no spoilers!', 'error');
          return;
        }
        // Correct guessers can still chat, as long as they do not reveal the answer.
      } else {
        const guess = normalizeWord(text);
        const answer = normalizeWord(room.word);

        if (guess === answer) {
          this.awardGuess(room, player);
          return;
        }

        player.streak = 0;
        this.recordNearMiss(room, player, text);
        this.emitChat(room, {
          id: randomUUID(),
          kind: 'chat',
          playerId: player.id,
          nickname: player.nickname,
          text: maskProfanity(text),
          at: Date.now(),
        });

        if (isCloseGuess(text, room.word)) {
          this.notify(player, 'So close! You are one letter off.', 'info');
        }        return;
      }
    }

    this.emitChat(room, {
      id: randomUUID(),
      kind: 'chat',
      playerId: player.id,
      nickname: player.nickname,
      text: maskProfanity(text),
      at: Date.now(),
    });
  }

  /** Keep the closest wrong guess of the turn for the round-end “so close” callout. */
  private recordNearMiss(room: ServerRoom, player: ServerPlayer, text: string): void {
    const distance = nearMissDistance(text, room.word ?? '');
    if (distance === null || distance > 2) return;
    if (room.nearMiss && room.nearMiss.offBy <= distance) return;

    room.nearMiss = {
      playerId: player.id,
      nickname: player.nickname,
      text: maskProfanity(sanitizeChat(text)),
      offBy: distance,
    };
  }

  private awardGuess(room: ServerRoom, player: ServerPlayer): void {
    const order = room.guessed.size;
    const drawMs = room.settings.drawTime * 1000;
    const endsAt = room.phaseEndsAt ?? Date.now();
    const timeMs = clamp(drawMs - (endsAt - Date.now()), 0, drawMs);
    const points = guessScore({
      timeMs,
      drawMs,
      hints: room.hintIndices.length,
      position: order,
      streak: player.streak,
    });

    player.score += points;
    player.roundPoints += points;
    player.streak += 1;
    player.stats.correctGuesses += 1;
    if (player.stats.fastestGuessMs === null || timeMs < player.stats.fastestGuessMs) {
      player.stats.fastestGuessMs = timeMs;
    }

    room.guessed.set(player.id, { at: Date.now(), points, timeMs, order });

    const artist = room.players.get(room.artistId ?? '');
    if (artist) {
      const artistPoints = artistPointsForGuess(room.wordStars);
      artist.score += artistPoints;
      artist.roundPoints += artistPoints;
      artist.stats.pointsAsArtist += artistPoints;
    }

    this.emitChat(room, {
      id: randomUUID(),
      kind: 'correct',
      playerId: player.id,
      nickname: player.nickname,
      text:
        player.streak >= 3
          ? `${player.nickname} guessed the word! +${points} 🔥 ${player.streak} in a row`
          : `${player.nickname} guessed the word! +${points}`,
      at: Date.now(),
    });

    if (player.streak >= 3) {
      this.notify(player, `Correct! +${points} points 🔥 ${player.streak} in a row`, 'success');
    } else {
      this.notify(player, `Correct! +${points} points`, 'success');
    }

    const eligible = this.eligibleGuesserIds(room);
    if (room.guessed.size >= eligible.length) {
      room.phaseEndsAt = Date.now() + TIMING.allGuessedGraceMs;
    }

    this.touch(room);
    this.pushState(room);
  }

  // ---------------------------------------------------------------------------
  // Canvas events
  // ---------------------------------------------------------------------------

  startStroke(room: ServerRoom, playerId: string, stroke: Stroke): void {
    const player = room.players.get(playerId);
    if (!player || !this.canDraw(room, playerId)) return;
    if (room.strokes.length + room.activeStrokes.size >= LIMITS.maxStrokes) return;

    const normalized: Stroke = {
      id: stroke.id,
      playerId,
      tool: stroke.tool,
      color: stroke.color,
      size: clamp(stroke.size, 1, 64),
      opacity: clamp(stroke.opacity, 0.05, 1),
      points: stroke.points.slice(0, 8).map((point) => ({ ...point, x: clampPoint(point.x), y: clampPoint(point.y) })),
    };

    room.activeStrokes.set(normalized.id, normalized);
    this.touch(room);
    this.emitToOthers(room, playerId, (socketId) => this.io.to(socketId).emit('stroke:start', normalized));
  }

  appendStrokePoints(room: ServerRoom, playerId: string, strokeId: string, points: Stroke['points']): void {
    if (!this.canDraw(room, playerId)) return;
    const stroke = room.activeStrokes.get(strokeId);
    if (!stroke || stroke.playerId !== playerId) return;
    if (stroke.points.length >= LIMITS.maxPointsPerStroke) return;

    const clean = points
      .slice(0, 150)
      .map((point) => ({ ...point, x: clampPoint(point.x), y: clampPoint(point.y) }));
    stroke.points.push(...clean);

    this.emitToOthers(room, playerId, (socketId) =>
      this.io.to(socketId).emit('stroke:points', { id: strokeId, points: clean }),
    );
  }

  endStroke(room: ServerRoom, playerId: string, strokeId: string): void {
    if (!this.canDraw(room, playerId)) return;
    const stroke = room.activeStrokes.get(strokeId);
    if (!stroke || stroke.playerId !== playerId) return;

    room.activeStrokes.delete(strokeId);
    if (stroke.points.length > 0) room.strokes.push(stroke);
    this.touch(room);
    this.emitToOthers(room, playerId, (socketId) => this.io.to(socketId).emit('stroke:end', { id: strokeId }));
  }

  undoStroke(room: ServerRoom, playerId: string, strokeId: string): void {
    if (!this.canDraw(room, playerId)) return;

    const active = room.activeStrokes.get(strokeId);
    if (active && active.playerId === playerId) {
      room.activeStrokes.delete(strokeId);
    } else {
      const index = room.strokes.findIndex((stroke) => stroke.id === strokeId && stroke.playerId === playerId);
      if (index === -1) return;
      room.strokes.splice(index, 1);
    }

    this.touch(room);
    this.io.to(room.code).emit('stroke:remove', { id: strokeId });
  }

  clearCanvas(room: ServerRoom, playerId: string): void {
    if (!this.canDraw(room, playerId)) return;
    room.strokes = [];
    room.activeStrokes.clear();
    room.baseImage = null;
    this.touch(room);
    this.io.to(room.code).emit('canvas:reset');
  }

  setSnapshot(room: ServerRoom, playerId: string, dataUrl: string): void {
    if (!this.canDraw(room, playerId)) return;
    room.baseImage = dataUrl;
    room.strokes = [];
    room.activeStrokes.clear();
    this.touch(room);
    this.emitToOthers(room, playerId, (socketId) => this.io.to(socketId).emit('canvas:snapshot', { dataUrl }));
  }

  reaction(room: ServerRoom, playerId: string, emoji: string): void {
    const player = room.players.get(playerId);
    if (!player) return;
    const payload: ReactionEvent = { id: randomUUID(), emoji, nickname: player.nickname };
    this.io.to(room.code).emit('reaction', payload);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private canDraw(room: ServerRoom, playerId: string): boolean {
    return room.phase === 'drawing' && room.artistId === playerId;
  }

  private makePlayer(
    nickname: string,
    avatarSeed: string,
    cosmetic: string | null,
    isHost: boolean,
    isSpectator: boolean,
  ): ServerPlayer {
    return {
      id: randomUUID(),
      socketId: null,
      token: randomBytes(24).toString('base64url'),
      nickname,
      avatarSeed: avatarSeed || AVATAR_EMOJIS[randomInt(0, AVATAR_EMOJIS.length)],
      cosmetic,
      score: 0,
      roundPoints: 0,
      streak: 0,
      isHost,
      isSpectator,
      connected: true,
      joinedAt: Date.now(),
      disconnectedAt: null,
      stats: emptyStats(),
    };
  }

  private bindSocket(socket: GameSocket, room: ServerRoom, player: ServerPlayer): void {
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    socket.join(room.code);
  }

  private clearSocket(socket: GameSocket): void {
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 40; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    return randomBytes(5).toString('hex').toUpperCase().slice(0, 6);
  }

  private removePlayer(room: ServerRoom, player: ServerPlayer, reason: 'left' | 'timeout'): void {
    room.players.delete(player.id);
    room.rematchVotes.delete(player.id);

    if (room.hostId === player.id) {
      this.promoteNextHost(room);
    }

    if (room.artistId === player.id && (room.phase === 'choosing' || room.phase === 'drawing')) {
      this.system(room, `${player.nickname} ${reason === 'left' ? 'left' : 'timed out'} — skipping their turn.`);
      this.advanceTurn(room);
    } else {
      this.system(room, `${player.nickname} ${reason === 'left' ? 'left the room' : 'timed out'}.`);
      this.pushState(room);
    }

    if (room.players.size === 0) {
      this.destroyRoom(room, 'Everyone left the room.');
    } else {
      this.touch(room);
    }
  }

  private promoteNextHost(room: ServerRoom): void {
    const candidates = Array.from(room.players.values())
      .filter((player) => player.connected && player.id !== room.hostId)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const next = candidates[0];
    if (!next) return;
    this.applyHost(room, next);
    this.system(room, `${next.nickname} is now the host.`);
  }

  private applyHost(room: ServerRoom, player: ServerPlayer): void {
    for (const candidate of room.players.values()) candidate.isHost = candidate.id === player.id;
    room.hostId = player.id;
  }

  private destroyRoom(room: ServerRoom, reason: string): void {
    this.stopTimer(room);
    this.io.to(room.code).emit('room:ended', { reason });
    this.io.in(room.code).socketsLeave(room.code);
    this.rooms.delete(room.code);
    logger.info({ code: room.code, reason }, 'room closed');
  }

  private touch(room: ServerRoom): void {
    room.lastActivity = Date.now();
  }

  private participantIds(room: ServerRoom): string[] {
    return Array.from(room.players.values())
      .filter((player) => !player.isSpectator)
      .map((player) => player.id);
  }

  private eligibleGuesserIds(room: ServerRoom): string[] {
    return Array.from(room.players.values())
      .filter((player) => !player.isSpectator && player.connected && player.id !== room.artistId)
      .map((player) => player.id);
  }

  private rematchVoteCount(room: ServerRoom): number {
    return Array.from(room.players.values()).filter((player) => player.connected && !player.isSpectator).length;
  }

  private emitToOthers(room: ServerRoom, playerId: string, emit: (socketId: string) => void): void {
    for (const player of room.players.values()) {
      if (player.id === playerId || !player.connected || !player.socketId) continue;
      emit(player.socketId);
    }
  }

  private emitChat(room: ServerRoom, message: ChatMessage): void {
    room.chat.push(message);
    if (room.chat.length > 120) room.chat.splice(0, room.chat.length - 120);
    this.io.to(room.code).emit('chat:message', message);
  }

  private system(room: ServerRoom, text: string): void {
    this.emitChat(room, {
      id: randomUUID(),
      kind: 'system',
      text,
      at: Date.now(),
    });
  }

  private sendChatInit(room: ServerRoom, socketId: string): void {
    this.io.to(socketId).emit('chat:init', room.chat);
  }

  private notify(player: ServerPlayer, message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
    if (!player.socketId) return;
    this.io.to(player.socketId).emit('notification', { message, kind });
  }

  private pushState(room: ServerRoom): void {
    const now = Date.now();
    for (const player of room.players.values()) {
      if (!player.connected || !player.socketId) continue;
      this.io.to(player.socketId).emit('state', this.buildState(room, player, now));
    }
  }

  private buildState(room: ServerRoom, viewer: ServerPlayer, now: number): PublicState {
    const isArtist = viewer.id === room.artistId;
    const isDrawing = room.phase === 'drawing';

    const players = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatarSeed: player.avatarSeed,
        cosmetic: player.cosmetic,
        score: player.score,
        roundPoints: player.roundPoints,
        streak: player.streak,
        isHost: player.id === room.hostId,
        isSpectator: player.isSpectator,
        connected: player.connected,
        stats: { ...player.stats },
      }));

    return {
      code: room.code,
      phase: room.phase,
      round: room.round,
      totalRounds: room.settings.rounds,
      artistId: room.artistId,
      phaseEndsAt: room.phaseEndsAt,
      serverNow: now,
      hostId: room.hostId,
      settings: room.settings,
      players,
      you: {
        id: viewer.id,
        isArtist,
        isSpectator: viewer.isSpectator,
        word: isArtist && isDrawing ? room.word : null,
        maskedWord: !isArtist && isDrawing && room.word ? maskWord(room.word, room.hintIndices) : null,
        choices: isArtist && room.phase === 'choosing' ? room.choices : [],
        canDraw: isArtist && isDrawing,
        votedRematch: room.rematchVotes.has(viewer.id),
      },
      turnOrder: room.turnOrder,
      turnIndex: room.turnIndex,
      hintIndices: room.hintIndices,
      guessedIds: Array.from(room.guessed.keys()),
      roundResult: room.roundResult,
      gameResults: room.gameResults,
      rematchVotes: room.rematchVotes.size,
      rematchNeeded: this.rematchVoteCount(room),
    };
  }

  private pushCanvas(room: ServerRoom, socketId?: string): void {
    const payload = {
      baseImage: room.baseImage,
      strokes: room.strokes,
      active: Array.from(room.activeStrokes.values()),
    };

    if (socketId) {
      this.io.to(socketId).emit('canvas:init', payload);
      return;
    }
    for (const player of room.players.values()) {
      if (player.connected && player.socketId) {
        this.io.to(player.socketId).emit('canvas:init', payload);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Timers & housekeeping
  // ---------------------------------------------------------------------------

  private ensureTimer(room: ServerRoom): void {
    if (room.timer) return;
    room.timer = setInterval(() => this.tick(room), 250);
    room.timer.unref?.();
  }

  private stopTimer(room: ServerRoom): void {
    if (!room.timer) return;
    clearInterval(room.timer);
    room.timer = null;
  }

  private tick(room: ServerRoom): void {
    const now = Date.now();

    if (room.phase === 'lobby' || room.phase === 'game_end') {
      this.stopTimer(room);
      return;
    }

    if (room.phase === 'choosing') {
      if (room.phaseEndsAt && now >= room.phaseEndsAt) {
        const choices = room.choices;
        if (!choices.length) {
          this.advanceTurn(room);
          return;
        }
        const pick = choices[randomInt(0, choices.length)];
        const result = this.applyWordChoice(room, pick.word);
        if (!result.ok) this.advanceTurn(room);
      }
      return;
    }

    if (room.phase === 'drawing') {
      const artist = room.players.get(room.artistId ?? '');
      if (
        artist &&
        !artist.connected &&
        room.artistDisconnectedAt &&
        now - room.artistDisconnectedAt > TIMING.reconnectGraceMs
      ) {
        this.system(room, `${artist.nickname} did not reconnect — skipping their turn.`);
        this.advanceTurn(room);
        return;
      }

      if (room.phaseEndsAt) {
        const drawMs = room.settings.drawTime * 1000;
        const elapsed = clamp(drawMs - (room.phaseEndsAt - now), 0, drawMs);
        const hints = room.settings.hints;
        const due =
          hints > 0 && room.word
            ? Math.min(hints, Math.floor((elapsed / drawMs) * (hints + 1)))
            : 0;

        if (due > room.hintIndices.length && room.word) {
          const available = letterIndices(room.word).filter((index) => !room.hintIndices.includes(index));
          while (room.hintIndices.length < due && available.length > 0) {
            const pick = randomInt(0, available.length);
            room.hintIndices.push(available.splice(pick, 1)[0]);
          }
          this.pushState(room);
        }

        if (now >= room.phaseEndsAt) {
          this.endRound(room);
          return;
        }
      }

      if (room.guessed.size >= this.eligibleGuesserIds(room).length && room.phaseEndsAt && now >= room.phaseEndsAt) {
        this.endRound(room);
      }
      return;
    }

    if (room.phase === 'round_end') {
      if (room.phaseEndsAt && now >= room.phaseEndsAt) {
        this.advanceTurn(room);
      }
    }
  }

  private sweep(): void {
    const now = Date.now();

    for (const room of Array.from(this.rooms.values())) {
      for (const player of Array.from(room.players.values())) {
        if (
          !player.connected &&
          player.disconnectedAt &&
          now - player.disconnectedAt > TIMING.disconnectedTtlMs
        ) {
          this.removePlayer(room, player, 'timeout');
        }
      }

      if (!this.rooms.has(room.code)) continue;

      const activeCount = Array.from(room.players.values()).filter((player) => player.connected).length;
      if (activeCount === 0 && now - room.lastActivity > TIMING.emptyRoomTtlMs) {
        this.destroyRoom(room, 'Room closed after inactivity.');
        continue;
      }

      if (room.phase === 'game_end' && now - room.lastActivity > TIMING.gameEndTtlMs) {
        this.destroyRoom(room, 'Room closed after inactivity.');
        continue;
      }

      const participantsLeft = this.participantIds(room).filter((id) => room.players.get(id)?.connected);
      if (
        (room.phase === 'drawing' || room.phase === 'choosing' || room.phase === 'round_end') &&
        participantsLeft.length < LIMITS.minPlayers &&
        activeCount > 0
      ) {
        this.system(room, 'Not enough players left — ending the game.');
        this.endGame(room);
      }
    }
  }
}
