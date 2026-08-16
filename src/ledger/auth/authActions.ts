"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ANONYMOUS_ACTOR, recordAuditEvent } from "../audit/auditLog";
import { safeNextPath } from "./redirects";
import {
  SESSION_COOKIE,
  userForSessionToken,
  pruneExpiredSessions,
  revokeSession,
  signInWithPassword,
} from "./sessionStore";

/**
 * Ledger platform: authentication transport.
 *
 * Both outcomes are audited, so a brute-force attempt is visible in the same
 * audit log as refund decisions. The response never distinguishes an unknown
 * email from a wrong password.
 */

const credentials = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  next: z.string().optional(),
});

export interface SignInState {
  status: "idle" | "error";
  message?: string;
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter your email and password",
    };
  }

  const { email, password, next } = parsed.data;
  const result = signInWithPassword(email, password);

  if (!result.ok) {
    recordAuditEvent(
      {
        entityType: "session",
        entityId: email.toLowerCase(),
        action: "auth.sign_in",
        outcome: "DENIED",
        metadata: { email: email.toLowerCase(), reason: result.reason },
      },
      ANONYMOUS_ACTOR,
    );
    return {
      status: "error",
      message:
        result.reason === "LOCKED"
          ? "Too many failed attempts. This account is temporarily locked — try again in a few minutes."
          : "Incorrect email or password.",
    };
  }

  pruneExpiredSessions();

  const store = await cookies();
  store.set(SESSION_COOKIE, result.session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(result.session.expiresAt),
  });

  const userAgent = (await headers()).get("user-agent");
  recordAuditEvent(
    {
      entityType: "session",
      entityId: result.user.id,
      action: "auth.sign_in",
      metadata: {
        email: result.user.email,
        role: result.user.role,
        userAgent: userAgent ?? "",
      },
    },
    result.user,
  );

  redirect(safeNextPath(next));
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    const user = userForSessionToken(token);
    if (user) {
      recordAuditEvent(
        {
          entityType: "session",
          entityId: user.id,
          action: "auth.sign_out",
          metadata: { email: user.email },
        },
        user,
      );
    }
    revokeSession(token);
  }

  store.delete(SESSION_COOKIE);
  redirect("/login");
}
