import { supabase } from "@/utils/supabase";

export async function obterCabecalhoAutorizacao() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
