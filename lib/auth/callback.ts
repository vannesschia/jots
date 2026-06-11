export type AuthCallback =
  | { kind: "code"; code: string }
  | { kind: "invalid" };

export function parseAuthCallback(url: URL): AuthCallback {
  const code = url.searchParams.get("code");

  if (code) {
    return { kind: "code", code };
  }

  return { kind: "invalid" };
}
