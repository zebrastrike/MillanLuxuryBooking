import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isJsonResponse = (res: Response) =>
  (res.headers.get("content-type") || "").toLowerCase().includes("application/json");

const isLikelyHtml = (text: string) => /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);

export async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const cloned = res.clone();
    const contentType = res.headers.get("content-type") || "";
    let body: unknown;
    let message: string;

    try {
      if (isJsonResponse(res)) {
        body = await cloned.json();
        message = typeof body === "object" && body !== null && "message" in body
          ? String((body as any).message)
          : res.statusText;
      } else {
        const text = await cloned.text();
        body = text;
        const trimmed = text.trim();
        const htmlHint = isLikelyHtml(trimmed) ? " (received HTML error page)" : "";
        message = trimmed ? `${trimmed.slice(0, 200)}${trimmed.length > 200 ? "…" : ""}${htmlHint}` : res.statusText;
      }
    } catch {
      const text = await res.text();
      body = text;
      message = text || res.statusText;
    }

    throw new ApiError(res.status, message, { body, contentType });
  }
}

export async function ensureJsonResponse(res: Response, context?: string) {
  if (isJsonResponse(res)) return res;

  const text = await res.text();
  const snippet = text.trim().slice(0, 200);
  const hint = isLikelyHtml(snippet) ? "The server returned HTML (likely an error page)." : "Response was not JSON.";
  const label = context ? `${context}` : "API";
  const message = `Expected JSON from ${label}. ${hint}${snippet ? ` — Received: ${snippet}` : ""}`;

  throw new ApiError(res.status || 520, message, { body: text, contentType: res.headers.get("content-type") });
}

export async function parseJsonResponse<T = any>(res: Response, context?: string): Promise<T> {
  await ensureJsonResponse(res, context);
  return res.json() as Promise<T>;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  await ensureJsonResponse(res, url);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const requestUrl = queryKey.join("/") as string;
    const res = await fetch(requestUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    await ensureJsonResponse(res, requestUrl);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
