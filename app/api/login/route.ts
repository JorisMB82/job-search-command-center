import { NextResponse } from "next/server";
import { createSessionToken, isAccessPasswordConfigured, SESSION_COOKIE_NAME } from "../../../lib/auth";

const REMEMBERED_DEVICE_DAYS = 90;

export async function POST(request: Request) {
  if (!isAccessPasswordConfigured()) {
    return NextResponse.json({ error: "APP_ACCESS_PASSWORD is not configured." }, { status: 500 });
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const expected = process.env.APP_ACCESS_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const requestedNext = String(formData.get("next") || "/");
  const safeNext = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const response = NextResponse.redirect(new URL(safeNext, request.url), { status: 303 });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * REMEMBERED_DEVICE_DAYS,
  });
  return response;
}
