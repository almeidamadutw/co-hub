"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@/utils/useLocalStorage";
import { CEOCLUB_KEYS } from "@/utils/ceoclubKeys";

export type ArquivoAula = {
  id: string;
  nome: string;
  url: string;
};

export type AulaModulo = {
  id: string;
  titulo: string;
  descricao: string;
  objetivo?: string;
  duracao?: string;
  ordem: number;
  videoUrl: string;
  arquivos?: ArquivoAula[];
};

export type ModuloMentoria = {
  id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  aulas: AulaModulo[];
  criadoEm: string;
};

export type EventoAgenda = {
  id: number;
  mentoradoId: string;
  mentoradoCodigo: string;
  mentorado: string;
  mentoradoEmail: string;
  data: string;
  horario: string;
  tipo: "Mentoria" | "Módulo" | "Reunião";
  status: "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";
  observacao: string;
};

export type Simulado = {
  id: string;
  titulo: string;
  descricao?: string;
  moduloId?: string;
  questoes?: unknown[];
  criadoEm?: string;
};

export type RegistroFinanceiro = {
  id: string;
  mentoradoId: string;
  mentorado: string;
  descricao: string;
  valor: number;
  status: "Pago" | "Pendente" | "Atrasado";
  vencimento: string;
};

export function useCeoClubDados() {
  const [modulos, setModulos, carregouModulos] = useLocalStorage<
    ModuloMentoria[]
  >(CEOCLUB_KEYS.modulos, []);

  const [agenda, setAgenda, carregouAgenda] = useLocalStorage<EventoAgenda[]>(
    CEOCLUB_KEYS.agenda,
    []
  );

  const [aulasConcluidas, setAulasConcluidas, carregouAulasConcluidas] =
    useLocalStorage<string[]>(CEOCLUB_KEYS.aulasConcluidas, []);

  const [simulados, setSimulados, carregouSimulados] = useLocalStorage<
    Simulado[]
  >(CEOCLUB_KEYS.simulados, []);

  const [financeiro, setFinanceiro, carregouFinanceiro] = useLocalStorage<
    RegistroFinanceiro[]
  >(CEOCLUB_KEYS.financeiro, []);

  const modulosOrdenados = useMemo(() => {
    return [...modulos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((modulo) => ({
        ...modulo,
        aulas: [...modulo.aulas].sort((a, b) => a.ordem - b.ordem),
      }));
  }, [modulos]);

  const todasAsAulas = useMemo(() => {
    return modulosOrdenados.flatMap((modulo) =>
      modulo.aulas.map((aula) => ({
        ...aula,
        moduloId: modulo.id,
        moduloTitulo: modulo.titulo,
      }))
    );
  }, [modulosOrdenados]);

  const aulasComVideo = useMemo(() => {
    return todasAsAulas.filter((aula) => aula.videoUrl).length;
  }, [todasAsAulas]);

  const aulasConcluidasValidas = useMemo(() => {
    const idsAulas = new Set(todasAsAulas.map((aula) => aula.id));

    return aulasConcluidas.filter((aulaId) => idsAulas.has(aulaId));
  }, [aulasConcluidas, todasAsAulas]);

  const progressoGeral = useMemo(() => {
    if (todasAsAulas.length === 0) return 0;

    return Math.round(
      (aulasConcluidasValidas.length / todasAsAulas.length) * 100
    );
  }, [aulasConcluidasValidas.length, todasAsAulas.length]);

  const agendaConfirmada = useMemo(() => {
    return agenda.filter((evento) => evento.status === "Confirmada");
  }, [agenda]);

  const pendenciasFinanceiras = useMemo(() => {
    return financeiro.filter(
      (item) => item.status === "Pendente" || item.status === "Atrasado"
    );
  }, [financeiro]);

  const carregando =
    !carregouModulos ||
    !carregouAgenda ||
    !carregouAulasConcluidas ||
    !carregouSimulados ||
    !carregouFinanceiro;

  return {
    carregando,

    modulos: modulosOrdenados,
    setModulos,

    aulas: todasAsAulas,
    aulasComVideo,

    agenda,
    setAgenda,
    agendaConfirmada,

    aulasConcluidas: aulasConcluidasValidas,
    setAulasConcluidas,

    progressoGeral,

    simulados,
    setSimulados,

    financeiro,
    setFinanceiro,
    pendenciasFinanceiras,
  };
}