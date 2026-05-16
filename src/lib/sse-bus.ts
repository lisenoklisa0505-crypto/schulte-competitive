export interface GameEvent {
  type:
    | 'move'       // игрок сделал ход
    | 'join'       // игрок присоединился
    | 'leave'      // игрок вышел
    | 'start'      // игра началась
    | 'finish'     // игра завершена
    | 'ping';      // keep-alive
  payload: Record<string, unknown>;
}

type Subscriber = (event: GameEvent) => void;

class SseBus {
  /** sessionId → Set<callback> */
  private channels = new Map<string, Set<Subscriber>>();

  subscribe(sessionId: string, cb: Subscriber): () => void {
    if (!this.channels.has(sessionId)) {
      this.channels.set(sessionId, new Set());
    }
    this.channels.get(sessionId)!.add(cb);

    // Возвращаем функцию отписки
    return () => {
      const subs = this.channels.get(sessionId);
      if (!subs) return;
      subs.delete(cb);
      if (subs.size === 0) {
        this.channels.delete(sessionId);
      }
    };
  }

  publish(sessionId: string, event: GameEvent): void {
    const subs = this.channels.get(sessionId);
    if (!subs || subs.size === 0) return;
    for (const cb of subs) {
      try {
        cb(event);
      } catch {
        // Не даём одному сломавшемуся подписчику убить остальных
      }
    }
  }

  /** Количество активных подписчиков (для диагностики) */
  subscriberCount(sessionId: string): number {
    return this.channels.get(sessionId)?.size ?? 0;
  }
}

// Singleton — один экземпляр на процесс Node.js
export const sseBus = new SseBus();
