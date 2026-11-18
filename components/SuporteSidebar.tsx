"use client";

import { usePathname, useRouter } from "next/navigation";
import CeoSidebarFrame from "@/components/CeoSidebarFrame";
import { logoutUsuario } from "@/utils/auth";

type SuporteSidebarProps = {
  nome: string;
  role?: string;
};

const menusSuporte = [
  { label: "Dashboard", href: "/suporte" },
  { label: "Usuários", href: "/suporte/usuarios" },
  { label: "Biblioteca", href: "/suporte/biblioteca" },
  { label: "Financeiro", href: "/suporte/financeiro" },
  { label: "Tickets", href: "/suporte/tickets" },
  { label: "Reset de senha", href: "/suporte/reset-senha" },
  { label: "Logs", href: "/suporte/logs" },
  { label: "Minha conta", href: "/suporte/conta" },
];

export default function SuporteSidebar({ nome, role = "suporte" }: SuporteSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const menus = role === "mentor"
    ? [...menusSuporte, { label: "Voltar à mentoria", href: "/mentor/dashboard" }]
    : menusSuporte;

  function rotaAtiva(href: string) {
    if (href === "/suporte") return pathname === "/suporte";
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  return (
    <CeoSidebarFrame
      nome={nome}
      roleLabel={role === "mentor" ? "MENTORIA + SUPORTE" : "SUPORTE"}
      description="Atendimento e T.I."
      brandSubtitle="ATENDIMENTO E T.I."
      items={menus}
      isActive={rotaAtiva}
      onNavigate={(href) => router.push(href)}
      onLogout={sair}
    />
  );
}
