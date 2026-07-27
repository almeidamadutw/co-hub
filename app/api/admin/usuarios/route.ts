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

const camposPerfilLista =
  "id, nome, email, role, telefone, status, codigo_inscricao, acesso_suporte, precisa_trocar_senha, trocas_senha, ultima_troca_senha, created_at, updated_at";

const camposPerfilCompleto =
  "id, nome, email, role, avatar_url, created_at, telefone, status, codigo_inscricao, updated_at, genero, nascimento, nacionalidade, profissao, cidade, foto_url, primeira_senha_alterada, precisa_trocar_senha, trocas_senha, ultima_troca_senha, total_resets_senha, total_solicitacoes_senha, ultima_solicitacao_senha, acesso_suporte";

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function textoOpcional(body: Record<string, unknown>, campo: string) {
  return body[campo] !== undefined
    ? String(body[campo] ?? "").trim()
    : undefined;
}

function normalizarComparacao(valor: unknown) {
  return String(valor ?? "").trim();
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

  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  const permissao = await verificarAcesso(
    req,
    id ? ["suporte"] : ["mentor", "suporte"]
  );

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const admin = criarClienteAdmin();

  if (id) {
    const { data: perfil, error: perfilError } = await admin
      .from("profiles")
      .select(camposPerfilCompleto)
      .eq("id", id)
      .is("excluido_em", null)
      .single();

    if (perfilError || !perfil) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.getUserById(id);

    return NextResponse.json({
      usuario: {
        ...perfil,
        email_confirmed_at: authData?.user?.email_confirmed_at ?? null,
        last_sign_in_at: authData?.user?.last_sign_in_at ?? null,
      },
      aviso_auth: authError
        ? "Não foi possível consultar os dados de acesso no Supabase Auth."
        : null,
    });
  }

  const { data, error } = await admin
    .from("profiles")
    .select(camposPerfilLista)
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

  const permissao = await verificarAcesso(req, ["suporte"]);

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

  const permissao = await verificarAcesso(req, ["suporte"]);

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
    const nome = textoOpcional(body, "nome");
    const email =
      body.email !== undefined
        ? String(body.email ?? "").toLowerCase().trim()
        : undefined;
    const telefone = textoOpcional(body, "telefone");
    const codigoInscricao = textoOpcional(body, "codigo_inscricao");
    const genero = textoOpcional(body, "genero");
    const nascimento = textoOpcional(body, "nascimento");
    const nacionalidade = textoOpcional(body, "nacionalidade");
    const profissao = textoOpcional(body, "profissao");
    const cidade = textoOpcional(body, "cidade");
    const fotoUrl = textoOpcional(body, "foto_url");
    const roleNormalizada =
      body.role !== undefined ? normalizarRole(body.role) : undefined;
    const statusNormalizado =
      body.status !== undefined ? normalizarStatus(body.status) : undefined;
    const acessoSuporte =
      body.acesso_suporte !== undefined
        ? body.acesso_suporte === true
        : undefined;

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

    if (
      body.acesso_suporte !== undefined &&
      typeof body.acesso_suporte !== "boolean"
    ) {
      return NextResponse.json(
        { error: "A permissão de Suporte/T.I. deve ser verdadeira ou falsa." },
        { status: 400 }
      );
    }

    if (body.role !== undefined && roleNormalizada === null) {
      return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
    }

    if (body.status !== undefined && statusNormalizado === null) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const limites: Array<[string, string | undefined, number]> = [
      ["nome", nome, 160],
      ["e-mail", email, 320],
      ["telefone", telefone, 40],
      ["código de inscrição", codigoInscricao, 80],
      ["gênero", genero, 80],
      ["nascimento", nascimento, 20],
      ["nacionalidade", nacionalidade, 120],
      ["profissão", profissao, 160],
      ["cidade", cidade, 160],
      ["foto do perfil", fotoUrl, 3_000_000],
    ];

    const campoMuitoLongo = limites.find(
      ([, valor, limite]) => valor !== undefined && valor.length > limite
    );

    if (campoMuitoLongo) {
      return NextResponse.json(
        { error: `O campo ${campoMuitoLongo[0]} ultrapassou o limite permitido.` },
        { status: 400 }
      );
    }

    if (
      nascimento !== undefined &&
      nascimento &&
      !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)
    ) {
      return NextResponse.json(
        { error: "A data de nascimento deve estar no formato AAAA-MM-DD." },
        { status: 400 }
      );
    }

    const admin = criarClienteAdmin();

    const { data: perfilAtual, error: perfilAtualError } = await admin
      .from("profiles")
      .select(camposPerfilCompleto)
      .eq("id", id)
      .is("excluido_em", null)
      .single();

    if (perfilAtualError || !perfilAtual) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const alterandoProprioAcesso =
      id === permissao.userId &&
      ((roleNormalizada !== undefined &&
        roleNormalizada !== perfilAtual.role) ||
        (statusNormalizado !== undefined &&
          normalizarComparacao(statusNormalizado).toLowerCase() !==
            normalizarComparacao(perfilAtual.status).toLowerCase()) ||
        (acessoSuporte !== undefined &&
          acessoSuporte !== Boolean(perfilAtual.acesso_suporte)));

    if (alterandoProprioAcesso) {
      return NextResponse.json(
        {
          error:
            "Outro usuário de suporte deve alterar seu perfil, status ou acesso T.I.",
        },
        { status: 400 }
      );
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

    if (codigoInscricao !== undefined) {
      camposAtualizar.codigo_inscricao = codigoInscricao || null;
    }

    if (genero !== undefined) {
      camposAtualizar.genero = genero || null;
    }

    if (nascimento !== undefined) {
      camposAtualizar.nascimento = nascimento || null;
    }

    if (nacionalidade !== undefined) {
      camposAtualizar.nacionalidade = nacionalidade || null;
    }

    if (profissao !== undefined) {
      camposAtualizar.profissao = profissao || null;
    }

    if (cidade !== undefined) {
      camposAtualizar.cidade = cidade || null;
    }

    if (fotoUrl !== undefined) {
      camposAtualizar.foto_url = fotoUrl || null;
    }

    if (roleNormalizada !== undefined && roleNormalizada !== null) {
      camposAtualizar.role = roleNormalizada;
    }

    if (statusNormalizado !== undefined && statusNormalizado !== null) {
      camposAtualizar.status = statusNormalizado;
    }

    if (acessoSuporte !== undefined) {
      camposAtualizar.acesso_suporte = acessoSuporte;
    }

    const { data: authAtual, error: authBuscaError } =
      await admin.auth.admin.getUserById(id);

    if (authBuscaError || !authAtual.user) {
      return NextResponse.json(
        {
          error:
            authBuscaError?.message ??
            "O login deste usuário não foi encontrado no Supabase Auth.",
        },
        { status: 404 }
      );
    }

    const authPayload: {
      email?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    if (email !== undefined && email !== perfilAtual.email) {
      authPayload.email = email;
    }

    const metadata: Record<string, unknown> = {
      ...(authAtual.user.user_metadata ?? {}),
    };
    let metadataAlterada = false;

    if (nome !== undefined && nome !== perfilAtual.nome) {
      metadata.nome = nome;
      metadataAlterada = true;
    }

    if (
      roleNormalizada !== undefined &&
      roleNormalizada !== null &&
      roleNormalizada !== perfilAtual.role
    ) {
      metadata.role = roleNormalizada;
      metadataAlterada = true;
    }

    if (metadataAlterada) {
      authPayload.user_metadata = metadata;
    }

    let authFoiAtualizado = false;

    if (Object.keys(authPayload).length > 0) {
      const { error: authUpdateError } =
        await admin.auth.admin.updateUserById(id, authPayload);

      if (authUpdateError) {
        return NextResponse.json(
          { error: authUpdateError.message },
          { status: 400 }
        );
      }

      authFoiAtualizado = true;
    }

    const { data, error } = await admin
      .from("profiles")
      .update(camposAtualizar)
      .eq("id", id)
      .select(camposPerfilCompleto)
      .single();

    if (error) {
      if (authFoiAtualizado) {
        await admin.auth.admin.updateUserById(id, {
          email: perfilAtual.email,
          user_metadata: authAtual.user.user_metadata ?? {},
        });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const camposAuditaveis = [
      "nome",
      "email",
      "telefone",
      "codigo_inscricao",
      "genero",
      "nascimento",
      "nacionalidade",
      "profissao",
      "cidade",
      "foto_url",
      "role",
      "status",
      "acesso_suporte",
    ] as const;

    const camposAlterados = camposAuditaveis.filter(
      (campo) =>
        normalizarComparacao(perfilAtual[campo]) !==
        normalizarComparacao(data[campo])
    );

    const { data: operador } = await admin
      .from("profiles")
      .select("nome, email")
      .eq("id", permissao.userId)
      .single();

    const { error: logError } = await admin.from("suporte_logs").insert({
      suporte_id: permissao.userId,
      suporte_nome: operador?.nome ?? "Equipe CEO Club",
      suporte_email: operador?.email ?? null,
      acao: "edicao_usuario",
      entidade: "profiles",
      entidade_id: id,
      descricao: `Atualizou a ficha de ${
        data.nome || data.email || id
      }. Campos alterados: ${camposAlterados.join(", ") || "nenhum"}.`,
      metadata: {
        usuario_alterado_id: id,
        campos_alterados: camposAlterados,
      },
      created_at: new Date().toISOString(),
    });

    const { data: authDepois } = await admin.auth.admin.getUserById(id);

    return NextResponse.json({
      usuario: {
        ...data,
        email_confirmed_at:
          authDepois?.user?.email_confirmed_at ??
          authAtual.user.email_confirmed_at ??
          null,
        last_sign_in_at:
          authDepois?.user?.last_sign_in_at ??
          authAtual.user.last_sign_in_at ??
          null,
      },
      aviso: logError
        ? "Os dados foram salvos, mas o registro de auditoria falhou."
        : null,
    });
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

  const permissao = await verificarAcesso(req, ["suporte"]);

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
