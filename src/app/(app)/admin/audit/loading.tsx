import { Card, PageHeader, TableSkeleton } from "@/ledger/ui/primitives";

export default function LoadingAuditLog() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Loading audit events…"
      />
      <Card dense>
        <TableSkeleton rows={12} columns={6} />
      </Card>
    </div>
  );
}
