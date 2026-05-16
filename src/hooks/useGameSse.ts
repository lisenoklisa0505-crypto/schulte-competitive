import { useEffect, useRef, useState } from 'react';
import type { GameEvent } from '@/lib/sse-bus';

export type SseStatus = 'connecting' | 'open' | 'error' | 'closed';

interface UseGameSseReturn {
  lastEvent: GameEvent | null;
  status: SseStatus;
}

export function useGameSse(
  sessionId: string,
  onEvent?: (event: GameEvent) => void,
): UseGameSseReturn {
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);
  const [status, setStatus] = useState<SseStatus>('connecting');
  const onEventRef = useRef(onEvent);

  // Держим актуальную ссылку на колбэк без пересоздания эффекта
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/game-events/${sessionId}`);

    setStatus('connecting');

    es.onopen = () => setStatus('open');

    // Обрабатываем все именованные события (move, join, leave, start, finish)
    const EVENT_TYPES: GameEvent['type'][] = [
      'move', 'join', 'leave', 'start', 'finish', 'ping',
    ];

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const event: GameEvent = JSON.parse(e.data);
          // ping используется только для keep-alive, не уведомляем клиент
          if (event.type === 'ping') return;
          setLastEvent(event);
          onEventRef.current?.(event);
        } catch {
          // Игнорируем невалидный JSON
        }
      });
    }

    es.onerror = () => {
      setStatus('error');
      // EventSource сам переподключается — не закрываем принудительно
    };

    return () => {
      es.close();
      setStatus('closed');
    };
  }, [sessionId]);

  return { lastEvent, status };
}
