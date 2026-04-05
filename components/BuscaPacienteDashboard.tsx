"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/utils/useLocalStorage";

type PacienteBusca = {
  nome: string;
  cpf: string;
  telefone: string;
  procedimento: string;
  status: string;
};

type BuscaPacienteDashboardProps = {
  pacientes: PacienteBusca[];
};

const STORAGE_KEY_BUSCAS = "cohub_buscas_recentes_pacientes";

export default function BuscaPacienteDashboard({
  pacientes,
}: BuscaPacienteDashboardProps) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [buscasRecentes, setBuscasRecentes] = useLocalStorage<PacienteBusca[]>(
    STORAGE_KEY_BUSCAS,
    []
  );

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return [];

    return pacientes
      .filter((paciente) => {
        return (
          paciente.nome.toLowerCase().includes(termo) ||
          paciente.cpf.toLowerCase().includes(termo) ||
          paciente.telefone.toLowerCase().includes(termo)
        );
      })
      .slice(0, 6);
  }, [busca, pacientes]);

  function abrirPaciente(paciente: PacienteBusca) {
    const atualizados = [
      paciente,
      ...buscasRecentes.filter((item) => item.cpf !== paciente.cpf),
    ].slice(0, 5);

    setBuscasRecentes(atualizados);

    router.push(`/pacientes?paciente=${encodeURIComponent(paciente.cpf)}`);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1F4D]">
            Busca rápida de pacientes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Pesquise e abra direto a ficha do paciente.
          </p>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full border border-gray-300 rounded-2xl px-4 py-4 pr-12 bg-white outline-none focus:border-[#D4AF37]"
        />

        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
          🔎
        </div>
      </div>

      {busca.trim() && (
        <div className="mt-4 space-y-3">
          {resultados.length > 0 ? (
            resultados.map((paciente) => (
              <button
                key={paciente.cpf}
                type="button"
                onClick={() => abrirPaciente(paciente)}
                className="w-full text-left bg-[#FAFAFC] border border-gray-200 rounded-2xl p-4 hover:border-[#D4AF37] transition"
              >
                <p className="font-semibold text-[#1A1F4D]">{paciente.nome}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {paciente.cpf} • {paciente.telefone}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {paciente.procedimento} • {paciente.status}
                </p>
              </button>
            ))
          ) : (
            <div className="mt-4 border border-dashed border-gray-300 rounded-2xl p-4 text-sm text-gray-500">
              Nenhum paciente encontrado.
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="text-sm font-semibold text-[#1A1F4D]">
            Últimos pacientes pesquisados
          </h3>

          {buscasRecentes.length > 0 && (
            <button
              type="button"
              onClick={() => setBuscasRecentes([])}
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              Limpar histórico
            </button>
          )}
        </div>

        <div className="space-y-2">
          {buscasRecentes.length > 0 ? (
            buscasRecentes.map((paciente) => (
              <button
                key={paciente.cpf}
                type="button"
                onClick={() => abrirPaciente(paciente)}
                className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 bg-white hover:bg-gray-50 transition"
              >
                <p className="font-medium text-[#1A1F4D]">{paciente.nome}</p>
                <p className="text-xs text-gray-500 mt-1">{paciente.cpf}</p>
              </button>
            ))
          ) : (
            <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-4">
              Nenhuma busca recente salva ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}