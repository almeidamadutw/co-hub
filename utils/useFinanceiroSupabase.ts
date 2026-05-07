"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";

export type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";

export type MentoradoFinanceiro = {
  id: string;
  nome: string;
  email: string;
  codigo_inscricao: string | null;
};

export type CobrancaFinanceira = {
  id: string;
  mentorado_id: string;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: StatusCobranca;
  observacao: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type CobrancaComMentorado = CobrancaFinanceira & {
  mentoradoNome: string;
  mentoradoEmail: string;
  mentoradoCodigo: string;
};

export type NovaCobranca = {
  mentorado_id: string;
  titulo: string;
  descricao: string;
  valor_total: number;
  quantidade_parcelas: number;
  data_vencimento: string;
  forma_pagamento: string;
  status: StatusCobranca;
  observacao: string;
};

function somarMeses(dataISO: string, meses: number) {
  const data = new Date(`${dataISO}T12:00:00`);
  data.setMonth(data.getMonth() + meses);

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function useFinanceiroSupabase() {
  const [mentorados, setMentorados] = useState<MentoradoFinanceiro[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaFinanceira[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarFinanceiro = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { data: mentoradosData, error: mentoradosError } = await supabase
      .from("profiles")
      .select("id, nome, email, codigo_inscricao")
      .eq("role", "mentorado")
      .order("created_at", { ascending: false });

    if (mentoradosError) {
      setErro(mentoradosError.message);
      setCarregando(false);
      return;
    }

    const { data: cobrancasData, error: cobrancasError } = await supabase
      .from("financeiro_cobrancas")
      .select(
        "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, criado_por, created_at, updated_at"
      )
      .order("data_vencimento", { ascending: true });

    if (cobrancasError) {
      setErro(cobrancasError.message);
      setCarregando(false);
      return;
    }

    setMentorados((mentoradosData ?? []) as MentoradoFinanceiro[]);
    setCobrancas((cobrancasData ?? []) as CobrancaFinanceira[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarFinanceiro();
  }, [carregarFinanceiro]);

  const cobrancasComMentorado = useMemo<CobrancaComMentorado[]>(() => {
    return cobrancas.map((cobranca) => {
      const mentorado = mentorados.find(
        (item) => item.id === cobranca.mentorado_id
      );

      return {
        ...cobranca,
        mentoradoNome: mentorado?.nome ?? "Mentorado não encontrado",
        mentoradoEmail: mentorado?.email ?? "",
        mentoradoCodigo: mentorado?.codigo_inscricao ?? "",
      };
    });
  }, [cobrancas, mentorados]);

  async function criarCobranca(dados: NovaCobranca) {
    setErro("");

    if (!dados.mentorado_id || !dados.titulo || !dados.data_vencimento) {
      throw new Error("Preencha mentorado, título e vencimento.");
    }

    if (dados.valor_total <= 0) {
      throw new Error("Informe um valor maior que zero.");
    }

    const quantidadeParcelas = Math.max(1, Number(dados.quantidade_parcelas));
    const valorParcela = Number(
      (dados.valor_total / quantidadeParcelas).toFixed(2)
    );

    const payload = Array.from({ length: quantidadeParcelas }, (_, index) => ({
      mentorado_id: dados.mentorado_id,
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      valor_total: dados.valor_total,
      quantidade_parcelas: quantidadeParcelas,
      parcela_atual: index + 1,
      valor_parcela: valorParcela,
      data_vencimento: somarMeses(dados.data_vencimento, index),
      data_pagamento:
        dados.status === "Pago" ? new Date().toISOString().slice(0, 10) : null,
      forma_pagamento: dados.forma_pagamento || null,
      status: dados.status,
      observacao: dados.observacao || null,
      criado_por: null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("financeiro_cobrancas").insert(payload);

    if (error) throw new Error(error.message);

    await carregarFinanceiro();
  }

  async function atualizarStatus(id: string, status: StatusCobranca) {
    setErro("");

    const { error } = await supabase
      .from("financeiro_cobrancas")
      .update({
        status,
        data_pagamento:
          status === "Pago" ? new Date().toISOString().slice(0, 10) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    await carregarFinanceiro();
  }

  async function excluirCobranca(id: string) {
    setErro("");

    const { error } = await supabase
      .from("financeiro_cobrancas")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    await carregarFinanceiro();
  }

  return {
    mentorados,
    cobrancas,
    cobrancasComMentorado,
    carregando,
    erro,
    setErro,
    carregarFinanceiro,
    criarCobranca,
    atualizarStatus,
    excluirCobranca,
  };
}