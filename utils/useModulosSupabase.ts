"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";
import {
  assinarUrlStorage,
  criarReferenciaStorage,
  extrairReferenciaStorage,
} from "@/utils/storageUrls";

export type ArquivoAula = {
  id: string;
  aula_id: string;
  nome: string;
  url: string;
  storage_path?: string | null;
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

type ModuloComAulas = Omit<ModuloMentoria, "aulas"> & {
  aulas?: AulaModulo[] | null;
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

function mensagemErroSupabase(error: unknown, fallback: string) {
  if (!error) return fallback;

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "object" && error !== null) {
    const erroObj = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return [erroObj.message, erroObj.details, erroObj.hint, erroObj.code]
      .filter(Boolean)
      .join(" | ") || fallback;
  }

  return fallback;
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
            storage_path,
            created_at
          )
        )
      `)
      .order("ordem", { ascending: true });

    if (error) {
      console.error("Erro ao carregar módulos:", error);
      setErro(mensagemErroSupabase(error, "Não foi possível carregar os módulos."));
      setCarregando(false);
      return;
    }

    const modulosTratados = (await Promise.all(
      ((data ?? []) as ModuloComAulas[]).map(async (modulo) => ({
        ...modulo,
        aulas: await Promise.all(
          [...(modulo.aulas ?? [])]
            .sort(
              (a: AulaModulo, b: AulaModulo) =>
                Number(a.ordem) - Number(b.ordem)
            )
            .map(async (aula: AulaModulo) => ({
              ...aula,
              materiais_aula: await Promise.all(
                [...(aula.materiais_aula ?? [])]
                  .sort((a, b) => {
                    const dataA = a.created_at
                      ? new Date(a.created_at).getTime()
                      : 0;
                    const dataB = b.created_at
                      ? new Date(b.created_at).getTime()
                      : 0;
                    return dataB - dataA;
                  })
                  .map(async (material) => {
                    const referencia = extrairReferenciaStorage(material.url)
                      ? material.url
                      : material.storage_path
                        ? criarReferenciaStorage(
                            "ceo-club-materiais",
                            material.storage_path
                          )
                        : material.url;

                    if (!extrairReferenciaStorage(referencia)) {
                      return material;
                    }

                    try {
                      return {
                        ...material,
                        url: await assinarUrlStorage(supabase, referencia),
                      };
                    } catch (erroAssinatura) {
                      console.warn(
                        "Material privado indisponível para este usuário:",
                        material.id,
                        erroAssinatura
                      );

                      return { ...material, url: "" };
                    }
                  })
              ),
            }))
        ),
      }))
    )) as ModuloMentoria[];

    setModulos(modulosTratados);
    setCarregando(false);
  }, []);

  useEffect(() => {
    const iniciarCarregamento = window.setTimeout(() => {
      void carregarModulos();
    }, 0);

    return () => window.clearTimeout(iniciarCarregamento);
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

    if (error) throw new Error(mensagemErroSupabase(error, "Não foi possível criar o módulo."));

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

    if (error) throw new Error(mensagemErroSupabase(error, "Não foi possível atualizar o módulo."));

    await carregarModulos();
  }

  async function excluirModulo(moduloId: string) {
    const { error } = await supabase.from("modulos").delete().eq("id", moduloId);
    if (error) throw new Error(mensagemErroSupabase(error, "Não foi possível excluir o módulo."));
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
      descricao: descricao || null,
      objetivo: objetivo || null,
      duracao: duracao || null,
      video_url: videoUrl || null,
      ordem,
      ativo: true,
    });

    if (error) throw new Error(mensagemErroSupabase(error, "Não foi possível criar a aula."));

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

    if (error) throw new Error(mensagemErroSupabase(error, "Não foi possível atualizar a aula."));

    await carregarModulos();
  }

  async function excluirAula(aulaId: string) {
    const { error } = await supabase.from("aulas").delete().eq("id", aulaId);
    if (error) throw new Error(mensagemErroSupabase(error, "Não foi possível excluir a aula."));
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
    const payload = {
      aula_id: aulaId,
      nome: nome.trim(),
      url: url.trim(),
    };

    const { data, error } = await supabase
      .from("materiais_aula")
      .insert(payload)
      .select("id, aula_id, nome, url, storage_path, created_at")
      .single();

    if (error) {
      console.error("Erro ao salvar material em materiais_aula:", error, payload);
      throw new Error(mensagemErroSupabase(error, "Não foi possível salvar o material no banco."));
    }

    await carregarModulos();
    return data as ArquivoAula;
  }

  async function removerMaterial(materialId: string) {
    const { data: materialExistente, error: erroBusca } = await supabase
      .from("materiais_aula")
      .select("url, storage_path")
      .eq("id", materialId)
      .maybeSingle();

    if (erroBusca) {
      throw new Error(
        mensagemErroSupabase(
          erroBusca,
          "Não foi possível localizar o arquivo do material."
        )
      );
    }

    const { error } = await supabase
      .from("materiais_aula")
      .delete()
      .eq("id", materialId);

    if (error) throw new Error(mensagemErroSupabase(error, "Não foi possível remover o material."));

    const referencia = materialExistente?.storage_path
      ? {
          bucket: "ceo-club-materiais" as const,
          path: materialExistente.storage_path,
        }
      : extrairReferenciaStorage(materialExistente?.url);

    if (referencia) {
      const { error: erroStorage } = await supabase.storage
        .from(referencia.bucket)
        .remove([referencia.path]);

      if (erroStorage) {
        console.warn(
          "O material foi removido do banco, mas o arquivo precisa de limpeza no Storage:",
          materialId,
          erroStorage
        );
      }
    }

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
