import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/ledger/shell/AppShell";
import { listUsers } from "@/ledger/auth/users";
import { databaseIsSeeded } from "@/ledger/data/db";
import { getActor } from "@/platform/access";
import { INSTALLED_APPS } from "@/platform/apps";
import { bootstrapLedger } from "@/platform/bootstrap";
import { ErrorState } from "@/ledger/ui/primitives";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "The Ledger — Internal Operations Platform",
  description:
    "Internal source-of-truth workspace for operational tools at a fintech company.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  bootstrapLedger();
  const seeded = databaseIsSeeded();

  if (!seeded) {
    return (
      <html lang="en" className={inter.variable}>
        <body>
          <div className="mx-auto max-w-lg p-8">
            <ErrorState
              title="The Ledger database is empty"
              description="Run `npm run seed` to load synthetic customers, transactions and refunds, then reload."
            />
          </div>
        </body>
      </html>
    );
  }

  const [actor, actors] = [await getActor(), listUsers()];

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppShell actor={actor} actors={actors} apps={INSTALLED_APPS}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
