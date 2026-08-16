import { RefundDetailScreen } from "@/apps/refunds/ui/RefundDetailScreen";
import { getActor } from "@/platform/access";

export default async function RefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, actor] = [await params, await getActor()];
  return <RefundDetailScreen actor={actor} refundId={id} />;
}
