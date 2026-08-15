"use client";

import { Button, ErrorState } from "@/ledger/ui/primitives";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl">
      <ErrorState
        title="This view could not be loaded"
        description={error.message}
        retry={
          <Button variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
