
"use client";

import MentoradoSidebar from "@/components/MentoradoSidebar";

type MentoradoShellProps = {
  nome: string;
  children: React.ReactNode;
};

export default function MentoradoShell({ nome, children }: MentoradoShellProps) {
  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden p-4 sm:p-5 md:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#12317C]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-[1600px]">
          {children}
        </div>
      </section>
    </main>
  );
}