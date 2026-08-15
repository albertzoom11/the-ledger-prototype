"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTOR_COOKIE } from "../auth/session";
import { findUser } from "../auth/users";

/** Prototype identity switch. Validates the id server-side. */
export async function switchActor(userId: string): Promise<void> {
  const user = findUser(userId);
  if (!user) throw new Error("Unknown user");
  const store = await cookies();
  store.set(ACTOR_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
