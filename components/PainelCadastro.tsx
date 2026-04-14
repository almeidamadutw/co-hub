"use client";

import { ReactNode } from "react";

type PainelCadastroProps = {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: ReactNode;
};

export default function PainelCadastro({
  aberto,
  titulo,
  subtitulo,
  onFechar,
  children,
}: PainelCadastroProps) {
  if (!aberto) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-[#1A1F4D]">{titulo}</h2>
          {subtitulo && (
            <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onFechar}
          className="bg-gray-100 hover:bg-gray-200 text-[#1A1F4D] px-4 py-2 rounded-xl font-semibold transition"
        >
          Fechar
        </button>
      </div>

      {children}
    </div>
  );
}