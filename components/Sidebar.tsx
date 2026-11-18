"use client";

import { usePathname, useRouter } from "next/navigation";
import CeoSidebarFrame, { type CeoNavigationItem } from "@/components/CeoSidebarFrame";
import { logoutUsuario } from "@/utils/auth";

type SidebarRole = "mentor" | "mentorado" | "financeiro" | "suporte";

type SidebarProps = {
  nome: string;
  role?: string;
  acessoSuporte?: boolean;
};

const menusPorRole: Record<SidebarRole, CeoNavigationItem[]> = {
  mentor: [
    { label: "Dashboard", href: "/mentor/dashboard" },
    { label: "Agenda", href: "/mentor/agenda" },
    { label: "Mentorados", href: "/mentor/mentorados/lista" },
    { label: "Biblioteca", href: "/mentor/biblioteca" },
    { label: "Módulos", href: "/mentor/modulos" },
    { label: "Simulados", href: "/mentor/simulados" },
    { label: "Financeiro", href: "/mentor/financeiro" },
    { label: "Relatórios", href: "/mentor/relatorios" },
    { label: "Minha conta", href: "/mentor/conta" },
  ],
  mentorado: [
    { label: "Dashboard", href: "/mentorado/dashboard" },
    { label: "Módulos", href: "/mentorado/modulos" },
    { label: "Biblioteca", href: "/mentorado/biblioteca" },
    { label: "Praticar", href: "/mentorado/praticar" },
    { label: "Progresso", href: "/mentorado/progresso" },
    { label: "Financeiro", href: "/mentorado/financeiro" },
    { label: "Agenda", href: "/mentorado/agenda" },
    { label: "Suporte", href: "/mentorado/suporte" },
    { label: "Minha conta", href: "/mentorado/conta" },
  ],
  financeiro: [
    { label: "Dashboard", href: "/mentor/financeiro" },
    { label: "Cobranças", href: "/mentor/financeiro" },
    { label: "Relatórios", href: "/mentor/relatorios" },
    { label: "Minha conta", href: "/mentor/conta" },
  ],
  suporte: [
    { label: "Dashboard", href: "/suporte" },
    { label: "Usuários", href: "/suporte/usuarios" },
    { label: "Biblioteca", href: "/suporte/biblioteca" },
    { label: "Financeiro", href: "/suporte/financeiro" },
    { label: "Reset de senha", href: "/suporte/reset-senha" },
    { label: "Minha conta", href: "/suporte/conta" },
  ],
};

const roles: Record<SidebarRole, { label: string; description: string; subtitle: string }> = {
  mentor: { label: "MENTORIA", description: "Gestão e acompanhamento", subtitle: "PAINEL DA MENTORIA" },
  mentorado: { label: "MENTORADO", description: "Sua jornada de evolução", subtitle: "SUA JORNADA" },
  financeiro: { label: "FINANCEIRO", description: "Gestão financeira", subtitle: "CONTROLE FINANCEIRO" },
  suporte: { label: "SUPORTE", description: "Atendimento e T.I.", subtitle: "ATENDIMENTO E T.I." },
};

export default function Sidebar({ nome, role = "mentor", acessoSuporte = false }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const roleAtual: SidebarRole = role in menusPorRole ? role as SidebarRole : "mentor";
  const menusBase = menusPorRole[roleAtual];
  const menus = acessoSuporte && roleAtual !== "suporte" && !menusBase.some((item) => item.href === "/suporte")
    ? [...menusBase, { label: "Área suporte", href: "/suporte" }]
    : menusBase;

  function rotaAtiva(href: string) {
    if (href === "/mentor/dashboard") return pathname === "/mentor/dashboard" || pathname === "/dashboard";
    if (href === "/mentor/mentorados/lista") return pathname === "/mentor/mentorados" || pathname.startsWith("/mentor/mentorados/");
    if (href === "/suporte") return pathname === "/suporte" || pathname === "/suporte/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  return (
    <CeoSidebarFrame
      nome={nome}
      roleLabel={roles[roleAtual].label}
      description={roles[roleAtual].description}
      brandSubtitle={roles[roleAtual].subtitle}
      items={menus}
      isActive={rotaAtiva}
      onNavigate={(href) => router.push(href)}
      onLogout={sair}
    />
  );
}
