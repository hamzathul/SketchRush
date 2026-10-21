import type { GameServer } from './game-server';

declare global {
  // eslint-disable-next-line no-var
  var __sketchrush_game__: GameServer | undefined;
}

export function setGameServer(game: GameServer): void {
  globalThis.__sketchrush_game__ = game;
}

export function getGameServer(): GameServer | undefined {
  return globalThis.__sketchrush_game__;
}
