"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import PageLoading from "@/components/PageLoading";
import { sincronizarUsuarioComSessao } from "@/utils/auth";

type UserRole = "mentor" | "mentorado" | "financeiro" | "suporte";

type AuthGuardProps = {
  children: ReactNode;
  permitido: UserRole[];
};

function rotaInicialPorRole(role: UserRole) {
  const rotas: Record<UserRole, string> = {
    mentor: "/mentor/dashboard",
    mentorado: "/mentorado/dashboard",
    financeiro: "/mentor/financeiro",
    suporte: "/suporte",
  };

  return rotas[role];
}

export default function AuthGuard({ children, permitido }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    let componenteAtivo = true;

    async function validarAcesso() {
      const usuario = await sincronizarUsuarioComSessao();

      if (!componenteAtivo) return;

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
    }

    void validarAcesso();

    return () => {
      componenteAtivo = false;
    };
  }, [permitido, pathname, router]);

  if (!liberado) {
    return <PageLoading pagina="agenda" />;
  }

  return <>{children}</>;
}
