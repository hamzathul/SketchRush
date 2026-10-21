import { z } from 'zod';
import { LIMITS, TOOLS } from '../lib/game-config';

const pointSchema = z.object({
  x: z.number().min(-2).max(3),
  y: z.number().min(-2).max(3),
  p: z.number().min(0).max(1).optional(),
});

export const createRoomSchema = z.object({
  nickname: z.string().min(1).max(40),
  avatarSeed: z.string().max(48).optional().default('orbit'),
  cosmetic: z.string().max(16).optional(),
});

export const joinRoomSchema = z.object({
  code: z.string().min(4).max(12),
  nickname: z.string().min(1).max(40),
  avatarSeed: z.string().max(48).optional().default('orbit'),
  cosmetic: z.string().max(16).optional(),
});

export const resumeSchema = z.object({
  code: z.string().min(4).max(12),
  playerId: z.string().min(1).max(80),
  token: z.string().min(1).max(120),
});

export const settingsSchema = z.object({
  settings: z
    .object({
      rounds: z.number().int().min(LIMITS.rounds.min).max(LIMITS.rounds.max),
      drawTime: z.number().int().min(LIMITS.drawTime.min).max(LIMITS.drawTime.max),
      maxPlayers: z.number().int().min(LIMITS.maxPlayers.min).max(LIMITS.maxPlayers.max),
      hints: z.number().int().min(LIMITS.hints.min).max(LIMITS.hints.max),
      difficulty: z.enum(['easy', 'mixed', 'hard']),
      customWords: z.array(z.string().max(LIMITS.customWords.maxLength)).max(LIMITS.customWords.max),
      locked: z.boolean(),
    })
    .partial(),
});

export const targetPlayerSchema = z.object({
  playerId: z.string().min(1).max(80),
});

export const wordChooseSchema = z.object({
  word: z.string().min(1).max(60),
});

export const strokeStartSchema = z.object({
  stroke: z.object({
    id: z.string().min(1).max(80),
    tool: z.enum(TOOLS),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    size: z.number().min(1).max(80),
    opacity: z.number().min(0).max(1),
    points: z.array(pointSchema).min(1).max(8),
  }),
});

export const strokePointsSchema = z.object({
  id: z.string().min(1).max(80),
  points: z.array(pointSchema).min(1).max(150),
});

export const strokeEndSchema = z.object({
  id: z.string().min(1).max(80),
});

export const strokeUndoSchema = z.object({
  id: z.string().min(1).max(80),
});

export const snapshotSchema = z.object({
  dataUrl: z
    .string()
    .min(30)
    .max(LIMITS.maxSnapshotChars)
    .regex(/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/),
});

export const chatSchema = z.object({
  text: z.string().min(1).max(LIMITS.chatLength.max),
  quick: z.boolean().optional(),
});

export const cosmeticSchema = z.object({
  cosmetic: z.string().max(16).nullable(),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});
