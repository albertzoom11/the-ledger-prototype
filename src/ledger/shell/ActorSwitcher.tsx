"use client";

import { useTransition } from "react";
import type { Actor } from "../auth/actor";
import type { UserRecord } from "../auth/users";
import { ROLE_LABELS } from "../auth/roles";
import { switchActor } from "./actions";

/**
 * Prototype-only identity switcher. It writes a cookie and the server re-reads
 * the actor; no client code can grant itself a permission this way.
 */
export function ActorSwitcher({
  actor,
  actors,
}: {
  actor: Actor;
  actors: UserRecord[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
        Signed in as
      </span>
      <select
        value={actor.id}
        disabled={isPending}
        onChange={(event) => {
          const id = event.target.value;
          startTransition(() => {
            void switchActor(id);
          });
        }}
        className="h-7 rounded border border-line bg-surface px-1.5 text-[12px] text-ink"
      >
        {actors.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name} — {ROLE_LABELS[candidate.role]}
          </option>
        ))}
      </select>
    </label>
  );
}
