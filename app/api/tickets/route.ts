import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";
import type {
  MensagemTicket,
  Ticket,
  TicketCategoria,
  TicketPrioridade,
} from "@/utils/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const camposTicket = [
  "id",
  "usuario_id",
  "nome_usuario",
  "email_usuario",
  "role_usuario",
  "categoria",
  "prioridade",
  "status",
  "assunto",
  "mensagem",
  "resposta",
  "origem",
  "created_at",
  "updated_at",
  "resolvido_em",
  "responsavel_id",
  "responsavel_nome",
  "assumido_em",
  "primeira_resposta_em",
  "resolvido_por_id",
  "resolvido_por_nome",
].join(", ");

const camposMensagem = [
  "id",
  "ticket_id",
  "autor_id",
  "autor_nome",
  "autor_email",
  "autor_role",
  "mensagem",
  "tipo",
  "created_at",
].join(", ");

const categoriasValidas = new Set<TicketCategoria>([
  "problema_tecnico",
  "alteracao_senha",
  "duvida_aula",
  "duvida_financeira",
  "duvida_atividade",
  "outro",
]);

const prioridadesValidas = new Set<TicketPrioridade>([
  "baixa",
  "media",
  "alta",
  "urgente",
]);

const acoesSuporte = new Set([
  "assumir",
  "prioridade",
  "em_analise",
  "responder",
  "resolver",
]);

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function acessoDeSuporte(permissao: {
  role: string;
  acessoSuporte: boolean;
}) {
  return permissao.role === "suporte" || permissao.acessoSuporte;
}

async function buscarTicketCompleto(ticketId: string) {
  const admin = criarClienteAdmin();
  const [{ data: ticket, error: ticketError }, { data: mensagens, error: mensagensError }] =
    await Promise.all([
      admin
        .from("suporte_tickets")
        .select(camposTicket)
        .eq("id", ticketId)
        .single(),
      admin
        .from("suporte_ticket_mensagens")
        .select(camposMensagem)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true }),
    ]);

  if (ticketError || !ticket) {
    throw new Error("Chamado não encontrado após a atualização.");
  }

  if (mensagensError) {
    throw new Error("O chamado foi atualizado, mas a conversa não pôde ser recarregada.");
  }

  return {
    ticket: ticket as unknown as Ticket,
    mensagens: (mensagens ?? []) as unknown as MensagemTicket[],
  };
}

export async function GET(req: NextRequest) {
  const config = erroConfig();
  if (config) return NextResponse.json({ error: config }, { status: 500 });

  const permissao = await verificarAcesso(req, ["mentorado", "suporte"]);
  if (!permissao.ok) return responderPermissaoNegada(permissao);

  const ehSuporte = acessoDeSuporte(permissao);
  const ticketId = texto(req.nextUrl.searchParams.get("ticket"));

  if (ticketId && !uuidValido(ticketId)) {
    return NextResponse.json({ error: "Identificador de chamado inválido." }, { status: 400 });
  }

  const admin = criarClienteAdmin();
  let consulta = admin
    .from("suporte_tickets")
    .select(camposTicket)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (!ehSuporte) {
    consulta = consulta.eq("usuario_id", permissao.userId);
  }

  const { data: tickets, error: ticketsError } = await consulta;

  if (ticketsError) {
    return NextResponse.json(
      { error: "Não foi possível carregar os chamados." },
      { status: 500 }
    );
  }

  const listaTickets = (tickets ?? []) as unknown as Ticket[];
  let mensagens: MensagemTicket[] = [];

  if (ticketId) {
    const ticketPermitido = listaTickets.some((ticket) => ticket.id === ticketId);

    if (!ticketPermitido) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }

    const { data, error } = await admin
      .from("suporte_ticket_mensagens")
      .select(camposMensagem)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      return NextResponse.json(
        { error: "Não foi possível carregar a conversa." },
        { status: 500 }
      );
    }

    mensagens = (data ?? []) as unknown as MensagemTicket[];
  }

  return NextResponse.json({
    ok: true,
    modo: ehSuporte ? "suporte" : "mentorado",
    usuario_id: permissao.userId,
    tickets: listaTickets,
    mensagens,
  });
}

export async function POST(req: NextRequest) {
  const config = erroConfig();
  if (config) return NextResponse.json({ error: config }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados do chamado inválidos." }, { status: 400 });
  }

  const acao = texto(body.acao).toLowerCase();
  const ticketId = texto(body.ticket_id);

  if (acao === "criar" || acao === "responder_mentorado") {
    const permissao = await verificarAcesso(req, ["mentorado"]);
    if (!permissao.ok) return responderPermissaoNegada(permissao);

    const admin = criarClienteAdmin();

    if (acao === "criar") {
      const categoria = texto(body.categoria).toLowerCase() as TicketCategoria;
      const assunto = texto(body.assunto);
      const mensagem = texto(body.mensagem);

      if (!categoriasValidas.has(categoria)) {
        return NextResponse.json({ error: "Selecione uma categoria válida." }, { status: 400 });
      }

      if (assunto.length < 3 || assunto.length > 160) {
        return NextResponse.json(
          { error: "O assunto deve ter entre 3 e 160 caracteres." },
          { status: 400 }
        );
      }

      if (mensagem.length < 5 || mensagem.length > 5000) {
        return NextResponse.json(
          { error: "A mensagem deve ter entre 5 e 5000 caracteres." },
          { status: 400 }
        );
      }

      const { data, error } = await admin.rpc("ticket_portal_criar", {
        p_actor_id: permissao.userId,
        p_categoria: categoria,
        p_assunto: assunto,
        p_mensagem: mensagem,
      });

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message ?? "Não foi possível abrir o chamado." },
          { status: 400 }
        );
      }

      const completo = await buscarTicketCompleto(String(data));
      return NextResponse.json({ ok: true, ...completo }, { status: 201 });
    }

    if (!uuidValido(ticketId)) {
      return NextResponse.json({ error: "Chamado inválido." }, { status: 400 });
    }

    const mensagem = texto(body.mensagem);
    if (mensagem.length < 1 || mensagem.length > 5000) {
      return NextResponse.json(
        { error: "A resposta deve ter entre 1 e 5000 caracteres." },
        { status: 400 }
      );
    }

    const { error } = await admin.rpc("ticket_portal_responder", {
      p_actor_id: permissao.userId,
      p_ticket_id: ticketId,
      p_mensagem: mensagem,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const completo = await buscarTicketCompleto(ticketId);
    return NextResponse.json({ ok: true, ...completo });
  }

  if (!acoesSuporte.has(acao)) {
    return NextResponse.json({ error: "Ação de chamado inválida." }, { status: 400 });
  }

  const permissao = await verificarAcesso(req, ["suporte"]);
  if (!permissao.ok) return responderPermissaoNegada(permissao);

  if (!uuidValido(ticketId)) {
    return NextResponse.json({ error: "Chamado inválido." }, { status: 400 });
  }

  const mensagem = texto(body.mensagem);
  const prioridade = texto(body.prioridade).toLowerCase() as TicketPrioridade;

  if ((acao === "responder" || acao === "resolver") && mensagem.length > 5000) {
    return NextResponse.json(
      { error: "A resposta deve ter no máximo 5000 caracteres." },
      { status: 400 }
    );
  }

  if (acao === "responder" && !mensagem) {
    return NextResponse.json({ error: "Digite uma resposta antes de enviar." }, { status: 400 });
  }

  if (acao === "prioridade" && !prioridadesValidas.has(prioridade)) {
    return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.rpc("ticket_suporte_operar", {
    p_actor_id: permissao.userId,
    p_ticket_id: ticketId,
    p_acao: acao,
    p_mensagem: mensagem || null,
    p_prioridade: acao === "prioridade" ? prioridade : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const completo = await buscarTicketCompleto(ticketId);
  return NextResponse.json({ ok: true, ...completo });
}
