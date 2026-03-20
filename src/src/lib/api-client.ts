const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

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
};

type ChatCompletionResponse = {
  error?: { message?: string };
  choices?: Array<{ message?: { content?: unknown } }>;
};

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          item.type === "text" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

/**
 * AIとのチャットを完了させ、結果のJSONをパースして返す
 */
export async function postChatCompletion<T>(
  payload: ChatCompletionRequest,
): Promise<T> {
  const url = `${API_BASE_URL}/api`;
  const method = "POST";

  console.log(`[API Request] ${method} ${url}`, payload);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseData: ChatCompletionResponse;
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    throw new Error(
      `サーバーからのレスポンスがJSON形式ではありません。(Status: ${response.status})\nRequest: ${method} ${url}\n\n【レスポンス内容】\n${responseText}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      responseData.error?.message ?? `HTTP error: ${response.status}`,
    );
  }

  const content = extractTextContent(
    responseData.choices?.[0]?.message?.content,
  );

  if (!content) {
    throw new Error("AIからのレスポンス内容が空でした。");
  }

  try {
    return JSON.parse(content) as T;
  } catch (e) {
    console.error("AI JSON parse error:", e, content);
    throw new Error(
      `AIからのレスポンスが不正な形式です。JSONとしてパースできませんでした。\n\n【生データ】\n${content}`,
    );
  }
}
