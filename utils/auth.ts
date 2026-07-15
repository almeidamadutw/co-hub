import { User, UserRole } from "@/data/users";
import { supabase } from "@/utils/supabase";
import {
  definirPersistenciaSessao,
  sessaoDevePersistir,
} from "@/utils/sessionPersistence";

const STORAGE_KEY = "ceoclub_user";
const OLD_STORAGE_KEY = "cohub_user";

export type { User, UserRole };

export function salvarUsuarioLogado(usuario: User, manterConectado = false) {
  if (typeof window === "undefined") return;

  definirPersistenciaSessao(manterConectado);

  localStorage.removeItem(OLD_STORAGE_KEY);
  sessionStorage.removeItem(OLD_STORAGE_KEY);

  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);

  const storage = manterConectado ? localStorage : sessionStorage;

  storage.setItem(STORAGE_KEY, JSON.stringify(usuario));
}

export function getUsuarioLogado(): User | null {
  if (typeof window === "undefined") return null;

  const usuarioSalvo =
    localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);

  if (!usuarioSalvo) return null;

  try {
    return JSON.parse(usuarioSalvo) as User;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function limparUsuarioLogado() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(OLD_STORAGE_KEY);
  sessionStorage.removeItem(OLD_STORAGE_KEY);

  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function logoutUsuario() {
  limparUsuarioLogado();

  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      console.error("Não foi possível encerrar a sessão do Supabase:", error);
    }
  } catch (error) {
    console.error("Não foi possível encerrar a sessão do Supabase:", error);
  }
}

export async function sincronizarUsuarioComSessao(): Promise<User | null> {
  if (typeof window === "undefined") return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    limparUsuarioLogado();
    return null;
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("profiles")
    .select("nome, email, role, acesso_suporte, status")
    .eq("id", authData.user.id)
    .single();

  const role = String(perfil?.role ?? "")
    .trim()
    .toLowerCase() as UserRole;
  const status = String(perfil?.status ?? "").trim().toLowerCase();
  const rolesValidas: UserRole[] = [
    "mentor",
    "mentorado",
    "financeiro",
    "suporte",
  ];

  if (
    perfilError ||
    !perfil ||
    !rolesValidas.includes(role) ||
    (status && status !== "ativo")
  ) {
    await logoutUsuario();
    return null;
  }

  const usuario: User = {
    id: authData.user.id,
    nome: perfil.nome || authData.user.email || "Usuário",
    email: perfil.email || authData.user.email || "",
    role,
    acesso_suporte: Boolean(perfil.acesso_suporte),
  };

  const usuarioAtual = getUsuarioLogado();
  const manterConectado = usuarioAtual
    ? Boolean(localStorage.getItem(STORAGE_KEY))
    : sessaoDevePersistir();

  salvarUsuarioLogado(usuario, manterConectado);
  return usuario;
}

export function usuarioTemPermissao(
  usuario: User | null,
  rolesPermitidas: UserRole[]
) {
  if (!usuario) return false;

  return rolesPermitidas.includes(usuario.role);
}
