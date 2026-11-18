import type { ReactNode } from "react";

export default function MentoradoLayout({ children }: { children: ReactNode }) {
  return <div className="ceo-workspace">{children}</div>;
}
