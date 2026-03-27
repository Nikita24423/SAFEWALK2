/**
 * Прокси к Python-боту (FastAPI /sos). URL бэкенда: SOS_BACKEND_URL (например http://127.0.0.1:8000).
 * Общий секрет с ботом: SOS_SHARED_SECRET (опционально).
 *
 * 502 = Next.js не смог подключиться к бэкенду (не запущен python, неверный SOS_BACKEND_URL,
 * или приложение на Vercel/хостинге без публичного URL бота — localhost там не ваш ПК).
 */
export const dynamic = "force-dynamic";

const DEFAULT_BACKEND = "http://127.0.0.1:8000";

function backendHint() {
  return (
    "Сервер SOS недоступен. Локально запустите: python telegram_bot/main.py " +
    "(порт 8000). На хостинге задайте в .env переменную SOS_BACKEND_URL с URL того же сервера, " +
    "где крутится бот (не http://127.0.0.1 для продакшена)."
  );
}

function unwrapFetchError(e) {
  if (!(e instanceof Error)) return String(e);
  const parts = [e.message];
  const c = e.cause;
  if (c instanceof Error) parts.push(c.message);
  return parts.join(" — ");
}

export async function GET() {
  const base = (process.env.SOS_BACKEND_URL || DEFAULT_BACKEND).replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return Response.json({
      ok: res.ok,
      backend: base,
      health: data,
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        backend: base,
        error: unwrapFetchError(e),
        hint: backendHint(),
      },
      { status: 502 },
    );
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const base = (process.env.SOS_BACKEND_URL || DEFAULT_BACKEND).replace(/\/$/, "");
  const secret = process.env.SOS_SHARED_SECRET || "";

  const headers = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers["X-SOS-Secret"] = secret;
  }

  try {
    const res = await fetch(`${base}/sos`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: unwrapFetchError(e),
        hint: backendHint(),
        backend: base,
      },
      { status: 502 },
    );
  }
}
