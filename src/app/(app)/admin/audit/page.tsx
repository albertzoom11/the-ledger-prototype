import { AuditLogScreen } from "@/ledger/admin/AuditLogScreen";
import type { SearchParams } from "@/ledger/ui/listView";
import { requireActor } from "@/platform/access";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireActor("/admin/audit");
  return <AuditLogScreen actor={actor} searchParams={searchParams} />;
}
