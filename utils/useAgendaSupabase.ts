"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";

export type StatusAgenda =
  | "Confirmada"
  | "Aguardando"
  | "Concluída"
  | "Cancelada";

export type TipoAgenda = "Mentoria" | "Módulo" | "Reunião";

export type EventoAgendaSupabase = {
  id: string;
  mentorado_id: string;
  titulo: string | null;
  tipo: TipoAgenda;
  data: string;
  horario: string;
  status: StatusAgenda;
  observacao: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type NovoEventoAgenda = {
  mentorado_id: string;
  titulo?: string;
  tipo: TipoAgenda;
  data: string;
  horario: string;
  status: StatusAgenda;
  observacao?: string;
};

export function useAgendaSupabase() {
  const [eventos, setEventos] = useState<EventoAgendaSupabase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarEventos = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("agenda_eventos")
      .select(
        "id, mentorado_id, titulo, tipo, data, horario, status, observacao, criado_por, created_at, updated_at"
      )
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    setEventos((data ?? []) as EventoAgendaSupabase[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    const iniciarCarregamento = window.setTimeout(() => {
      void carregarEventos();
    }, 0);

    return () => window.clearTimeout(iniciarCarregamento);
  }, [carregarEventos]);

  const totalEventos = eventos.length;

  const confirmados = useMemo(() => {
    return eventos.filter((evento) => evento.status === "Confirmada").length;
  }, [eventos]);

  const aguardando = useMemo(() => {
    return eventos.filter((evento) => evento.status === "Aguardando").length;
  }, [eventos]);

  async function criarEvento(evento: NovoEventoAgenda) {
    setErro("");

    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase.from("agenda_eventos").insert({
      mentorado_id: evento.mentorado_id,
      titulo: evento.titulo || evento.tipo,
      tipo: evento.tipo,
      data: evento.data,
      horario: evento.horario,
      status: evento.status,
      observacao: evento.observacao || "",
      criado_por: authData.user?.id ?? null,
    });

    if (error) throw new Error(error.message);

    await carregarEventos();
  }

  async function atualizarEvento(id: string, evento: NovoEventoAgenda) {
    setErro("");

    const { error } = await supabase
      .from("agenda_eventos")
      .update({
        mentorado_id: evento.mentorado_id,
        titulo: evento.titulo || evento.tipo,
        tipo: evento.tipo,
        data: evento.data,
        horario: evento.horario,
        status: evento.status,
        observacao: evento.observacao || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    await carregarEventos();
  }

  async function excluirEvento(id: string) {
    setErro("");

    const { error } = await supabase
      .from("agenda_eventos")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    await carregarEventos();
  }

  return {
    eventos,
    carregando,
    erro,
    setErro,
    carregarEventos,
    criarEvento,
    atualizarEvento,
    excluirEvento,
    totalEventos,
    confirmados,
    aguardando,
  };
}
