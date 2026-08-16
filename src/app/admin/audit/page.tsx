import { AuditLogScreen } from "@/ledger/admin/AuditLogScreen";
import type { SearchParams } from "@/ledger/ui/listView";
import { getActor } from "@/platform/access";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <AuditLogScreen actor={await getActor()} searchParams={searchParams} />
  );
}
