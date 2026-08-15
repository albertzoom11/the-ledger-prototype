import { ButtonLink, EmptyState } from "@/ledger/ui/primitives";

export default function NotFound() {
  return (
    <EmptyState
      title="Not found"
      description="The record you were looking for does not exist in The Ledger."
      action={
        <div className="mt-2">
          <ButtonLink href="/refunds" variant="secondary" size="sm">
            Back to refund queue
          </ButtonLink>
        </div>
      }
    />
  );
}
