"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export type ModuloCeoClub = {
  id: string;
  titulo: string | null;
  nome_premium: string | null;
  nome_explicativo: string | null;
  ordem: number | null;
};

export function useCeoClubDados() {
  const [modulos, setModulos] = useState<ModuloCeoClub[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("modulos")
        .select("id, titulo, nome_premium, nome_explicativo, ordem")
        .order("ordem", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setModulos((data ?? []) as ModuloCeoClub[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os módulos."
      );
      setModulos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return {
    modulos,
    carregando,
    erro,
    carregarDados,
  };
}