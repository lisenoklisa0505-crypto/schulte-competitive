export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('WebSocket endpoint available at ws://localhost:3000/ws', {
    status: 200,
  });
}
