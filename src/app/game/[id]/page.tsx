'use client';

export const dynamic = 'force-dynamic';

import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import GameBoard from "@/components/GameBoard";

export default function GamePage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const { data: session } = useSession();
  
  const playerColor = '#FF6B6B';
  
  if (!session?.user) {
    return <div style={{ minHeight: '100vh', background: '#0b0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Загрузка...</div>;
  }
  
  return (
    <GameBoard
      sessionId={sessionId}
      userId={session.user.id}
      playerColor={playerColor}
    />
  );
}