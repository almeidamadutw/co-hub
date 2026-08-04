export type StatusFinanceiro =
  | "Pago"
  | "Pendente"
  | "Atrasado"
  | "Cancelado";

type CobrancaComVencimento = {
  status: StatusFinanceiro;
  data_vencimento: string;
};

export type ParcelaCalculada = {
  numero: number;
  valor: number;
  vencimento: string;
};

type CobrancaFinanceiraBase = CobrancaComVencimento & {
  valor_parcela: number;
  data_pagamento?: string | null;
};

type CobrancaAgrupadaBase = CobrancaFinanceiraBase & {
  grupo_id?: string | null;
  valor_total: number;
};

export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function statusFinanceiroEfetivo(
  cobranca: CobrancaComVencimento,
  hoje = dataLocalISO()
): StatusFinanceiro {
  if (
    cobranca.status === "Pendente" &&
    cobranca.data_vencimento &&
    cobranca.data_vencimento < hoje
  ) {
    return "Atrasado";
  }

  return cobranca.status;
}

export function aplicarStatusFinanceiroEfetivo<
  T extends CobrancaComVencimento
>(cobrancas: T[], hoje = dataLocalISO()): T[] {
  return cobrancas.map((cobranca) => ({
    ...cobranca,
    status: statusFinanceiroEfetivo(cobranca, hoje),
  }));
}

export function adicionarMesesPreservandoDia(dataISO: string, meses: number) {
  const [anoTexto, mesTexto, diaTexto] = dataISO.split("-");
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  if (!ano || !mes || !dia) return dataISO;

  const primeiroDiaDoAlvo = new Date(ano, mes - 1 + meses, 1, 12, 0, 0);
  const ultimoDiaDoAlvo = new Date(
    primeiroDiaDoAlvo.getFullYear(),
    primeiroDiaDoAlvo.getMonth() + 1,
    0,
    12,
    0,
    0
  ).getDate();
  const data = new Date(
    primeiroDiaDoAlvo.getFullYear(),
    primeiroDiaDoAlvo.getMonth(),
    Math.min(dia, ultimoDiaDoAlvo),
    12,
    0,
    0
  );

  return dataLocalISO(data);
}

export function calcularParcelasExatas(
  valorTotal: number,
  quantidadeParcelas: number,
  primeiroVencimento: string
): ParcelaCalculada[] {
  const quantidade = Math.max(1, Math.trunc(quantidadeParcelas || 1));
  const totalCentavos = Math.round(Number(valorTotal || 0) * 100);

  if (totalCentavos <= 0 || !primeiroVencimento) return [];

  const valorBaseCentavos = Math.floor(totalCentavos / quantidade);

  return Array.from({ length: quantidade }, (_, indice) => {
    const ultimo = indice === quantidade - 1;
    const valorCentavos = ultimo
      ? totalCentavos - valorBaseCentavos * (quantidade - 1)
      : valorBaseCentavos;

    return {
      numero: indice + 1,
      valor: valorCentavos / 100,
      vencimento: adicionarMesesPreservandoDia(primeiroVencimento, indice),
    };
  });
}

export function resumirCobrancas<T extends CobrancaFinanceiraBase>(
  cobrancas: T[]
) {
  const ativas = cobrancas.filter((item) => item.status !== "Cancelado");
  const pagas = ativas.filter((item) => item.status === "Pago");
  const pendentes = ativas.filter((item) => item.status === "Pendente");
  const atrasadas = ativas.filter((item) => item.status === "Atrasado");
  const abertas = [...pendentes, ...atrasadas];
  const somar = (itens: T[]) =>
    itens.reduce((total, item) => total + Number(item.valor_parcela || 0), 0);

  return {
    totalAtivo: somar(ativas),
    totalPago: somar(pagas),
    totalPendente: somar(pendentes),
    totalAtrasado: somar(atrasadas),
    totalAberto: somar(abertas),
    quantidadeAtiva: ativas.length,
    quantidadePaga: pagas.length,
    quantidadePendente: pendentes.length,
    quantidadeAtrasada: atrasadas.length,
    quantidadeAberta: abertas.length,
    quantidadeCancelada: cobrancas.length - ativas.length,
  };
}

export function gruposFinanceirosDivergentes<
  T extends CobrancaAgrupadaBase
>(cobrancas: T[]) {
  const grupos = new Map<
    string,
    { valorTotal: number; somaParcelas: number; quantidade: number }
  >();

  cobrancas.forEach((item) => {
    const chave = item.grupo_id || `legado:${String(item.valor_total)}`;
    const atual = grupos.get(chave) || {
      valorTotal: Number(item.valor_total || 0),
      somaParcelas: 0,
      quantidade: 0,
    };

    atual.valorTotal = Number(item.valor_total || 0);
    atual.somaParcelas += Number(item.valor_parcela || 0);
    atual.quantidade += 1;
    grupos.set(chave, atual);
  });

  return Array.from(grupos.entries())
    .map(([grupoId, grupo]) => ({
      grupoId,
      ...grupo,
      diferencaCentavos: Math.round(
        (grupo.somaParcelas - grupo.valorTotal) * 100
      ),
    }))
    .filter((grupo) => grupo.diferencaCentavos !== 0);
}
