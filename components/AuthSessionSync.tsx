"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import {
  limparUsuarioLogado,
  sincronizarUsuarioComSessao,
} from "@/utils/auth";

const PREFIXOS_PROTEGIDOS = [
  "/mentor",
  "/mentorado",
  "/suporte",
  "/financeiro",
  "/dashboard",
  "/usuarios",
  "/agenda",
  "/modulos",
  "/simulados",
  "/relatorios",
  "/conta",
];

function rotaProtegida(pathname: string) {
  return PREFIXOS_PROTEGIDOS.some(
    (prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`)
  );
}

export default function AuthSessionSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let componenteAtivo = true;

    async function validarSessao() {
      const usuario = await sincronizarUsuarioComSessao();

      if (!componenteAtivo) return;

      if (!usuario && rotaProtegida(pathname)) {
        router.replace("/login");
      }
    }

    void validarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_OUT" && session) return;

      limparUsuarioLogado();

      if (rotaProtegida(pathname)) {
        router.replace("/login");
      }
    });

    return () => {
      componenteAtivo = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
