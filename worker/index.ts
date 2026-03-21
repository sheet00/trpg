interface Env {
  MODEL_ID?: string;
  OPENROUTER_API_KEY?: string;
}

const DEFAULT_MAX_TOKENS = 2000;

type ChatMessage = {
  role: string;
  content: string;
};

type ChatCompletionRequest = {
  model?: string;
  messages: ChatMessage[];
  response_format?: unknown;
  tools?: unknown[];
  tool_choice?: unknown;
  max_tokens?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
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
    const url = new URL(request.url);
    console.log("request", request.method, url.pathname);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method === "GET") {
      return jsonResponse({
        message: "OpenRouter proxy worker",
        methods: ["POST"],
        path: url.pathname,
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          ...corsHeaders,
          Allow: "GET, POST",
        },
      });
    }

    if (url.pathname !== "/" && url.pathname !== "/api") {
      return jsonResponse({ error: "Not Found" }, 404);
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

    console.log("MODEL_ID", model);

    const requestBody: any = {
      model,
      messages: payload.messages,
      max_tokens: payload.max_tokens ?? DEFAULT_MAX_TOKENS,
    };

    if (payload.response_format) requestBody.response_format = payload.response_format;
    if (payload.tools) requestBody.tools = payload.tools;
    if (payload.tool_choice) requestBody.tool_choice = payload.tool_choice;

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
        body: JSON.stringify(requestBody),
      },
    );

    const result = (await response.json()) as any;

    // Tool Call がある場合は、その引数を content として差し替えてフロントに返す
    if (result.choices?.[0]?.message?.tool_calls?.[0]) {
      const toolCall = result.choices[0].message.tool_calls[0];
      const functionArgs = toolCall.function.arguments;
      
      // フロントエンドが期待する通常のレスポンス形式に整形
      result.choices[0].message.content = functionArgs;
      // 不要な tool_calls フィールドを削除（念のため）
      delete result.choices[0].message.tool_calls;
    }

    return jsonResponse(result, response.status);
  },
};
