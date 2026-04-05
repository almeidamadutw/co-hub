import type { ReactNode } from "react";

type FichaOverlayProps = {
  children: ReactNode;
  aberto?: boolean;
  titulo?: string;
  subtitulo?: string;
  acoes?: ReactNode;
  onFechar?: () => void;
  onClose?: () => void;
};

export default function FichaOverlay({
  children,
  aberto = true,
  titulo,
  subtitulo,
  acoes,
  onFechar,
  onClose,
}: FichaOverlayProps) {
  const handleClose = onFechar ?? onClose;

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-200">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            {titulo && <h2 className="text-2xl font-bold text-[#1A1F4D]">{titulo}</h2>}
            {subtitulo && <p className="mt-1 text-sm text-gray-500">{subtitulo}</p>}
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {acoes}
            {handleClose && (
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-50"
              >
                Fechar
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[calc(92vh-96px)] overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}