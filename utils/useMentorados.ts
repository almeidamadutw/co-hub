"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";

export type MentoradoResumo = {
  id: string;
  codigoInscricao: string;
  nome: string;
  email: string;
  telefone?: string | null;
  status?: "Ativo" | "Pendente" | "Inativo" | null;
  created_at?: string;
};

type UsuarioSistema = {
  id: string;
  nome: string;
  email: string;
  role: string;
  telefone?: string | null;
  status?: "Ativo" | "Pendente" | "Inativo" | null;
  created_at?: string;
};

function gerarCodigoInscricao(valorBase: string) {
  let hash = 0;

  for (let index = 0; index < valorBase.length; index += 1) {
    hash = (hash * 31 + valorBase.charCodeAt(index)) % 10000;
  }

  const numero = String(Math.abs(hash)).padStart(4, "0");

  return `26${numero}`;
}

export function useMentorados() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarMentorados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setErro("Sessão expirada. Entre novamente.");
        setCarregando(false);
        return;
      }

      const resposta = await fetch("/api/admin/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await resposta.json();

      if (!resposta.ok) {
        setErro(json.error ?? "Não foi possível carregar os mentorados.");
        setCarregando(false);
        return;
      }

      setUsuarios(json.usuarios ?? []);
      setCarregando(false);
    } catch {
      setErro("Não foi possível carregar os mentorados.");
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarMentorados();
  }, [carregarMentorados]);

  const mentorados = useMemo(() => {
    return usuarios
      .filter((usuario) => usuario.role === "mentorado")
      .map((usuario) => {
        const baseCodigo = usuario.id || usuario.email || usuario.nome;

        return {
          id: usuario.id,
          codigoInscricao: gerarCodigoInscricao(baseCodigo),
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          status: usuario.status ?? "Ativo",
          created_at: usuario.created_at,
        };
      });
  }, [usuarios]);

  return {
    mentorados,
    carregando,
    erro,
    recarregar: carregarMentorados,
  };
}