const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/app";

export const API_BASE_URL = baseUrl;

async function request<T>(
  path: string,
  options?: RequestInit,
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (options && options.headers) {
    const extra = options.headers as Record<string, string>;
    for (const key of Object.keys(extra)) {
      headers[key] = extra[key];
    }
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return (await response.json()) as T;
}

export function get<T>(path: string, accessToken?: string) {
  return request<T>(path, { method: "GET" }, accessToken);
}

export function post<T, B = unknown>(
  path: string,
  body: B,
  accessToken?: string
) {
  return request<T>(
    path,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    accessToken
  );
}
