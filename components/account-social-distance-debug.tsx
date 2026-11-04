import type { AccountSocialDistance } from "@/lib/account-social-distance";

export function AccountSocialDistanceDebug({ rows }: { rows: AccountSocialDistance[] }) {
  return <section className="account-distance-debug" aria-label="Temporary account distance diagnostic">
    <div className="account-section-heading"><div><p className="eyebrow">Temporary diagnostic</p><h2>Social distance to accounts</h2></div><span>{rows.length}</span></div>
    <p>Distance is calculated from profile links between accounts: an active follow, a shared Circle, or a shared meta-profile. Distance counts intermediaries: 0 is yourself or a direct contact. A profile set to distance N is hidden from accounts whose distance is below N.</p>
    {rows.length ? <div className="account-distance-table-wrap"><table className="account-distance-table"><thead><tr><th>Account</th><th>Account ID</th><th>Distance</th></tr></thead><tbody>{rows.map((row) => <tr key={row.accountId}><td>{row.displayName}</td><td><code>{row.accountId}</code></td><td>{row.distance === null ? "No link" : row.distance}</td></tr>)}</tbody></table></div> : <p className="account-empty">No account distance data available.</p>}
  </section>;
}
