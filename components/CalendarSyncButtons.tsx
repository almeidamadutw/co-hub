"use client";

import { useMemo } from "react";
import { baixarArquivoICS, EventoAgendaICS } from "@/utils/ics";

type CalendarSyncButtonsProps = {
  eventos?: EventoAgendaICS[];
};

function lerEventosDoLocalStorage(): EventoAgendaICS[] {
  if (typeof window === "undefined") return [];

  try {
    const bruto = localStorage.getItem("ceoclub_agenda");

    if (!bruto) return [];

    const dados = JSON.parse(bruto);

    if (!Array.isArray(dados)) return [];

    return dados
      .map((item, index) => {
        const data = item.data;
        const horario = item.horario;
        const mentorado = item.mentorado;
        const tipo = item.tipo;

        // Sem dados mínimos reais, não exporta nada.
        if (!data || !horario || !mentorado || !tipo) return null;

        const inicio = new Date(`${data}T${horario}:00`);
        const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

        if (Number.isNaN(inicio.getTime())) return null;
        if (Number.isNaN(fim.getTime())) return null;

        return {
          id: String(item.id || index),
          titulo: `${tipo} com ${mentorado}`,
          descricao: item.observacao || "",
          local: item.local || "",
          inicio,
          fim,
        };
      })
      .filter(Boolean) as EventoAgendaICS[];
  } catch {
    return [];
  }
}

export default function CalendarSyncButtons({
  eventos,
}: CalendarSyncButtonsProps) {
  const eventosTratados = useMemo(() => {
    if (eventos) return eventos;
    return lerEventosDoLocalStorage();
  }, [eventos]);

  function getBaseUrl() {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }

  function getIcsUrl() {
    return `${getBaseUrl()}/api/calendar/ics`;
  }

  function baixarAgenda() {
    baixarArquivoICS(eventosTratados);
  }

  function abrirGoogleCalendar() {
    const url = getIcsUrl();

    const googleUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(
      url
    )}`;

    window.open(googleUrl, "_blank");
  }

  function abrirAppleCalendar() {
    const url = getIcsUrl();
    const appleUrl = url.replace(/^https?:\/\//, "webcal://");

    window.location.href = appleUrl;
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
          Integração de agenda
        </p>

        <h3 className="text-2xl font-black text-[#08163F]">
          Sincronizar com Apple ou Google
        </h3>

        <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          Exporte os compromissos cadastrados na agenda para calendários externos.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={baixarAgenda}
          className="rounded-2xl bg-[#08163F] px-5 py-4 text-left text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
        >
          Baixar .ics
          <span className="mt-1 block text-xs font-bold text-blue-100">
            Importar manualmente
          </span>
        </button>

        <button
          type="button"
          onClick={abrirGoogleCalendar}
          className="rounded-2xl bg-white px-5 py-4 text-left text-sm font-black text-[#08163F] shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Google Calendar
          <span className="mt-1 block text-xs font-bold text-slate-500">
            Abrir calendário
          </span>
        </button>

        <button
          type="button"
          onClick={abrirAppleCalendar}
          className="rounded-2xl bg-white px-5 py-4 text-left text-sm font-black text-[#08163F] shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Apple Calendar
          <span className="mt-1 block text-xs font-bold text-slate-500">
            Abrir calendário
          </span>
        </button>
      </div>

      {eventosTratados.length === 0 && (
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500">
          Nenhum compromisso cadastrado ainda.
        </div>
      )}
    </section>
  );
}