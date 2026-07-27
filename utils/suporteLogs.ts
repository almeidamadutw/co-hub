import { supabase } from "@/utils/supabase";
import { User, usuarioTemAcessoSuporte } from "@/utils/auth";

type RegistrarLogParams = {
  suporte: User | null;
  acao: string;
  entidade?: string;
  entidadeId?: string | null;
  descricao: string;
  metadata?: Record<string, unknown>;
};

export async function registrarLogSuporte({
  suporte,
  acao,
  entidade,
  entidadeId,
  descricao,
  metadata = {},
}: RegistrarLogParams) {
  if (!usuarioTemAcessoSuporte(suporte)) {
    return;
  }

  await supabase.rpc("suporte_registrar_log", {
    p_acao: acao,
    p_entidade: entidade || null,
    p_entidade_id: entidadeId || null,
    p_descricao: descricao,
    p_metadata: metadata,
  });
}
