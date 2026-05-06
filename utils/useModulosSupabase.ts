"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";

export type ArquivoAula = {
  id: string;
  aula_id: string;
  nome: string;
  url: string;
  created_at?: string;
};

export type AulaModulo = {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  duracao: string | null;
  video_url: string | null;
  ordem: number;
  ativo: boolean;
  materiais_aula?: ArquivoAula[];
};

export type ModuloMentoria = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  aulas: AulaModulo[];
};

export function useModulosSupabase() {
  const [modulos, setModulos] = useState<ModuloMentoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarModulos = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("modulos")
      .select(
        `
        id,
        titulo,
        descricao,
        ordem,
        ativo,
        criado_por,
        created_at,
        updated_at,
        aulas (
          id,
          modulo_id,
          titulo,
          descricao,
          objetivo,
          duracao,
          video_url,
          ordem,
          ativo,
          materiais_aula (
            id,
            aula_id,
            nome,
            url,
            created_at
          )
        )
      `
      )
      .order("ordem", { ascending: true });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    const modulosTratados = (data ?? []).map((modulo: any) => ({
      ...modulo,
      aulas: [...(modulo.aulas ?? [])].sort(
        (a: AulaModulo, b: AulaModulo) => a.ordem - b.ordem
      ),
    }));

    setModulos(modulosTratados);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarModulos();
  }, [carregarModulos]);

  const totalAulas = useMemo(() => {
    return modulos.reduce((total, modulo) => total + modulo.aulas.length, 0);
  }, [modulos]);

  const aulasComVideo = useMemo(() => {
    return modulos.reduce((total, modulo) => {
      return (
        total +
        modulo.aulas.filter((aula) => Boolean(aula.video_url?.trim())).length
      );
    }, 0);
  }, [modulos]);

  const totalMateriais = useMemo(() => {
    return modulos.reduce((total, modulo) => {
      return (
        total +
        modulo.aulas.reduce(
          (soma, aula) => soma + (aula.materiais_aula?.length ?? 0),
          0
        )
      );
    }, 0);
  }, [modulos]);

  async function criarModulo({
    titulo,
    descricao,
    criadoPor,
  }: {
    titulo: string;
    descricao: string;
    criadoPor?: string | null;
  }) {
    const ordem = modulos.length + 1;

    const { error } = await supabase.from("modulos").insert({
      titulo,
      descricao,
      ordem,
      ativo: true,
      criado_por: criadoPor ?? null,
    });

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function excluirModulo(moduloId: string) {
    const { error } = await supabase
      .from("modulos")
      .delete()
      .eq("id", moduloId);

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function criarAula({
    moduloId,
    titulo,
    descricao,
    objetivo,
    duracao,
    videoUrl,
  }: {
    moduloId: string;
    titulo: string;
    descricao: string;
    objetivo: string;
    duracao: string;
    videoUrl: string;
  }) {
    const modulo = modulos.find((item) => item.id === moduloId);
    const ordem = (modulo?.aulas.length ?? 0) + 1;

    const { error } = await supabase.from("aulas").insert({
      modulo_id: moduloId,
      titulo,
      descricao,
      objetivo,
      duracao,
      video_url: videoUrl,
      ordem,
      ativo: true,
    });

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function atualizarAula({
    aulaId,
    campo,
    valor,
  }: {
    aulaId: string;
    campo: "titulo" | "descricao" | "objetivo" | "duracao" | "video_url";
    valor: string;
  }) {
    const { error } = await supabase
      .from("aulas")
      .update({
        [campo]: valor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", aulaId);

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function excluirAula(aulaId: string) {
    const { error } = await supabase.from("aulas").delete().eq("id", aulaId);

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function adicionarMaterial({
    aulaId,
    nome,
    url,
  }: {
    aulaId: string;
    nome: string;
    url: string;
  }) {
    const { error } = await supabase.from("materiais_aula").insert({
      aula_id: aulaId,
      nome,
      url,
    });

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function removerMaterial(materialId: string) {
    const { error } = await supabase
      .from("materiais_aula")
      .delete()
      .eq("id", materialId);

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  return {
    modulos,
    carregando,
    erro,
    setErro,
    carregarModulos,

    totalAulas,
    aulasComVideo,
    totalMateriais,

    criarModulo,
    excluirModulo,
    criarAula,
    atualizarAula,
    excluirAula,
    adicionarMaterial,
    removerMaterial,
  };
}