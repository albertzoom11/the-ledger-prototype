import { RefundQueueScreen } from "@/apps/refunds/ui/RefundQueueScreen";
import type { SearchParams } from "@/ledger/ui/listView";
import { getActor } from "@/platform/access";

export default async function RefundQueuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <RefundQueueScreen actor={await getActor()} searchParams={searchParams} />
  );
}
