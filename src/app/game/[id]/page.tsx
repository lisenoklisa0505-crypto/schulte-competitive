'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';
import GameBoard from '@/components/GameBoard';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.id as string;
  const { data: user } = trpc.auth.me.useQuery();

  if (!user) {
    router.push('/');
    return null;
  }

  if (gameId && user) {
    return (
      <GameBoard
        sessionId={parseInt(gameId)}
        userId={user.id}
        playerColor="#FF6B6B"
      />
    );
  }

  return null;
}