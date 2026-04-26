export const runtime = "edge";

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return json({ ok: true, service: "feishu webhook" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Feishu URL verification expects an immediate challenge echo.
    if (body?.challenge) {
      return json({ challenge: body.challenge });
    }

    return json({ ok: true });
  } catch {
    return json({ ok: true });
  }
}
