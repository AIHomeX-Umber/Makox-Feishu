export const runtime = "edge";

export async function GET() {
  return Response.json({ ok: true, service: "feishu webhook" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const challenge =
      body?.challenge ||
      body?.event?.challenge ||
      body?.data?.challenge;

    if (challenge) {
      return Response.json({ challenge });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
