import { NextResponse } from 'next/server';
import { getGameServer } from '@/server/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const game = getGameServer();
  return NextResponse.json({
    ok: true,
    service: 'sketchrush',
    uptime: Math.round(process.uptime()),
    rooms: game?.roomCount ?? 0,
    players: game?.playerCount ?? 0,
  });
}
