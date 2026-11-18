import type { ReactNode } from "react";

export default function MentorLayout({ children }: { children: ReactNode }) {
  return <div className="ceo-workspace">{children}</div>;
}
