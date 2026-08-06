import { obterCabecalhoAutorizacao } from "@/utils/apiAuthClient";
import type { MensagemTicket, Ticket } from "@/utils/tickets";

type TicketsPayload = {
  ok?: boolean;
  error?: string;
  modo?: "suporte" | "mentorado";
  usuario_id?: string;
  tickets?: Ticket[];
  ticket?: Ticket;
  mensagens?: MensagemTicket[];
};

async function lerResposta(response: Response) {
  const payload = (await response.json().catch(() => null)) as TicketsPayload | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Não foi possível concluir a operação.");
  }

  return payload;
}

export async function carregarTicketsApi(ticketId?: string) {
  const headers = await obterCabecalhoAutorizacao();
  const query = ticketId ? `?ticket=${encodeURIComponent(ticketId)}` : "";
  const response = await fetch(`/api/tickets${query}`, {
    cache: "no-store",
    headers,
  });

  return lerResposta(response);
}

export async function operarTicketApi(body: Record<string, unknown>) {
  const headers = await obterCabecalhoAutorizacao();
  const response = await fetch("/api/tickets", {
    method: "POST",
    cache: "no-store",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return lerResposta(response);
}
