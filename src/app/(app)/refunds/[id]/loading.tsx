import { Card, PageHeader, TableSkeleton } from "@/ledger/ui/primitives";

export default function LoadingRefundDetail() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Operations · Refunds"
        title="Loading refund…"
        description="Fetching customer, transaction and audit context."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Refund request" dense>
            <TableSkeleton rows={4} columns={3} />
          </Card>
          <Card title="Audit history" dense>
            <TableSkeleton rows={4} columns={2} />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Decision" dense>
            <TableSkeleton rows={3} columns={1} />
          </Card>
          <Card title="Customer" dense>
            <TableSkeleton rows={4} columns={1} />
          </Card>
        </div>
      </div>
    </div>
  );
}
