export type AulaVideo = {
  moduloId: string;
  aulaId: string;
  videoUid: string;
  atualizadoEm: string;
};

const STORAGE_KEY = "ceoclub_aulas_videos_v1";

export function listarVideosDasAulas(): AulaVideo[] {
  if (typeof window === "undefined") return [];

  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return [];

    const dados = JSON.parse(bruto);

    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

export function buscarVideoDaAula(aulaId: string) {
  return listarVideosDasAulas().find((item) => item.aulaId === aulaId) ?? null;
}

export function salvarVideoDaAula({
  moduloId,
  aulaId,
  videoUid,
}: {
  moduloId: string;
  aulaId: string;
  videoUid: string;
}) {
  if (typeof window === "undefined") return;

  const atuais = listarVideosDasAulas();

  const semAulaAtual = atuais.filter((item) => item.aulaId !== aulaId);

  const atualizado: AulaVideo = {
    moduloId,
    aulaId,
    videoUid,
    atualizadoEm: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify([atualizado, ...semAulaAtual]));
}