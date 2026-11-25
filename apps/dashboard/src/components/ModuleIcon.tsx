import { FileCheck2, Landmark, Lightbulb, Wallet, LayoutGrid, type LucideProps } from "lucide-react";

const ICONS = { Lightbulb, Landmark, Wallet, FileCheck2 } as const;

export function ModuleIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? LayoutGrid;
  return <Icon {...props} />;
}
