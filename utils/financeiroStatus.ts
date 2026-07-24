export type StatusFinanceiro =
  | "Pago"
  | "Pendente"
  | "Atrasado"
  | "Cancelado";

type CobrancaComVencimento = {
  status: StatusFinanceiro;
  data_vencimento: string;
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
