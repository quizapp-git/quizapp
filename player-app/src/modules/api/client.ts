export const API_BASE_URL = "https://example.com/api/app";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers)
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return (await response.json()) as T;
}

export function get<T>(path: string) {
  return request<T>(path, { method: "GET" });
}

export function post<T, B = unknown>(path: string, body: B) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

