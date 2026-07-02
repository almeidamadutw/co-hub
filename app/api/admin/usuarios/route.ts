import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
  type UserRole,
} from "@/utils/apiAuth";

type UserStatus = "Ativo" | "Pendente" | "Inativo";

const rolesValidas: UserRole[] = [
  "mentor",
  "mentorado",
  "financeiro",
  "suporte",
];

const statusValidos: UserStatus[] = ["Ativo", "Pendente", "Inativo"];

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
  const valor = String(status ?? "").trim();

  if (statusValidos.includes(valor as UserStatus)) {
    return valor as UserStatus;
  }

  return null;
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
      "id, nome, email, role, telefone, status, codigo_inscricao, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ usuarios: data ?? [] });
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
      status: "Ativo",
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, nome, email, role, telefone, status, codigo_inscricao, created_at"
    )
    .single();

  if (perfilError) {
    await admin.auth.admin.deleteUser(authData.user.id);

    return NextResponse.json({ error: perfilError.message }, { status: 500 });
  }

  return NextResponse.json({ usuario: perfil });
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
        "id, nome, email, role, telefone, status, codigo_inscricao, created_at"
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

    const { error: perfilError } = await admin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (perfilError) {
      return NextResponse.json({ error: perfilError.message }, { status: 400 });
    }

    const { error: authError } = await admin.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
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