"use client";

import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import GameBoard from "@/components/GameBoard";

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Пожалуйста, войдите в аккаунт</div>
      </div>
    );
  }

  const userIdNumber = parseInt(session.user.id);
  
  if (isNaN(userIdNumber)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-xl">Ошибка: некорректный ID пользователя</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GameBoard
        sessionId={parseInt(gameId)}
        userId={userIdNumber}
        playerColor="#FF6B6B"
      />
    </div>
  );
}