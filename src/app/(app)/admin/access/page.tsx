import { AccessControlScreen } from "@/ledger/admin/AccessControlScreen";
import { accessPolicy, requireActor } from "@/platform/access";

export default async function AccessControlPage() {
  const actor = await requireActor("/admin/access");
  return <AccessControlScreen actor={actor} policy={accessPolicy} />;
}
