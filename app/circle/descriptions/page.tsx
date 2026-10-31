import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountDescriptionsEditor } from "@/components/account-descriptions-editor";
import { isPersistentStore } from "@/lib/debates";
import { getAccountDescription } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleDescriptionsPage() {
  const persistent = await isPersistentStore();
  const description = await getAccountDescription();
  if (!description) redirect(persistent ? "/login" : "/circle");
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Circles · private account</p><h1>Descriptions</h1></div><Link className="back-link" href="/circle">← Account</Link></div>
    <AccountDescriptionsEditor initialDescription={description} persistent={persistent} />
  </main>;
}
