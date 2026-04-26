export async function POST(req: Request) {
  try {
    const text = await req.text();   // 🔥 先拿原始数据
    const body = JSON.parse(text);   // 再手动解析

    console.log("Feishu Event:", body);

    // ✅ 飞书验证
    if (body.challenge) {
      return new Response(
        JSON.stringify({ challenge: body.challenge }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Error:", e);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}