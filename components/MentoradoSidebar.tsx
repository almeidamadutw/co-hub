"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CeoSidebarFrame from "@/components/CeoSidebarFrame";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario } from "@/utils/auth";

type MentoradoSidebarProps = { nome: string; codigoInscricao?: string | null };
type UsuarioSidebar = { id?: string; email?: string | null; codigo_inscricao?: string | null; codigoInscricao?: string | null };

const menusMentorado = [
  { label: "Início", href: "/mentorado/dashboard" },
  { label: "Minha agenda", href: "/mentorado/agenda" },
  { label: "Meus módulos", href: "/mentorado/modulos" },
  { label: "Biblioteca", href: "/mentorado/biblioteca" },
  { label: "Praticar", href: "/mentorado/praticar" },
  { label: "Meu progresso", href: "/mentorado/progresso" },
  { label: "Financeiro", href: "/mentorado/financeiro" },
  { label: "Suporte", href: "/mentorado/suporte" },
  { label: "Minha conta", href: "/mentorado/conta" },
];

export default function MentoradoSidebar({ nome, codigoInscricao }: MentoradoSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [codigoEncontrado, setCodigoEncontrado] = useState(codigoInscricao || "");

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarCodigoInscricao() {
      if (codigoInscricao) {
        setCodigoEncontrado(codigoInscricao);
        return;
      }
      const user = getUsuarioLogado() as UsuarioSidebar | null;
      const codigoLocal = user?.codigo_inscricao || user?.codigoInscricao;
      if (codigoLocal) {
        setCodigoEncontrado(codigoLocal);
        return;
      }
      if (!user?.id && !user?.email) {
        setCodigoEncontrado("");
        return;
      }
      let consulta = supabase.from("profiles").select("codigo_inscricao").eq("role", "mentorado");
      if (user.id) {
        consulta = consulta.eq("id", user.id);
      } else if (user.email) {
        consulta = consulta.ilike("email", user.email.trim());
      }
      const { data, error } = await consulta.maybeSingle();
      if (!componenteAtivo) return;
      if (error) {
        console.error("Erro ao buscar inscrição do mentorado:", error.message);
        setCodigoEncontrado("");
        return;
      }
      setCodigoEncontrado(data?.codigo_inscricao || "");
    }
    void carregarCodigoInscricao();
    return () => { componenteAtivo = false; };
  }, [codigoInscricao]);

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  return (
    <CeoSidebarFrame
      nome={nome}
      roleLabel="MENTORADO"
      description={"Inscrição " + (codigoEncontrado || "não informada")}
      brandSubtitle="SUA JORNADA"
      items={menusMentorado}
      isActive={(href) => pathname === href || pathname.startsWith(href + "/")}
      onNavigate={(href) => router.push(href)}
      onLogout={sair}
    />
  );
}
