"use client";

type VideoAulaPlayerProps = {
  titulo: string;
  descricao?: string;
  videoUrl?: string;
  aberto: boolean;
  onFechar: () => void;
};

function converterParaEmbed(url: string) {
  if (!url) return "";

  const youtubeWatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (youtubeWatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeWatch[1]}`;
  }

  const youtubeShort = url.match(/youtu\.be\/([^?]+)/);
  if (youtubeShort?.[1]) {
    return `https://www.youtube.com/embed/${youtubeShort[1]}`;
  }

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo?.[1]) {
    return `https://player.vimeo.com/video/${vimeo[1]}`;
  }

  return url;
}

export default function VideoAulaPlayer({
  titulo,
  descricao,
  videoUrl,
  aberto,
  onFechar,
}: VideoAulaPlayerProps) {
  if (!aberto) return null;

  const embedUrl = videoUrl ? converterParaEmbed(videoUrl) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
              Aula CEO Club
            </p>

            <h2 className="mt-2 text-xl font-black md:text-2xl">{titulo}</h2>

            {descricao && (
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-blue-100">
                {descricao}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
          >
            Fechar
          </button>
        </header>

        <section className="bg-[#020617] p-3 md:p-5">
          <div className="aspect-video overflow-hidden rounded-[1.4rem] bg-black">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={titulo}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div>
                  <p className="text-lg font-black text-white">
                    Vídeo ainda não disponível
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-400">
                    Quando a mentora adicionar o link da aula, o player aparecerá aqui.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">
            Assista a aula e depois volte para continuar sua jornada.
          </p>

          <button
            type="button"
            onClick={onFechar}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Voltar para o módulo
          </button>
        </footer>
      </div>
    </div>
  );
}