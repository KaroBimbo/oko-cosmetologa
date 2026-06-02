const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function runOpenRouterAnalysis({
  apiKey,
  model,
  prompt,
  appUrl,
  fetcher = fetch,
}) {
  const response = await fetcher(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl || "https://vercel.app",
      "X-Title": "Cosmetology Market Radar",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Ты помогаешь косметологу анализировать локальный рынок. Отвечай строго по данным, аккуратно отмечай пробелы и не выдумывай факты.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1800,
    }),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(extractOpenRouterError(payload, response.status));
  }

  return readOpenRouterMessage(payload);
}

export function readOpenRouterMessage(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter вернул пустой ответ.");
  }
  return content.trim();
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractOpenRouterError(payload, status) {
  const message = payload?.error?.message || payload?.message || "неизвестная ошибка";
  return `OpenRouter не смог подготовить отчет (${status}): ${message}`;
}
