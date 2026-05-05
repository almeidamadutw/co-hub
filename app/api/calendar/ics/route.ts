import { NextResponse } from "next/server";
import { gerarICS, EventoAgendaICS } from "@/utils/ics";

export const dynamic = "force-dynamic";

export async function GET() {
  const eventosDoSistema: EventoAgendaICS[] = [];

  const conteudo = gerarICS(eventosDoSistema);

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agenda-ceo-club.ics"',
      "Cache-Control": "no-store, max-age=0",
    },
  });
}