export type TicketStatus =
  | "aberto"
  | "em_analise"
  | "respondido"
  | "resolvido";

export type TicketPrioridade = "baixa" | "media" | "alta" | "urgente";

export type TicketCategoria =
  | "problema_tecnico"
  | "alteracao_senha"
  | "duvida_aula"
  | "duvida_financeira"
  | "duvida_atividade"
  | "outro";

export type Ticket = {
  id: string;
  usuario_id: string | null;
  nome_usuario: string | null;
  email_usuario: string | null;
  role_usuario: string | null;
  categoria: TicketCategoria | string | null;
  prioridade: TicketPrioridade | string | null;
  status: TicketStatus | string | null;
  assunto: string | null;
  mensagem: string | null;
  resposta: string | null;
  origem: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolvido_em: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  assumido_em: string | null;
  primeira_resposta_em: string | null;
  resolvido_por_id: string | null;
  resolvido_por_nome: string | null;
};

export type MensagemTicket = {
  id: string;
  ticket_id: string;
  autor_id: string | null;
  autor_nome: string | null;
  autor_email: string | null;
  autor_role: string | null;
  mensagem: string;
  tipo: string | null;
  created_at: string | null;
};

export const categoriasTicket: Array<{
  label: string;
  value: TicketCategoria;
}> = [
  { label: "Problema técnico", value: "problema_tecnico" },
  { label: "Alteração de senha", value: "alteracao_senha" },
  { label: "Dúvida sobre aula", value: "duvida_aula" },
  { label: "Dúvida financeira", value: "duvida_financeira" },
  { label: "Dúvida sobre atividade", value: "duvida_atividade" },
  { label: "Outro", value: "outro" },
];

export const prioridadesTicket: Array<{
  label: string;
  value: TicketPrioridade;
}> = [
  { label: "Baixa", value: "baixa" },
  { label: "Média", value: "media" },
  { label: "Alta", value: "alta" },
  { label: "Urgente", value: "urgente" },
];

export function normalizarTicket(valor: unknown) {
  return String(valor ?? "").trim().toLowerCase();
}

export function nomeStatusTicket(status: unknown) {
  const valor = normalizarTicket(status);

  if (valor === "em_analise") return "Em análise";
  if (valor === "respondido") return "Aguardando usuário";
  if (valor === "resolvido") return "Resolvido";
  return "Aguardando suporte";
}

export function nomeCategoriaTicket(categoria: unknown) {
  const valor = normalizarTicket(categoria)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "_");

  return (
    categoriasTicket.find((item) => item.value === valor)?.label ?? "Outro"
  );
}

export function nomePrioridadeTicket(prioridade: unknown) {
  const valor = normalizarTicket(prioridade);

  if (valor === "normal") return "Média";
  if (valor === "critica" || valor === "crítica") return "Urgente";

  return (
    prioridadesTicket.find((item) => item.value === valor)?.label ?? "Média"
  );
}

export function ticketResolvido(ticket: Ticket | null) {
  return normalizarTicket(ticket?.status) === "resolvido";
}

export function formatarDataTicket(data: string | null, comHora = true) {
  if (!data) return "Sem data";

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora
      ? {
          hour: "2-digit" as const,
          minute: "2-digit" as const,
        }
      : {}),
  }).format(valor);
}

export function tempoDesdeTicket(data: string | null, agora = Date.now()) {
  if (!data) return "sem registro de horário";

  const inicio = new Date(data).getTime();
  if (!Number.isFinite(inicio)) return "sem registro de horário";

  const minutos = Math.max(0, Math.floor((agora - inicio) / 60_000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;

  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias === 1 ? "" : "s"}`;
}

export function pontuacaoPrioridadeTicket(prioridade: unknown) {
  const valor = normalizarTicket(prioridade);

  if (valor === "urgente" || valor === "critica" || valor === "crítica") {
    return 4;
  }
  if (valor === "alta") return 3;
  if (valor === "media" || valor === "normal") return 2;
  return 1;
}
