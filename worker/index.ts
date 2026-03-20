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

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://trpg.yudemen.net",
]);

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

function getCorsHeaders(origin: string | null) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function applyCorsHeaders(response: Response, origin: string | null) {
  const corsHeaders = getCorsHeaders(origin);

  if (!corsHeaders) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env) {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      const corsHeaders = getCorsHeaders(origin);

      if (!corsHeaders) {
        return jsonResponse({ error: "許可されていない Origin です。" }, 403);
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method === "GET") {
      return applyCorsHeaders(
        jsonResponse({
          message: "OpenRouter proxy worker",
          methods: ["POST"],
        }),
        origin,
      );
    }

    if (request.method !== "POST") {
      return applyCorsHeaders(
        new Response("Method Not Allowed", {
          status: 405,
          headers: {
            Allow: "GET, POST, OPTIONS",
          },
        }),
        origin,
      );
    }

    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: "許可されていない Origin です。" }, 403);
    }

    if (!env.OPENROUTER_API_KEY) {
      return applyCorsHeaders(
        jsonResponse(
          { error: "OPENROUTER_API_KEY が設定されていません。" },
          500,
        ),
        origin,
      );
    }

    const payload = await request.json().catch(() => null);

    if (!isChatCompletionRequest(payload)) {
      return applyCorsHeaders(
        jsonResponse({ error: "不正なリクエスト形式です。" }, 400),
        origin,
      );
    }

    const model = payload.model ?? env.MODEL_ID;

    if (!model) {
      return applyCorsHeaders(
        jsonResponse({ error: "MODEL_ID が設定されていません。" }, 500),
        origin,
      );
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

    return applyCorsHeaders(
      new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      origin,
    );
  },
};
