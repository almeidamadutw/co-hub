"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type UserRole = "mentor" | "mentorado" | "financeiro" | "suporte";

type UsuarioLocal = {
  id?: string;
  nome?: string;
  email?: string;
  role?: UserRole;
  acesso_suporte?: boolean;
};

type AuthGuardProps = {
  children: ReactNode;
  permitido: UserRole[];
};

function rotaInicialPorRole(role: UserRole) {
  const rotas: Record<UserRole, string> = {
    mentor: "/mentor/dashboard",
    mentorado: "/mentorado/dashboard",
    financeiro: "/financeiro",
    suporte: "/suporte",
  };

  return rotas[role];
}

function buscarUsuarioLocal(): UsuarioLocal | null {
  if (typeof window === "undefined") return null;

  const ceoclubUser = localStorage.getItem("ceoclub_user");
  const cohubUser = localStorage.getItem("cohub_user");
  const sessionCeoclubUser = sessionStorage.getItem("ceoclub_user");
  const sessionCohubUser = sessionStorage.getItem("cohub_user");

  const usuarioSalvo =
    ceoclubUser || cohubUser || sessionCeoclubUser || sessionCohubUser;

  if (!usuarioSalvo) return null;

  try {
    return JSON.parse(usuarioSalvo) as UsuarioLocal;
  } catch {
    return null;
  }
}

export default function AuthGuard({ children, permitido }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    const usuario = buscarUsuarioLocal();

    if (!usuario?.role) {
      router.replace("/login");
      return;
    }

    const podeAcessar =
      permitido.includes(usuario.role) ||
      Boolean(usuario.acesso_suporte && pathname.startsWith("/suporte"));

    if (!podeAcessar) {
      router.replace(rotaInicialPorRole(usuario.role));
      return;
    }

    setLiberado(true);
  }, [permitido, pathname, router]);

  if (!liberado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-6 text-[#08163F]">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Verificando acesso...
          </p>

          <h1 className="mt-3 text-2xl font-black">
            Só um instante
          </h1>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Estamos validando seu perfil antes de abrir esta área.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}