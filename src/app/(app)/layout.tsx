import { AppShell } from "@/ledger/shell/AppShell";
import { requireActor } from "@/ledger/auth/session";
import { databaseIsSeeded } from "@/ledger/data/db";
import { ErrorState } from "@/ledger/ui/primitives";

/**
 * Every authenticated surface renders inside this layout, so the session check
 * happens on the server before any application page runs.
 */
export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!databaseIsSeeded()) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorState
          title="The Ledger database is empty"
          description="Run `npm run seed` to load synthetic customers, transactions and refunds, then reload."
        />
      </div>
    );
  }

  const actor = await requireActor();

  return <AppShell actor={actor}>{children}</AppShell>;
}
