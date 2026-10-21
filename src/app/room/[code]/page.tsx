import type { Metadata } from 'next';
import { RoomClient } from '@/components/room/RoomClient';
import { BRAND } from '@/lib/brand';

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Room ${code.toUpperCase()}`,
    description: `Join room ${code.toUpperCase()} on ${BRAND.name} and play a live drawing and guessing game.`,
    robots: { index: false, follow: false },
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}
