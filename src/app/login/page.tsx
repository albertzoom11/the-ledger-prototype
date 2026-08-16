import { redirect } from "next/navigation";
import { getCurrentUser } from "@/ledger/auth/session";
import { LoginForm } from "@/ledger/auth/LoginForm";
import { safeNextPath } from "@/ledger/auth/redirects";

export const metadata = { title: "Sign in — The Ledger" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNextPath(next));

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-ink text-[13px] font-bold text-white">
            L
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">
              The Ledger
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted">
              Internal Operations Platform
            </div>
          </div>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
