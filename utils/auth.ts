import { User, UserRole } from "@/data/users";

const STORAGE_KEY = "ceoclub_user";
const OLD_STORAGE_KEY = "cohub_user";

export type { User, UserRole };

export function salvarUsuarioLogado(usuario: User, manterConectado = false) {
  if (typeof window === "undefined") return;

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

export function logoutUsuario() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(OLD_STORAGE_KEY);
  sessionStorage.removeItem(OLD_STORAGE_KEY);

  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function usuarioTemPermissao(
  usuario: User | null,
  rolesPermitidas: UserRole[]
) {
  if (!usuario) return false;

  return rolesPermitidas.includes(usuario.role);
}