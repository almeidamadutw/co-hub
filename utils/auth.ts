export type UserRole = "admin" | "recepcao" | "dentista" | "financeiro" | "crc";

export type User = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
};

export function getUsuarioLogado(): User | null {
  if (typeof window === "undefined") return null;

  const user = localStorage.getItem("cohub_user");
  if (!user) return null;

  try {
    return JSON.parse(user) as User;
  } catch {
    return null;
  }
}

export function usuarioTemPermissao(
  usuario: User | null,
  perfisPermitidos: UserRole[]
) {
  if (!usuario) return false;
  return perfisPermitidos.includes(usuario.role);
}