import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/ledger/shell/AppShell";
import { getCurrentActor } from "@/ledger/auth/session";
import { listUsers } from "@/ledger/auth/users";
import { databaseIsSeeded } from "@/ledger/data/db";
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

  const [actor, actors] = [await getCurrentActor(), listUsers()];

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppShell actor={actor} actors={actors}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
