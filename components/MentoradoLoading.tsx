export default function MentoradoLoading({
  mensagem = "Carregando sua jornada CEO Club...",
}: {
  mensagem?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
      <div className="w-full max-w-sm rounded-[24px] border border-white/60 bg-white/90 p-6 text-center shadow-xl shadow-slate-200/70 backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-xs font-black text-white shadow-lg">
          CEO
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
          CEO Club
        </p>

        <h1 className="mt-2 break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
          {mensagem}
        </h1>

        <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#12317C]" />
        </div>
      </div>
    </main>
  );
}