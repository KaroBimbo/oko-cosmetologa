export function buildApifySyncUrl({ actorId, token, timeoutSeconds = 120 }) {
  const normalizedActorId = actorId.replace("/", "~");
  const url = new URL(`https://api.apify.com/v2/acts/${normalizedActorId}/run-sync-get-dataset-items`);
  url.searchParams.set("token", token);
  url.searchParams.set("timeout", String(timeoutSeconds));
  return url.toString();
}

export async function runApifyActorSync({ actorId, token, input, timeoutSeconds = 120, requestTimeoutMs, fetcher = fetch }) {
  const controller = new AbortController();
  const timeoutMs = requestTimeoutMs ?? timeoutSeconds * 1000 + 5000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let payload;
  try {
    response = await fetcher(buildApifySyncUrl({ actorId, token, timeoutSeconds }), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    payload = await readJson(response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Apify не успел ответить за ${Math.round(timeoutMs / 1000)} сек. Уменьшите лимит конкурентов или отключите часть источников.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(extractApifyError(payload, response.status));
  }

  if (!Array.isArray(payload)) {
    throw new Error("Apify вернул неожиданный формат данных.");
  }

  return payload;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return null;
  }
}

function extractApifyError(payload, status) {
  const message = payload?.error?.message || payload?.message || "неизвестная ошибка";
  return `Apify не смог выполнить сбор данных (${status}): ${message}`;
}
