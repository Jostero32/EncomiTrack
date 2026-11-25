import { AlertCircle } from "lucide-react";

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
