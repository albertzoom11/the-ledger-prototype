import { RefundDetailScreen } from "@/apps/refunds/ui/RefundDetailScreen";
import { requireActor } from "@/platform/access";

export default async function RefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireActor(`/refunds/${id}`);
  return <RefundDetailScreen actor={actor} refundId={id} />;
}
