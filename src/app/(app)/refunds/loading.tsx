import { Card, PageHeader, TableSkeleton } from "@/ledger/ui/primitives";

export default function LoadingRefundQueue() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Operations · Refunds"
        title="Refund queue"
        description="Loading refund requests…"
      />
      <Card dense>
        <TableSkeleton rows={10} columns={7} />
      </Card>
    </div>
  );
}
