export function TemplateMessages({ message, error }: { message: string | null; error: string | null }) {
  return (
    <>
      {message && <p className="text-sm text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </>
  );
}