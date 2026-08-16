import { RefundQueueScreen } from "@/apps/refunds/ui/RefundQueueScreen";
import type { SearchParams } from "@/ledger/ui/listView";
import { requireActor } from "@/platform/access";

export default async function RefundQueuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireActor("/refunds");
  return <RefundQueueScreen actor={actor} searchParams={searchParams} />;
}
