"use client";

type CloudflareVideoEmbedProps = {
  videoUid?: string | null;
};

export default function CloudflareVideoEmbed({
  videoUid,
}: CloudflareVideoEmbedProps) {
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;

  if (!videoUid || !customerCode) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[1.5rem] bg-[#020617] p-8 text-center">
        <div>
          <p className="text-lg font-black text-white">
            Vídeo ainda não disponível
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-400">
            Assim que a mentora enviar o vídeo desta aula, ele aparecerá aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={`https://customer-${customerCode}.cloudflarestream.com/${videoUid}/iframe`}
      title="Vídeo da aula"
      className="aspect-video w-full rounded-[1.5rem] bg-black"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}