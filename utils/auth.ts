"use client";

export type UserRole =
  | "mentor"
  | "mentorado"
  | "financeiro"
  | "progresso"
  | "modulos";

export type User = {
  nome: string;
  email?: string;
  role: UserRole;
};

// 🔥 padroniza chave nova do sistema
const STORAGE_KEY_USER = "ceoclub_user";

// 🔥 função segura (evita quebrar no SSR)
function isBrowser() {
  return typeof window !== "undefined";
}

export function getUsuarioLogado(): User | null {
  if (!isBrowser()) return null;

  try {
    // 🔥 tenta nova chave primeiro
    const usuarioNovo = localStorage.getItem("ceoclub_user");

    if (usuarioNovo) {
      return JSON.parse(usuarioNovo) as User;
    }

    // 🔥 fallback (compatibilidade com sistema antigo)
    const usuarioAntigo = localStorage.getItem("cohub_user");

    if (usuarioAntigo) {
      return JSON.parse(usuarioAntigo) as User;
    }

    return null;
  } catch (error) {
    console.error("Erro ao recuperar usuário logado:", error);
    return null;
  }
}

export function salvarUsuarioLogado(user: User) {
  if (!isBrowser()) return;

  try {
    // 🔥 salva nas duas (compatibilidade total)
    localStorage.setItem("ceoclub_user", JSON.stringify(user));
    localStorage.setItem("cohub_user", JSON.stringify(user));
  } catch (error) {
    console.error("Erro ao salvar usuário logado:", error);
  }
}

export function logoutUsuario() {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem("ceoclub_user");
    localStorage.removeItem("cohub_user");
  } catch (error) {
    console.error("Erro ao remover usuário logado:", error);
  }
}

export function usuarioTemPermissao(
  usuario: User | null,
  permissoes: UserRole[]
) {
  if (!usuario) return false;
  return permissoes.includes(usuario.role);
}