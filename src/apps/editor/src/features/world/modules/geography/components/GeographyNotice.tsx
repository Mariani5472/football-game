export function GeographyNotice({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  const value = error ?? message;

  if (!value) return null;

  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 text-sm",
        error
          ? "border-red-400/20 bg-red-400/5 text-red-200"
          : "border-emerald-400/10 bg-emerald-400/5 text-emerald-200",
      ].join(" ")}
    >
      {value}
    </div>
  );
}
