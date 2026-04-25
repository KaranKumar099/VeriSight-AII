const styles = {
  "Low Risk": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "Medium Risk": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "High Risk": "border-red-400/30 bg-red-400/10 text-red-200"
};

export function RiskBadge({ level }) {
  return (
    <span className={`inline-flex min-w-24 items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold ${styles[level] || styles["Low Risk"]}`}>
      {level || "Low Risk"}
    </span>
  );
}
