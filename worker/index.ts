interface Env {
  MODEL_ID?: string;
  OPENROUTER_API_KEY?: string;
}

type ChatMessage = {
  role: string;
  content: string;
};

type ChatCompletionRequest = {
  model?: string;
  messages: ChatMessage[];
  response_format?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function isChatCompletionRequest(
  value: unknown,
): value is ChatCompletionRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "messages" in value &&
    Array.isArray(value.messages) &&
    value.messages.every(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "role" in message &&
        typeof message.role === "string" &&
        "content" in message &&
        typeof message.content === "string",
    )
  );
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === "GET") {
      return jsonResponse({
        message: "OpenRouter proxy worker",
        methods: ["POST"],
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: "GET, POST",
        },
      });
    }

    if (!env.OPENROUTER_API_KEY) {
      return jsonResponse(
        { error: "OPENROUTER_API_KEY が設定されていません。" },
        500,
      );
    }

    const payload = await request.json().catch(() => null);

    if (!isChatCompletionRequest(payload)) {
      return jsonResponse({ error: "不正なリクエスト形式です。" }, 400);
    }

    const model = payload.model ?? env.MODEL_ID;

    if (!model) {
      return jsonResponse({ error: "MODEL_ID が設定されていません。" }, 500);
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://trpg-hello.sheet00.workers.dev",
          "X-Title": "TRPG Worker",
        },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          response_format: payload.response_format,
        }),
      },
    );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
};
