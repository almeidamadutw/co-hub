"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";

export type MentoradoSupabase = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: string;
  status: string | null;
  codigo_inscricao: string | null;
  created_at: string | null;
};

export function useMentoradosSupabase() {
  const [mentorados, setMentorados] = useState<MentoradoSupabase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarMentorados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, nome, email, telefone, role, status, codigo_inscricao, created_at"
      )
      .eq("role", "mentorado")
      .order("created_at", { ascending: false });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    setMentorados(data ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    const iniciarCarregamento = window.setTimeout(() => {
      void carregarMentorados();
    }, 0);

    return () => window.clearTimeout(iniciarCarregamento);
  }, [carregarMentorados]);

  const ativos = useMemo(() => {
    return mentorados.filter(
      (mentorado) => (mentorado.status ?? "Ativo") === "Ativo"
    ).length;
  }, [mentorados]);

  const pendentes = useMemo(() => {
    return mentorados.filter(
      (mentorado) => (mentorado.status ?? "").toLowerCase() === "pendente"
    ).length;
  }, [mentorados]);

  return {
    mentorados,
    carregando,
    erro,
    ativos,
    pendentes,
    total: mentorados.length,
    carregarMentorados,
  };
}
