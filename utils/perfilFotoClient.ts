import { obterCabecalhoAutorizacao } from "@/utils/apiAuthClient";

export const FOTO_PERFIL_TIPOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const FOTO_PERFIL_LIMITE_BYTES = 2 * 1024 * 1024;

type AtualizarFotoPerfilOpcoes = {
  arquivo?: File | null;
  remover?: boolean;
  usuarioId?: string;
};

type AtualizarFotoPerfilResposta = {
  foto_url: string | null;
  aviso?: string | null;
};

export async function resolverFotoPerfil(
  referencia: string | null | undefined,
  usuarioId?: string
) {
  if (!referencia || !referencia.startsWith("storage://")) {
    return referencia ?? null;
  }

  const headers = await obterCabecalhoAutorizacao();
  const parametros = new URLSearchParams();

  if (usuarioId) {
    parametros.set("usuario_id", usuarioId);
  }

  const resposta = await fetch(
    `/api/perfil/foto${parametros.size ? `?${parametros.toString()}` : ""}`,
    {
      headers,
      cache: "no-store",
    }
  );
  const payload = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(
      payload?.error || "Não foi possível autorizar a foto do perfil."
    );
  }

  return (payload?.foto_url as string | null | undefined) ?? null;
}

export function validarArquivoFotoPerfil(arquivo: File) {
  if (
    !FOTO_PERFIL_TIPOS.includes(
      arquivo.type as (typeof FOTO_PERFIL_TIPOS)[number]
    )
  ) {
    return "Selecione uma imagem JPG, PNG ou WEBP.";
  }

  if (arquivo.size <= 0) {
    return "A imagem escolhida está vazia.";
  }

  if (arquivo.size > FOTO_PERFIL_LIMITE_BYTES) {
    return "A foto precisa ter no máximo 2 MB.";
  }

  return "";
}

export async function atualizarFotoPerfil({
  arquivo,
  remover = false,
  usuarioId,
}: AtualizarFotoPerfilOpcoes): Promise<AtualizarFotoPerfilResposta | null> {
  if (!arquivo && !remover) return null;

  const headers = await obterCabecalhoAutorizacao();
  let resposta: Response;

  if (arquivo) {
    const erroArquivo = validarArquivoFotoPerfil(arquivo);

    if (erroArquivo) {
      throw new Error(erroArquivo);
    }

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    if (usuarioId) {
      formData.append("usuario_id", usuarioId);
    }

    resposta = await fetch("/api/perfil/foto", {
      method: "POST",
      headers,
      body: formData,
    });
  } else {
    resposta = await fetch("/api/perfil/foto", {
      method: "DELETE",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
      }),
    });
  }

  const payload = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(
      payload?.error || "Não foi possível atualizar a foto do perfil."
    );
  }

  return {
    foto_url: payload?.foto_url ?? null,
    aviso: payload?.aviso ?? null,
  };
}
