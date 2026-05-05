export type EventoAgendaICS = {
  id: string;
  titulo: string;
  descricao?: string;
  local?: string;
  inicio: string | Date;
  fim: string | Date;
};

function formatDateToICS(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICSText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function gerarICS(eventos: EventoAgendaICS[]) {
  const agora = formatDateToICS(new Date());

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CEO Club//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CEO Club",
    "X-WR-CALDESC:Agenda oficial da mentoria CEO Club",
    "X-WR-TIMEZONE:America/Sao_Paulo",
    ...eventos.flatMap((evento) => {
      const inicio = new Date(evento.inicio);
      const fim = new Date(evento.fim);

      return [
        "BEGIN:VEVENT",
        `UID:${evento.id}@ceoclubmentoria.com.br`,
        `DTSTAMP:${agora}`,
        `DTSTART:${formatDateToICS(inicio)}`,
        `DTEND:${formatDateToICS(fim)}`,
        `SUMMARY:${escapeICSText(evento.titulo)}`,
        `DESCRIPTION:${escapeICSText(evento.descricao || "")}`,
        `LOCATION:${escapeICSText(evento.local || "")}`,
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];

  return linhas.join("\r\n");
}

export function baixarArquivoICS(eventos: EventoAgendaICS[]) {
  const conteudo = gerarICS(eventos);

  const blob = new Blob([conteudo], {
    type: "text/calendar;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "agenda-ceo-club.ics";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}