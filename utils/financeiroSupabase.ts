import { supabase } from "@/utils/supabase";
import type { StatusFinanceiro } from "@/utils/financeiroStatus";

export type CobrancaMentoradoSegura = {
  id: string;
  grupo_id: string | null;
  mentorado_id: string;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: StatusFinanceiro;
  created_at: string;
  updated_at: string;
};

const camposPublicosMentorado =
  "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, created_at, updated_at";

export async function listarMinhasCobrancasSeguras() {
  const respostaRpc = await supabase.rpc(
    "financeiro_listar_minhas_cobrancas"
  );

  if (!respostaRpc.error) {
    return (respostaRpc.data ?? []) as CobrancaMentoradoSegura[];
  }

  const funcaoAindaNaoPublicada = ["42883", "PGRST202"].includes(
    respostaRpc.error.code || ""
  );

  if (!funcaoAindaNaoPublicada) {
    throw new Error(respostaRpc.error.message);
  }

  // Compatibilidade durante o deploy em duas etapas. Depois da migration, a
  // policy do mentorado na tabela é removida e somente a RPC segura responde.
  const { data, error } = await supabase
    .from("financeiro_cobrancas")
    .select(camposPublicosMentorado)
    .order("data_vencimento", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Omit<CobrancaMentoradoSegura, "grupo_id">[]).map(
    (item) => ({ ...item, grupo_id: null })
  );
}
