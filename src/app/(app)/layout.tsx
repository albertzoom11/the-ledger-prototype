import { AppShell } from "@/ledger/shell/AppShell";
import { databaseIsSeeded } from "@/ledger/data/db";
import { ErrorState } from "@/ledger/ui/primitives";
import { requireActor } from "@/platform/access";
import { INSTALLED_APPS } from "@/platform/apps";
import { bootstrapLedger } from "@/platform/bootstrap";

/**
 * Every authenticated surface renders inside this layout, so the session check
 * happens on the server before any application page runs, and the installed
 * applications get to create their own tables before anything queries them.
 */
export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  bootstrapLedger();

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

  return <AppShell actor={actor} apps={INSTALLED_APPS}>{children}</AppShell>;
}
