"use client";

import { useState } from "react";

export type CeoNavigationItem = {
  label: string;
  href: string;
};

type CeoSidebarFrameProps = {
  nome: string;
  roleLabel: string;
  description: string;
  brandSubtitle: string;
  items: CeoNavigationItem[];
  isActive: (href: string) => boolean;
  onNavigate: (href: string) => void;
  onLogout: () => void | Promise<void>;
};

const iconPaths: Record<string, string> = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  agenda: "M7 2v4 M17 2v4 M3 9h18 M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  usuarios: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  biblioteca: "M4 4h7v17H4z M13 4h7v17h-7z M7 8h1 M16 8h1 M7 17h1 M16 17h1",
  modulos: "M4 5h16v14H4z M8 9h8 M8 13h8 M8 17h4",
  simulados: "M8 4h11a2 2 0 0 1 2 2v14H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z M5 17h16 M10 9h7 M10 13h5",
  financeiro: "M3 7h18v13H3z M3 10h18 M7 15h4 M16 15h2",
  relatorios: "M4 20h16 M7 17V9 M12 17V4 M17 17v-6",
  conta: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2z",
  tickets: "M4 5h16v11H9l-5 4z M8 9h8 M8 12h5",
  suporte: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4",
  progresso: "M4 18l6-6 4 3 6-8 M15 7h5v5",
  praticar: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v10 M7 12h10",
  logs: "M7 3h10l4 4v14H3V3z M17 3v5h4 M7 12h10 M7 16h10",
  senha: "M6 11V8a6 6 0 0 1 12 0v3 M5 11h14v10H5z M12 15v2",
};

function itemIcon(href: string) {
  const part = href.split("/").filter(Boolean).pop() || "dashboard";
  if (part === "lista" || part === "mentorados" || part === "mentores") return iconPaths.usuarios;
  if (part === "reset-senha") return iconPaths.senha;
  if (part === "minha-conta") return iconPaths.conta;
  if (part === "page" || part === "suporte") return iconPaths.suporte;
  if (part === "modulos") return iconPaths.modulos;
  if (part === "conta") return iconPaths.conta;
  if (part === "financeiro") return iconPaths.financeiro;
  if (part === "praticar") return iconPaths.praticar;
  if (part === "progresso") return iconPaths.progresso;
  if (part === "relatorios") return iconPaths.relatorios;
  if (part === "logs") return iconPaths.logs;
  if (part === "tickets") return iconPaths.tickets;
  return iconPaths[part] || iconPaths.dashboard;
}

function CrownMark() {
  return (
    <svg viewBox="0 0 64 58" fill="none" aria-hidden="true" className="ceo-brand-crown">
      <path d="m6 17 10.5 12.5L31.8 9l15.5 20.5L58 17l-5.4 28H11.4L6 17Z" stroke="url(#coroa-prata)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 48h40M17 52h30" stroke="url(#coroa-prata)" strokeWidth="2" strokeLinecap="round" />
      <path d="m6 17 11 23h30l11-23" stroke="url(#coroa-prata)" strokeWidth=".8" opacity=".55" />
      <circle cx="6" cy="15" r="2.5" fill="#D9E2F2" />
      <circle cx="32" cy="7" r="2.5" fill="#F1F5FB" />
      <circle cx="58" cy="15" r="2.5" fill="#D9E2F2" />
      <defs>
        <linearGradient id="coroa-prata" x1="8" y1="4" x2="59" y2="53">
          <stop stopColor="#F5F7FC" />
          <stop offset=".48" stopColor="#A9BAD0" />
          <stop offset="1" stopColor="#ECF2F9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function CeoSidebarFrame({
  nome,
  roleLabel,
  description,
  brandSubtitle,
  items,
  isActive,
  onNavigate,
  onLogout,
}: CeoSidebarFrameProps) {
  const [open, setOpen] = useState(false);
  const initials = nome.trim().split(/\s+/).slice(0, 2).map((piece) => piece.charAt(0)).join("").toUpperCase() || "CC";

  function navigate(href: string) {
    setOpen(false);
    onNavigate(href);
  }

  function sidebarContent() {
    return (
      <>
        <div className="ceo-sidebar-brand">
          <CrownMark />
          <div className="ceo-brand-wordmark">
            <span className="ceo-brand-kicker">PLATAFORMA DE MENTORIA</span>
            <strong>CEO <em>Club</em></strong>
            <span className="ceo-brand-subtitle">{brandSubtitle}</span>
          </div>
        </div>

        <div className="ceo-sidebar-section-heading"><span>SEU ESPAÇO</span><span className="ceo-sidebar-section-rule" /></div>

        <nav aria-label="Navegação principal" className="ceo-sidebar-nav no-scrollbar">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.href)}
                className={active ? "ceo-sidebar-link is-active" : "ceo-sidebar-link"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={itemIcon(item.href)} /></svg>
                <span>{item.label}</span>
                {active && <i aria-hidden="true" className="ceo-sidebar-active-marker" />}
              </button>
            );
          })}
        </nav>

        <div className="ceo-sidebar-bottom">
          <div className="ceo-sidebar-account">
            <span className="ceo-sidebar-avatar" aria-hidden="true">{initials}</span>
            <div className="ceo-sidebar-account-copy">
              <span className="ceo-sidebar-role">{roleLabel}</span>
              <strong title={nome}>{nome}</strong>
              <small title={description}>{description}</small>
            </div>
          </div>
          <button type="button" onClick={() => void onLogout()} className="ceo-sidebar-logout">
            <span>Sair da plataforma</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17l5-5-5-5 M15 12H3 M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div aria-hidden="true" className="ceo-sidebar-spacer" />
      <aside className="ceo-sidebar ceo-sidebar-desktop" aria-label="Menu principal">
        {sidebarContent()}
      </aside>

      <button type="button" className="ceo-sidebar-mobile-toggle" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16 M4 12h16 M4 17h16" /></svg>
        <span>Menu</span>
      </button>

      {open && (
        <div className="ceo-sidebar-mobile-overlay">
          <button type="button" className="ceo-sidebar-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <aside className="ceo-sidebar ceo-sidebar-mobile-panel" aria-label="Menu principal">
            <button type="button" className="ceo-sidebar-close" aria-label="Fechar menu" onClick={() => setOpen(false)}>×</button>
            {sidebarContent()}
          </aside>
        </div>
      )}
    </>
  );
}
