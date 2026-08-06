import type { ReactNode } from "react";
import { formatarDataTicket, normalizarTicket } from "@/utils/tickets";

type TicketMensagemBolhaProps = {
  lado: "usuario" | "suporte" | "sistema";
  nome: string;
  role?: string | null;
  data: string | null;
  children: ReactNode;
};

export default function TicketMensagemBolha({
  lado,
  nome,
  role,
  data,
  children,
}: TicketMensagemBolhaProps) {
  const sistema = lado === "sistema";
  const usuario = lado === "usuario";

  if (sistema) {
    return (
      <div className="flex justify-center py-1">
        <div className="max-w-[92%] rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-center text-xs font-bold leading-5 text-slate-500">
          {children} • {formatarDataTicket(data)}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${usuario ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-[22px] p-4 shadow-sm sm:max-w-[82%] ${
          usuario ? "bg-[#08163F] text-white" : "bg-white text-[#08163F]"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p
            className={`text-xs font-black uppercase tracking-[0.14em] ${
              usuario ? "text-white/70" : "text-gray-400"
            }`}
          >
            {nome}
          </p>

          {role && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${
                usuario
                  ? "bg-white/10 text-white/80"
                  : "bg-[#f3f5f8] text-gray-500"
              }`}
            >
              {normalizarTicket(role) === "mentorado" ? "Mentorado" : role}
            </span>
          )}
        </div>

        <div className="whitespace-pre-wrap break-words text-sm font-semibold leading-6">
          {children}
        </div>

        <p
          className={`mt-3 text-[11px] font-bold ${
            usuario ? "text-white/60" : "text-gray-400"
          }`}
        >
          {formatarDataTicket(data)}
        </p>
      </div>
    </div>
  );
}
