export type Protocolo = {
  id: number;
  titulo: string;
  categoria: string;
  responsavel: string;
  status: string;
};

export const STORAGE_KEY_PROTOCOLOS = "cohub_protocolos";

export const protocoloInicial: Protocolo = {
  id: 0,
  titulo: "",
  categoria: "",
  responsavel: "",
  status: "Ativo",
};

export const protocolosIniciais: Protocolo[] = [
  {
    id: 1,
    titulo: "Protocolo de Implante",
    categoria: "Cirúrgico",
    responsavel: "Ana Lucia Dentista",
    status: "Ativo",
  },
  {
    id: 2,
    titulo: "Protocolo de Clareamento",
    categoria: "Estético",
    responsavel: "Dr. Marcelo",
    status: "Em revisão",
  },
  {
    id: 3,
    titulo: "Protocolo de Avaliação Inicial",
    categoria: "Atendimento",
    responsavel: "Dra. Beatriz",
    status: "Ativo",
  },
];

export function getProtocolosStorage(): Protocolo[] {
  if (typeof window === "undefined") return protocolosIniciais;

  try {
    const salvo = localStorage.getItem(STORAGE_KEY_PROTOCOLOS);

    if (!salvo) {
      localStorage.setItem(
        STORAGE_KEY_PROTOCOLOS,
        JSON.stringify(protocolosIniciais)
      );
      return protocolosIniciais;
    }

    const protocolos = JSON.parse(salvo);

    if (!Array.isArray(protocolos)) {
      localStorage.setItem(
        STORAGE_KEY_PROTOCOLOS,
        JSON.stringify(protocolosIniciais)
      );
      return protocolosIniciais;
    }

    return protocolos;
  } catch {
    localStorage.setItem(
      STORAGE_KEY_PROTOCOLOS,
      JSON.stringify(protocolosIniciais)
    );
    return protocolosIniciais;
  }
}

export function saveProtocolosStorage(protocolos: Protocolo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PROTOCOLOS, JSON.stringify(protocolos));
}

export function buscarProtocoloPorId(id: number) {
  return getProtocolosStorage().find((protocolo) => protocolo.id === id) || null;
}