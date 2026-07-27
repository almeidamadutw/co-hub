import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
  type UserRole,
} from "@/utils/apiAuth";

type UserStatus =
  | "Ativo"
  | "Pendente"
  | "Inativo"
  | "Bloqueado"
  | "Cancelado"
  | "Suspenso";

const rolesValidas: UserRole[] = [
  "mentor",
  "mentorado",
  "financeiro",
  "suporte",
];

const statusValidos: UserStatus[] = [
  "Ativo",
  "Pendente",
  "Inativo",
  "Bloqueado",
  "Cancelado",
  "Suspenso",
];

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizarRole(role: unknown): UserRole | null {
  const valor = String(role ?? "").trim();

  if (rolesValidas.includes(valor as UserRole)) {
    return valor as UserRole;
  }

  return null;
}

function normalizarStatus(status: unknown): UserStatus | null {
  const valor = String(status ?? "").trim().toLowerCase();
  const statusEncontrado = statusValidos.find(
    (item) => item.toLowerCase() === valor
  );

  return statusEncontrado ?? null;
}

async function lerBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const config = erroConfig();

  if (config) {
    return NextResponse.json({ error: config }, { status: 500 });
  }

  const permissao = await verificarAcesso(req, ["mentor", "suporte"]);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const admin = criarClienteAdmin();

  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, nome, email, role, telefone, status, codigo_inscricao, acesso_suporte, precisa_trocar_senha, trocas_senha, ultima_troca_senha, created_at, updated_at"
    )
    .is("excluido_em", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  const usuariosAuth = new Map(
    (authData?.users ?? []).map((usuario) => [usuario.id, usuario])
  );

  const usuarios = (data ?? []).map((perfil) => {
    const usuarioAuth = usuariosAuth.get(perfil.id);

    return {
      ...perfil,
      email_confirmed_at: usuarioAuth?.email_confirmed_at ?? null,
      last_sign_in_at: usuarioAuth?.last_sign_in_at ?? null,
    };
  });

  return NextResponse.json({
    usuarios,
    aviso_auth: authError
      ? "Não foi possível consultar o último acesso no Supabase Auth."
      : null,
  });
}

export async function POST(req: NextRequest) {
  const config = erroConfig();

  if (config) {
    return NextResponse.json({ error: config }, { status: 500 });
  }

  const permissao = await verificarAcesso(req, ["mentor", "suporte"]);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const body = await lerBody(req);

  if (!body) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").toLowerCase().trim();
  const senha = String(body.senha ?? "").trim();
  const role = normalizarRole(body.role ?? "mentorado");
  const telefone = String(body.telefone ?? "").trim();
  const status = normalizarStatus(body.status ?? "Ativo");
  const codigoInscricao = String(body.codigo_inscricao ?? "").trim();
  const acessoSuporte = Boolean(body.acesso_suporte);

  if (!nome || !email || !senha) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e senha temporária." },
      { status: 400 }
    );
  }

  if (!validarEmail(email)) {
    return NextResponse.json(
      { error: "Informe um e-mail válido." },
      { status: 400 }
    );
  }

  if (senha.length < 6) {
    return NextResponse.json(
      { error: "A senha temporária precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  if (!role) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const admin = criarClienteAdmin();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        role,
      },
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Não foi possível criar o usuário." },
      { status: 400 }
    );
  }

  const { data: perfil, error: perfilError } = await admin
    .from("profiles")
    .upsert({
      id: authData.user.id,
      nome,
      email,
      role,
      telefone: telefone || null,
      status,
      codigo_inscricao: codigoInscricao || null,
      acesso_suporte: acessoSuporte,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, nome, email, role, telefone, status, codigo_inscricao, acesso_suporte, precisa_trocar_senha, trocas_senha, ultima_troca_senha, created_at, updated_at"
    )
    .single();

  if (perfilError) {
    await admin.auth.admin.deleteUser(authData.user.id);

    return NextResponse.json({ error: perfilError.message }, { status: 500 });
  }

  return NextResponse.json({
    usuario: {
      ...perfil,
      email_confirmed_at: authData.user.email_confirmed_at ?? null,
      last_sign_in_at: authData.user.last_sign_in_at ?? null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const config = erroConfig();

  if (config) {
    return NextResponse.json({ error: config }, { status: 500 });
  }

  const permissao = await verificarAcesso(req, ["mentor", "suporte"]);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const body = await lerBody(req);

  if (!body) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  try {
    const id = String(body.id ?? "").trim();

    const nome =
      body.nome !== undefined ? String(body.nome ?? "").trim() : undefined;

    const email =
      body.email !== undefined
        ? String(body.email ?? "").toLowerCase().trim()
        : undefined;

    const telefone =
      body.telefone !== undefined
        ? String(body.telefone ?? "").trim()
        : undefined;

    const roleNormalizada =
      body.role !== undefined ? normalizarRole(body.role) : undefined;

    const statusNormalizado =
      body.status !== undefined ? normalizarStatus(body.status) : undefined;

    if (!id) {
      return NextResponse.json(
        { error: "ID do usuário não informado." },
        { status: 400 }
      );
    }

    if (nome !== undefined && !nome) {
      return NextResponse.json(
        { error: "O nome não pode ficar vazio." },
        { status: 400 }
      );
    }

    if (email !== undefined && !validarEmail(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 }
      );
    }

    if (body.role !== undefined && roleNormalizada === null) {
      return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
    }

    if (body.status !== undefined && statusNormalizado === null) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const camposAtualizar: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (nome !== undefined) {
      camposAtualizar.nome = nome;
    }

    if (email !== undefined) {
      camposAtualizar.email = email;
    }

    if (telefone !== undefined) {
      camposAtualizar.telefone = telefone || null;
    }

    if (roleNormalizada !== undefined && roleNormalizada !== null) {
      camposAtualizar.role = roleNormalizada;
    }

    if (statusNormalizado !== undefined && statusNormalizado !== null) {
      camposAtualizar.status = statusNormalizado;
    }

    const admin = criarClienteAdmin();

    const { data, error } = await admin
      .from("profiles")
      .update(camposAtualizar)
      .eq("id", id)
      .select(
        "id, nome, email, role, telefone, status, codigo_inscricao, acesso_suporte, precisa_trocar_senha, trocas_senha, ultima_troca_senha, created_at, updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const authPayload: {
      email?: string;
      user_metadata?: Record<string, string>;
    } = {};

    if (email !== undefined) {
      authPayload.email = email;
    }

    const metadata: Record<string, string> = {};

    if (nome !== undefined) {
      metadata.nome = nome;
    }

    if (roleNormalizada !== undefined && roleNormalizada !== null) {
      metadata.role = roleNormalizada;
    }

    if (Object.keys(metadata).length > 0) {
      authPayload.user_metadata = metadata;
    }

    if (Object.keys(authPayload).length > 0) {
      const { error: authUpdateError } =
        await admin.auth.admin.updateUserById(id, authPayload);

      if (authUpdateError) {
        return NextResponse.json(
          { error: authUpdateError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ usuario: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar usuário.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const config = erroConfig();

  if (config) {
    return NextResponse.json({ error: config }, { status: 500 });
  }

  const permissao = await verificarAcesso(req, ["mentor", "suporte"]);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const body = await lerBody(req);

  if (!body) {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  try {
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "ID do usuário não informado." },
        { status: 400 }
      );
    }

    if (id === permissao.userId) {
      return NextResponse.json(
        { error: "Você não pode excluir o próprio usuário logado." },
        { status: 400 }
      );
    }

    const admin = criarClienteAdmin();

    const { data: perfilAlvo, error: perfilBuscaError } = await admin
      .from("profiles")
      .select(
        "id, nome, email, telefone, role, status, codigo_inscricao, acesso_suporte, excluido_em"
      )
      .eq("id", id)
      .single();

    if (perfilBuscaError || !perfilAlvo) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    if (perfilAlvo.excluido_em) {
      return NextResponse.json(
        { error: "Este usuário já foi excluído." },
        { status: 409 }
      );
    }

    if (String(perfilAlvo.status ?? "").trim().toLowerCase() !== "cancelado") {
      return NextResponse.json(
        {
          error:
            "Cancele o usuário e salve a alteração antes de excluí-lo.",
        },
        { status: 409 }
      );
    }

    const { data: operador } = await admin
      .from("profiles")
      .select("nome, email")
      .eq("id", permissao.userId)
      .single();

    const { error: authError } = await admin.auth.admin.deleteUser(id, true);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const excluidoEm = new Date().toISOString();
    const emailAnonimizado = `excluido+${id}@ceoclub.local`;

    const { error: perfilError } = await admin
      .from("profiles")
      .update({
        nome: "Usuário excluído",
        email: emailAnonimizado,
        telefone: null,
        codigo_inscricao: null,
        avatar_url: null,
        genero: null,
        nascimento: null,
        nacionalidade: null,
        profissao: null,
        cidade: null,
        foto_url: null,
        acesso_suporte: false,
        excluido_em: excluidoEm,
        excluido_por: permissao.userId,
        updated_at: excluidoEm,
      })
      .eq("id", id)
      .is("excluido_em", null)
      .select("id")
      .single();

    if (perfilError) {
      return NextResponse.json(
        {
          error:
            "O login foi removido, mas não foi possível anonimizar o perfil. Tente novamente.",
        },
        { status: 500 }
      );
    }

    const { error: logError } = await admin.from("suporte_logs").insert({
      suporte_id: permissao.userId,
      suporte_nome: operador?.nome ?? "Equipe CEO Club",
      suporte_email: operador?.email ?? null,
      acao: "exclusao_usuario",
      entidade: "profiles",
      entidade_id: id,
      descricao: `Excluiu o acesso de ${
        perfilAlvo.nome || perfilAlvo.email || id
      } após o cancelamento. O perfil foi anonimizado e o histórico operacional preservado.`,
      metadata: {
        usuario_excluido_id: id,
        usuario_excluido_nome: perfilAlvo.nome,
        usuario_excluido_email: perfilAlvo.email,
        perfil_anterior: perfilAlvo.role,
        status_anterior: perfilAlvo.status,
        exclusao_tipo: "segura",
      },
      created_at: excluidoEm,
    });

    return NextResponse.json({
      ok: true,
      aviso: logError
        ? "O usuário foi excluído, mas o registro de auditoria falhou."
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao excluir usuário.",
      },
      { status: 500 }
    );
  }
}
