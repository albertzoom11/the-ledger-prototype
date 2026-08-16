import { AccessControlScreen } from "@/ledger/admin/AccessControlScreen";
import { accessPolicy, getActor } from "@/platform/access";

export default async function AccessControlPage() {
  return <AccessControlScreen actor={await getActor()} policy={accessPolicy} />;
}
