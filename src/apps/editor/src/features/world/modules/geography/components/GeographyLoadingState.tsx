export function GeographyLoadingState({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">Loading geography...</div>;
}
