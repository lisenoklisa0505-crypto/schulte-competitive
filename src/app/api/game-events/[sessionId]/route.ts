import { sseBus, type GameEvent } from '@/lib/sse-bus';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
// Отключаем буферизацию — SSE должен стримить побайтово
export const runtime = 'nodejs';

const PING_INTERVAL_MS = 25_000;

export async function GET(
  req: Request,
  { params }: { params: { sessionId: string } },
) {
  // ── Проверка аутентификации ──────────────────────────────────────────────
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { sessionId } = params;

  // ── Создаём ReadableStream, который живёт всё время соединения ───────────
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      /** Форматируем SSE-фрейм согласно спецификации */
      const send = (event: GameEvent) => {
        try {
          const data = JSON.stringify(event);
          // SSE формат: "event: <type>\ndata: <json>\n\n"
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`),
          );
        } catch {
          // Контроллер уже закрыт (клиент отключился)
        }
      };

      // Отправляем приветственный ping сразу при подключении
      send({ type: 'ping', payload: { ts: Date.now() } });

      // Подписываемся на события этой сессии
      const unsubscribe = sseBus.subscribe(sessionId, send);

      // Keep-alive: браузер и прокси не разрывают idle-соединение
      const pingTimer = setInterval(() => {
        send({ type: 'ping', payload: { ts: Date.now() } });
      }, PING_INTERVAL_MS);

      // Очистка при разрыве соединения
      req.signal.addEventListener('abort', () => {
        clearInterval(pingTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Уже закрыт
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Запрещаем nginx/Vercel буферизировать ответ
      'X-Accel-Buffering': 'no',
    },
  });
}
