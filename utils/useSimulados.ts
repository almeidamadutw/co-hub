"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@/utils/useLocalStorage";
import { CEOCLUB_KEYS } from "@/utils/ceoclubKeys";

export type AlternativaSimulado = {
  id: string;
  texto: string;
};

export type QuestaoSimulado = {
  id: string;
  enunciado: string;
  alternativas: AlternativaSimulado[];
  respostaCorretaId: string;
};

export type Simulado = {
  id: string;
  titulo: string;
  descricao: string;
  moduloId: string;
  moduloTitulo: string;
  ativo: boolean;
  questoes: QuestaoSimulado[];
  criadoEm: string;
  atualizadoEm: string;
};

export type RespostaQuestaoSimulado = {
  questaoId: string;
  alternativaId: string;
};

export type ResultadoSimulado = {
  id: string;
  simuladoId: string;
  simuladoTitulo: string;
  mentoradoId: string;
  mentoradoNome: string;
  respostas: RespostaQuestaoSimulado[];
  acertos: number;
  total: number;
  percentual: number;
  criadoEm: string;
};

export function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function useSimulados() {
  const [simulados, setSimulados, carregouSimulados] = useLocalStorage<
    Simulado[]
  >(CEOCLUB_KEYS.simulados, []);

  const [resultados, setResultados, carregouResultados] = useLocalStorage<
    ResultadoSimulado[]
  >(CEOCLUB_KEYS.respostasSimulados, []);

  const simuladosAtivos = useMemo(() => {
    return simulados.filter((simulado) => simulado.ativo);
  }, [simulados]);

  const totalQuestoes = useMemo(() => {
    return simulados.reduce(
      (total, simulado) => total + simulado.questoes.length,
      0
    );
  }, [simulados]);

  const carregando = !carregouSimulados || !carregouResultados;

  return {
    carregando,
    simulados,
    setSimulados,
    simuladosAtivos,
    totalQuestoes,
    resultados,
    setResultados,
  };
}