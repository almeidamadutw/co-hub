import Image from "next/image";

type PageLoadingProps = {
  pagina?: string;
  mensagem?: string;
};

export default function PageLoading({
  pagina = "página",
  mensagem,
}: PageLoadingProps) {
  const texto = mensagem ?? `Carregando ${pagina}...`;

  return (
    <main
      className="flex min-h-screen w-full items-center justify-center bg-[#f3f5f8] px-4 py-8 text-[#08163F]"
      aria-busy="true"
      aria-live="polite"
    >
      <section
        className="w-full max-w-[460px] rounded-[30px] border border-white/80 bg-white/95 px-6 py-8 text-center shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-10 sm:py-9"
        role="status"
      >
        <div className="relative mx-auto h-[62px] w-[62px] overflow-hidden rounded-[20px] bg-[#07122F] shadow-[0_12px_28px_rgba(8,22,63,0.24)] ring-1 ring-white/70">
          <Image
            src="/images/logo.jpeg"
            alt="Logo CEO Club"
            fill
            priority
            sizes="62px"
            className="object-cover"
          />
        </div>

        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.34em] text-slate-400 sm:text-xs">
          CEO Club
        </p>

        <h1 className="mt-3 break-words text-xl font-black leading-tight text-[#08163F] sm:text-2xl">
          {texto}
        </h1>

        <div
          className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-44"
          aria-hidden="true"
        >
          <span className="ceo-loading-progress block h-full rounded-full bg-gradient-to-r from-[#7886B8] via-[#12317C] to-[#7886B8]" />
        </div>
      </section>
    </main>
  );
}
