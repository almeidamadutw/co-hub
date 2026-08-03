"use client";

import { usePathname } from "next/navigation";
import PageLoading from "@/components/PageLoading";

const paginasPorRota: Record<string, string> = {
  dashboard: "painel",
  agenda: "agenda",
  biblioteca: "biblioteca",
  conta: "minha conta",
  financeiro: "financeiro",
  mentor: "mentora",
  mentorados: "mentorados",
  mentores: "mentores",
  modulos: "módulos",
  praticar: "simulados",
  progresso: "progresso",
  relatorios: "relatórios",
  "reset-senha": "recuperação de senha",
  simulados: "simulados",
  suporte: "suporte",
  tickets: "chamados",
  usuarios: "usuários",
  logs: "histórico",
};

function obterPagina(pathname: string) {
  const segmentos = pathname.split("/").filter(Boolean);
  const ultimoSegmento = segmentos.at(-1) ?? "página";

  if (pathname === "/suporte") return "central de T.I";
  if (ultimoSegmento === "editar") return "editor do simulado";

  if (segmentos.includes("mentorados") && ultimoSegmento === "lista") {
    return "mentorados";
  }

  if (
    segmentos.includes("mentorados") &&
    ultimoSegmento !== "mentorados" &&
    ultimoSegmento !== "lista"
  ) {
    return "detalhes do mentorado";
  }

  return paginasPorRota[ultimoSegmento] ?? ultimoSegmento.replaceAll("-", " ");
}

export default function RouteLoading() {
  const pathname = usePathname();

  return <PageLoading pagina={obterPagina(pathname)} />;
}
