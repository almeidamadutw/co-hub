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
  nome_premium: string | null;
  nome_explicativo: string | null;
  descricao_curta: string | null;
  objetivo_modulo: string | null;
  aula_principal: string | null;
  encontros: string | null;
  materiais: string | null;
  atividade_pratica: string | null;
  aulas: AulaModulo[];
};

export type PayloadModulo = {
  nomePremium: string;
  nomeExplicativo: string;
  descricaoCurta: string;
  objetivoModulo: string;
  aulaPrincipal: string;
  encontros: string;
  materiais: string;
  atividadePratica: string;
  criadoPor?: string | null;
};

export function getModuloPremium(modulo: ModuloMentoria) {
  return modulo.nome_premium?.trim() || modulo.titulo;
}

export function getModuloExplicativo(modulo: ModuloMentoria) {
  return modulo.nome_explicativo?.trim() || modulo.titulo;
}

export function getModuloDescricaoCurta(modulo: ModuloMentoria) {
  return modulo.descricao_curta?.trim() || modulo.descricao || "";
}

export function useModulosSupabase() {
  const [modulos, setModulos] = useState<ModuloMentoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarModulos = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("modulos")
      .select(`
        id,
        titulo,
        descricao,
        ordem,
        ativo,
        criado_por,
        created_at,
        updated_at,
        nome_premium,
        nome_explicativo,
        descricao_curta,
        objetivo_modulo,
        aula_principal,
        encontros,
        materiais,
        atividade_pratica,
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
      `)
      .order("ordem", { ascending: true });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    const modulosTratados = (data ?? []).map((modulo: any) => ({
      ...modulo,
      aulas: [...(modulo.aulas ?? [])].sort(
        (a: AulaModulo, b: AulaModulo) => Number(a.ordem) - Number(b.ordem)
      ),
    })) as ModuloMentoria[];

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
      return total + modulo.aulas.filter((aula) => Boolean(aula.video_url?.trim())).length;
    }, 0);
  }, [modulos]);

  const totalMateriais = useMemo(() => {
    return modulos.reduce((total, modulo) => {
      return total + modulo.aulas.reduce(
        (soma, aula) => soma + (aula.materiais_aula?.length ?? 0),
        0
      );
    }, 0);
  }, [modulos]);

  function montarPayloadModulo(payload: PayloadModulo, ordem?: number) {
    const nomePremium = payload.nomePremium.trim();
    const nomeExplicativo = payload.nomeExplicativo.trim();
    const descricaoCurta = payload.descricaoCurta.trim();

    return {
      titulo: nomeExplicativo || nomePremium,
      descricao: descricaoCurta || null,
      nome_premium: nomePremium || nomeExplicativo,
      nome_explicativo: nomeExplicativo || nomePremium,
      descricao_curta: descricaoCurta || null,
      objetivo_modulo: payload.objetivoModulo.trim() || null,
      aula_principal: payload.aulaPrincipal.trim() || null,
      encontros: payload.encontros.trim() || null,
      materiais: payload.materiais.trim() || null,
      atividade_pratica: payload.atividadePratica.trim() || null,
      ...(ordem ? { ordem } : {}),
    };
  }

  async function criarModulo(payload: PayloadModulo) {
    const ordem = modulos.length + 1;

    const { error } = await supabase.from("modulos").insert({
      ...montarPayloadModulo(payload, ordem),
      ativo: true,
      criado_por: payload.criadoPor ?? null,
    });

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function atualizarModulo({
    moduloId,
    payload,
  }: {
    moduloId: string;
    payload: PayloadModulo;
  }) {
    const { error } = await supabase
      .from("modulos")
      .update({
        ...montarPayloadModulo(payload),
        updated_at: new Date().toISOString(),
      })
      .eq("id", moduloId);

    if (error) throw new Error(error.message);

    await carregarModulos();
  }

  async function excluirModulo(moduloId: string) {
    const { error } = await supabase.from("modulos").delete().eq("id", moduloId);
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
    atualizarModulo,
    excluirModulo,
    criarAula,
    atualizarAula,
    excluirAula,
    adicionarMaterial,
    removerMaterial,
  };
}
