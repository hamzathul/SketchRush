export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hamzathul.site';

export const BRAND = {
  name: 'SketchRush',
  tagline: 'Draw. Guess. Chaos.',
  description:
    'A fast, free multiplayer drawing and guessing game. Create a room, share the code, and battle your friends with a pen.',
  url: SITE_URL,
} as const;
