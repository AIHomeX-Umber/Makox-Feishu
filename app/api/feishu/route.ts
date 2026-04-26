export async function GET() {
  return Response.json({ ok: true, service: "feishu webhook" });
}

export async function POST(req: Request) {
  const body = await req.json();

  console.log("Feishu Event:", JSON.stringify(body, null, 2));

  if (body.challenge) {
    return Response.json({ challenge: body.challenge });
  }

  return Response.json({ ok: true });
}