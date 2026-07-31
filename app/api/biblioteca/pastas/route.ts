import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";

let clienteAdmin: ReturnType<typeof criarClienteAdmin> | null = null;

function supabaseAdmin() {
  clienteAdmin ??= criarClienteAdmin();
  return clienteAdmin;
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function podeGerenciar(role: string) {
  return role === "mentor" || role === "suporte";
}

function respostaSemPermissao() {
  return NextResponse.json(
    {
      ok: false,
      error: "Somente mentora e Suporte/T.I. podem gerenciar pastas.",
    },
    { status: 403 }
  );
}

async function validarNomeDuplicado(nome: string, ignorarId?: string) {
  let query = supabaseAdmin()
    .from("biblioteca_pastas")
    .select("id, nome");

  if (ignorarId) query = query.neq("id", ignorarId);

  const { data, error } = await query;

  if (error) throw error;

  const nomeNormalizado = nome.toLocaleLowerCase("pt-BR");
  const duplicada = (data ?? []).some(
    (pasta) => texto(pasta.nome).toLocaleLowerCase("pt-BR") === nomeNormalizado
  );

  if (duplicada) {
    throw new Error("Já existe uma pasta com esse nome.");
  }
}

async function registrarAuditoria({
  usuarioId,
  acao,
  pastaId,
  descricao,
  metadata = {},
}: {
  usuarioId: string;
  acao: string;
  pastaId: string;
  descricao: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: perfil } = await supabaseAdmin()
      .from("profiles")
      .select("nome, email")
      .eq("id", usuarioId)
      .single();

    await supabaseAdmin().from("suporte_logs").insert({
      suporte_id: usuarioId,
      suporte_nome: texto(perfil?.nome) || null,
      suporte_email: texto(perfil?.email) || null,
      acao,
      entidade: "biblioteca_pasta",
      entidade_id: pastaId,
      descricao,
      metadata,
    });
  } catch (error) {
    console.error("Não foi possível registrar a auditoria da pasta:", error);
  }
}

async function autorizar(request: NextRequest) {
  const permissao = await verificarAcesso(request, ["mentor", "suporte"]);

  if (!permissao.ok) return permissao;
  if (!podeGerenciar(permissao.role)) {
    return {
      ok: false as const,
      status: 403 as const,
      mensagem: "Somente mentora e Suporte/T.I. podem gerenciar pastas.",
    };
  }

  return permissao;
}

export async function POST(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();
    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await autorizar(request);
    if (!permissao.ok) {
      return permissao.status === 403
        ? respostaSemPermissao()
        : responderPermissaoNegada(permissao);
    }

    const body = await request.json().catch(() => null);
    const nome = texto(body?.nome);
    const descricao = texto(body?.descricao);
    const visibilidade = body?.visibilidade === "publica" ? "publica" : "privada";

    if (!nome || nome.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Informe um nome de pasta com até 100 caracteres." },
        { status: 400 }
      );
    }

    await validarNomeDuplicado(nome);

    const { data, error } = await supabaseAdmin()
      .from("biblioteca_pastas")
      .insert({
        nome,
        descricao: descricao || null,
        visibilidade,
        criada_por: permissao.userId,
      })
      .select("*")
      .single();

    if (error) throw error;

    await registrarAuditoria({
      usuarioId: permissao.userId,
      acao: "biblioteca_pasta_criada",
      pastaId: data.id,
      descricao: `Pasta "${nome}" criada na Biblioteca.`,
      metadata: { nome, descricao: descricao || null, visibilidade },
    });

    return NextResponse.json({ ok: true, pasta: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a pasta.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();
    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await autorizar(request);
    if (!permissao.ok) {
      return permissao.status === 403
        ? respostaSemPermissao()
        : responderPermissaoNegada(permissao);
    }

    const body = await request.json().catch(() => null);
    const id = texto(body?.id);
    const nome = texto(body?.nome);
    const descricao = texto(body?.descricao);
    const visibilidade = body?.visibilidade === "publica" ? "publica" : "privada";

    if (!id || !nome || nome.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Informe a pasta e um nome com até 100 caracteres." },
        { status: 400 }
      );
    }

    const { data: atual, error: buscaError } = await supabaseAdmin()
      .from("biblioteca_pastas")
      .select("*")
      .eq("id", id)
      .single();

    if (buscaError || !atual) {
      return NextResponse.json(
        { ok: false, error: "Pasta não encontrada." },
        { status: 404 }
      );
    }

    await validarNomeDuplicado(nome, id);

    const { data, error } = await supabaseAdmin()
      .from("biblioteca_pastas")
      .update({
        nome,
        descricao: descricao || null,
        visibilidade,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    await registrarAuditoria({
      usuarioId: permissao.userId,
      acao: "biblioteca_pasta_atualizada",
      pastaId: id,
      descricao: `Pasta "${nome}" atualizada na Biblioteca.`,
      metadata: {
        antes: {
          nome: atual.nome,
          descricao: atual.descricao,
          visibilidade: atual.visibilidade,
        },
        depois: { nome, descricao: descricao || null, visibilidade },
      },
    });

    return NextResponse.json({ ok: true, pasta: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a pasta.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();
    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await autorizar(request);
    if (!permissao.ok) {
      return permissao.status === 403
        ? respostaSemPermissao()
        : responderPermissaoNegada(permissao);
    }

    const body = await request.json().catch(() => null);
    const id = texto(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Informe a pasta que deseja remover." },
        { status: 400 }
      );
    }

    const [{ data: pasta, error: buscaError }, { count, error: countError }] =
      await Promise.all([
        supabaseAdmin()
          .from("biblioteca_pastas")
          .select("*")
          .eq("id", id)
          .single(),
        supabaseAdmin()
          .from("biblioteca_arquivos")
          .select("id", { count: "exact", head: true })
          .eq("pasta_id", id),
      ]);

    if (buscaError || !pasta) {
      return NextResponse.json(
        { ok: false, error: "Pasta não encontrada." },
        { status: 404 }
      );
    }

    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "A pasta ainda possui materiais. Mova ou remova os arquivos antes de excluí-la.",
        },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin()
      .from("biblioteca_pastas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await registrarAuditoria({
      usuarioId: permissao.userId,
      acao: "biblioteca_pasta_removida",
      pastaId: id,
      descricao: `Pasta "${texto(pasta.nome) || "sem nome"}" removida da Biblioteca.`,
      metadata: {
        nome: pasta.nome,
        descricao: pasta.descricao,
        visibilidade: pasta.visibilidade,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível remover a pasta.",
      },
      { status: 500 }
    );
  }
}
