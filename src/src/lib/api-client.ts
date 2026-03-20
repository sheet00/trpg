const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

type ChatMessage = {
  role: string
  content: string
}

type ChatCompletionRequest = {
  model?: string
  messages: ChatMessage[]
  response_format?: unknown
}

type ChatCompletionResponse = {
  error?: { message?: string }
  choices?: Array<{ message?: { content?: unknown } }>
}

export async function postChatCompletion(
  payload: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const response = await fetch(`${API_BASE_URL}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse

  if (!response.ok) {
    throw new Error(data.error?.message ?? `HTTP error: ${response.status}`)
  }

  return data
}
