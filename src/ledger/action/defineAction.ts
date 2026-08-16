import { ZodType, type ZodTypeDef } from "zod";
import { Actor, ForbiddenError, requirePermission } from "../auth/actor";
import type { Permission } from "../auth/roles";
import { AuditDraft, recordAuditEvent } from "../audit/auditLog";

/**
 * Ledger platform: the single way applications expose a mutating business
 * action.
 *
 * Every action gets, in this order:
 *   1. schema validation of untrusted input,
 *   2. server-side permission enforcement,
 *   3. domain rule execution,
 *   4. an audit event — including for denied and rule-rejected attempts.
 *
 * Because the wrapper owns steps 1, 2 and 4, an application cannot ship a
 * mutation that is authorised only in the UI.
 */

export class RuleViolationError extends Error {
  readonly code = "RULE_VIOLATION" as const;
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "RuleViolationError";
  }
}

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "VALIDATION"
  | "FORBIDDEN"
  | "RULE_VIOLATION"
  | "NOT_FOUND"
  | "UNEXPECTED";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  field?: string;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export interface ActionContext {
  actor: Actor;
}

export interface ActionDefinition<TInput, TOutput> {
  name: string;
  permission: Permission;
  /** Third parameter is `unknown`: input arrives untrusted from the client. */
  input: ZodType<TInput, ZodTypeDef, unknown>;
  handler: (input: TInput, context: ActionContext) => TOutput;
  /** Audit metadata for the attempt; called for success and failure alike. */
  audit: (args: {
    input: TInput | null;
    output: TOutput | null;
    context: ActionContext;
  }) => AuditDraft;
}

export function defineAction<TInput, TOutput>(
  definition: ActionDefinition<TInput, TOutput>,
) {
  return async function invoke(
    rawInput: unknown,
    context: ActionContext,
  ): Promise<ActionResult<TOutput>> {
    const parsed = definition.input.safeParse(rawInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: issue?.message ?? "Invalid input",
          field: issue?.path.map(String).join("."),
        },
      };
    }
    const input = parsed.data;

    try {
      requirePermission(context.actor, definition.permission);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        audit(definition, { input, output: null, context }, "DENIED", {
          reason: error.message,
          requiredPermission: definition.permission,
        });
        return { ok: false, error: { code: "FORBIDDEN", message: error.message } };
      }
      throw error;
    }

    try {
      const output = definition.handler(input, context);
      audit(definition, { input, output, context }, "SUCCESS");
      return { ok: true, data: output };
    } catch (error) {
      if (error instanceof RuleViolationError) {
        audit(definition, { input, output: null, context }, "REJECTED_BY_RULE", {
          reason: error.message,
        });
        return {
          ok: false,
          error: {
            code: "RULE_VIOLATION",
            message: error.message,
            field: error.field,
          },
        };
      }
      if (error instanceof NotFoundError) {
        return { ok: false, error: { code: "NOT_FOUND", message: error.message } };
      }
      const message = error instanceof Error ? error.message : "Unexpected error";
      return { ok: false, error: { code: "UNEXPECTED", message } };
    }
  };
}

function audit<TInput, TOutput>(
  definition: ActionDefinition<TInput, TOutput>,
  args: { input: TInput | null; output: TOutput | null; context: ActionContext },
  outcome: "SUCCESS" | "DENIED" | "REJECTED_BY_RULE",
  extraMetadata: Record<string, unknown> = {},
): void {
  const draft = definition.audit(args);
  recordAuditEvent(
    {
      ...draft,
      outcome,
      metadata: { ...draft.metadata, ...extraMetadata, action: definition.name },
    },
    args.context.actor,
  );
}
