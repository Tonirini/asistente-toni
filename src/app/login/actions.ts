"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  createSessionToken,
  verifyPin,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "").trim();
  if (!pin) return { error: "Ingresá el PIN" };

  const ok = await verifyPin(pin);
  if (!ok) return { error: "PIN incorrecto" };

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });

  redirect("/hoy");
}
