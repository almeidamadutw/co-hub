export type ModuloLiberacaoGlobal = {
  modulo_id: string;
  status_liberacao: string | null;
  liberar_em: string | null;
};

export function moduloEstaLiberado(
  liberacao: ModuloLiberacaoGlobal | null | undefined,
  agora = Date.now()
) {
  if (!liberacao) return false;

  if (liberacao.status_liberacao === "aberto") return true;

  return Boolean(
    liberacao.status_liberacao === "agendado" &&
      liberacao.liberar_em &&
      new Date(liberacao.liberar_em).getTime() <= agora
  );
}

export function idsModulosLiberados(
  liberacoes: ModuloLiberacaoGlobal[],
  agora = Date.now()
) {
  return new Set(
    liberacoes
      .filter((liberacao) => moduloEstaLiberado(liberacao, agora))
      .map((liberacao) => liberacao.modulo_id)
  );
}
