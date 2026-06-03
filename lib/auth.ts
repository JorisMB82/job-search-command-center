export const SESSION_COOKIE_NAME = "jscc_session";
const SESSION_MESSAGE = "job-search-command-center:v1:authenticated";

function getPasswordSecret(): string | undefined {
  return process.env.APP_ACCESS_PASSWORD;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(): Promise<string> {
  const secret = getPasswordSecret();
  if (!secret) {
    throw new Error("APP_ACCESS_PASSWORD is not configured.");
  }
  return hmacSha256(SESSION_MESSAGE, secret);
}

export async function isValidSessionToken(token?: string): Promise<boolean> {
  const secret = getPasswordSecret();
  if (!secret || !token) {
    return false;
  }
  return token === (await hmacSha256(SESSION_MESSAGE, secret));
}

export function isAccessPasswordConfigured(): boolean {
  return Boolean(getPasswordSecret());
}
