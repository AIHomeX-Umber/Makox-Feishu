export const runtime = "edge";

type FeishuEventBody = {
  challenge?: string;
  header?: {
    event_id?: string;
    event_type?: string;
  };
  event?: {
    sender?: {
      sender_id?: {
        open_id?: string;
      };
      sender_type?: string;
    };
    message?: {
      message_id?: string;
      message_type?: string;
      content?: string;
    };
  };
};

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function extractText(body: FeishuEventBody) {
  const raw = body.event?.message?.content;
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.text === "string" ? parsed.text.trim() : "";
  } catch {
    return "";
  }
}

async function getTenantAccessToken() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET");
  }

  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  );

  const data = await res.json();

  if (!data?.tenant_access_token) {
    throw new Error(`Failed to get Feishu token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token as string;
}

async function askMakox(userText: string) {
  if (!process.env.OPENAI_API_KEY) {
    return "Makox 还没有配置 OPENAI_API_KEY，请先在 Vercel 环境变量里添加。";
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是 Makox AI，面向中国制造业老板、外贸团队和品牌出海团队的企业级 AI 助理。回答要简洁、务实、有商业判断，优先给可执行步骤。不要空泛，不要堆概念。",
        },
        { role: "user", content: userText },
      ],
      temperature: 0.4,
    }),
  });

  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content ||
    `Makox 暂时没有生成回复：${JSON.stringify(data).slice(0, 300)}`
  );
}

async function replyToFeishu(openId: string, text: string) {
  const tenantAccessToken = await getTenantAccessToken();

  await fetch(
    "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tenantAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receive_id: openId,
        msg_type: "text",
        content: JSON.stringify({ text }),
      }),
    }
  );
}

export async function GET() {
  return json({ ok: true, service: "makox-feishu-ai" });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FeishuEventBody;

    // Feishu URL verification. Must return immediately.
    if (body.challenge) {
      return json({ challenge: body.challenge });
    }

    // Acknowledge first; process async so Feishu will not time out.
    const text = extractText(body);
    const openId = body.event?.sender?.sender_id?.open_id;
    const messageType = body.event?.message?.message_type;

    if (text && openId && messageType === "text") {
      (async () => {
        try {
          const answer = await askMakox(text);
          await replyToFeishu(openId, answer);
        } catch (error) {
          console.error("Makox async reply failed:", error);
        }
      })();
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Feishu webhook error:", error);
    return json({ ok: true });
  }
}
