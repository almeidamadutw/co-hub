export type ConsultaHistorico = {
  data: string;
  status: "compareceu" | "faltou" | "cancelou";
  observacao?: string;
};

export function calcularScorePaciente(historico: ConsultaHistorico[]): number {
  if (!historico || historico.length === 0) return 50;

  let score = 50;

  for (const item of historico) {
    if (item.status === "compareceu") score += 8;
    if (item.status === "cancelou") score -= 3;
    if (item.status === "faltou") score -= 10;
  }

  const recentes = historico.slice(-5);
  const comparecimentosRecentes = recentes.filter(
    (item) => item.status === "compareceu"
  ).length;

  score += comparecimentosRecentes * 2;

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return score;
}

export function getNivelScore(score: number) {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bom";
  if (score >= 50) return "Regular";
  return "Atenção";
}