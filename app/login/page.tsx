"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { emailDoLogin } from "@/utils/loginCEO";
import styles from "./entrada.module.css";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/utils/supabase";
import {
  logoutUsuario,
  salvarUsuarioLogado,
  sincronizarUsuarioComSessao,
} from "@/utils/auth";
import { definirPersistenciaSessao } from "@/utils/sessionPersistence";

type UserRole = "mentor" | "mentorado" | "financeiro" | "suporte";

type UsuarioLogado = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  acesso_suporte?: boolean;
};

const rolesValidas: UserRole[] = [
  "mentor",
  "mentorado",
  "financeiro",
  "suporte",
];

function redirecionarPorRole(
  role: UserRole,
  router: ReturnType<typeof useRouter>
) {
  if (role === "mentor") {
    router.replace("/mentor/dashboard");
    return;
  }

  if (role === "mentorado") {
    router.replace("/mentorado/dashboard");
    return;
  }

  if (role === "financeiro") {
    router.replace("/mentor/financeiro");
    return;
  }

  if (role === "suporte") {
    router.replace("/suporte");
    return;
  }

  router.replace("/login");
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [manterConectado, setManterConectado] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    let componenteAtivo = true;

    async function restaurarSessao() {
      try {
        const usuario = await sincronizarUsuarioComSessao();

        if (!componenteAtivo) return;

        if (usuario && rolesValidas.includes(usuario.role)) {
          redirecionarPorRole(usuario.role, router);
          return;
        }
      } catch (error) {
        console.error("Não foi possível restaurar a sessão:", error);
      } finally {
        if (componenteAtivo) {
          setVerificandoSessao(false);
        }
      }
    }

    void restaurarSessao();

    return () => {
      componenteAtivo = false;
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setCarregando(true);

    const emailNormalizado = emailDoLogin(email);
    const senhaNormalizada = senha.trim();

    if (!emailNormalizado || !senhaNormalizada) {
      setCarregando(false);
      setErro("Use o login nome@ceoclubmentoria e informe sua senha.");
      return;
    }

    definirPersistenciaSessao(manterConectado);

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: emailNormalizado,
        password: senhaNormalizada,
      });

    if (loginError || !loginData.user) {
      setCarregando(false);
      setErro("Login ou senha inválidos.");
      return;
    }

    const user = loginData.user;

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("nome, email, role, acesso_suporte, status, excluido_em")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil || perfil.excluido_em) {
      setCarregando(false);
      setErro("Perfil não encontrado. Verifique o cadastro no Supabase.");
      await supabase.auth.signOut();
      return;
    }

    const role = String(perfil.role ?? "")
      .trim()
      .toLowerCase() as UserRole;
    const nome = perfil.nome || user.email || "Usuário";
    const status = String(perfil.status ?? "").trim().toLowerCase();

    if (!rolesValidas.includes(role) || (status && status !== "ativo")) {
      setCarregando(false);
      setErro(
        status && status !== "ativo"
          ? "Seu acesso está inativo ou pendente. Fale com o suporte."
          : "Perfil inválido no banco de dados."
      );
      await logoutUsuario();
      return;
    }

    const usuarioLogado: UsuarioLogado = {
      id: user.id,
      nome,
      email: perfil.email || user.email || emailNormalizado,
      role,
      acesso_suporte: Boolean(perfil.acesso_suporte),
    };

    salvarUsuarioLogado(usuarioLogado, manterConectado);

    setCarregando(false);
    redirecionarPorRole(role, router);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Image src="/images/logo.jpeg" alt="CEO Club" width={64} height={64} className={styles.logo} />
        <span>Plataforma de mentoria</span>
      </header>
      <section className={styles.hero} aria-labelledby="titulo-entrada">
        <div className={styles.content}>
          <p className={styles.eyebrow}>Área de membros</p>
          {formularioAberto ? (
            <>
              <h1 id="titulo-entrada" className={styles.formTitle}>Seu acesso</h1>
              <form onSubmit={handleLogin} className={styles.form}>
                <label htmlFor="email">Login</label>
                <input id="email" type="text" autoCapitalize="none" spellCheck={false} autoComplete="username" autoFocus required
                  placeholder="nome@ceoclubmentoria" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro(""); }} />
                <label htmlFor="senha">Senha</label>
                <div className={styles.password}>
                  <input id="senha" type={mostrarSenha ? "text" : "password"} autoComplete="current-password"
                    required placeholder="Sua senha" value={senha}
                    onChange={(e) => { setSenha(e.target.value); setErro(""); }} />
                  <button type="button" aria-pressed={mostrarSenha} aria-label="Mostrar senha"
                    onClick={() => setMostrarSenha(!mostrarSenha)}>{mostrarSenha ? "Ocultar" : "Ver"}</button>
                </div>
                <div className={styles.options}>
                  <label><input type="checkbox" checked={manterConectado}
                    onChange={(e) => setManterConectado(e.target.checked)} />Manter conectado</label>
                  <Link href="/esqueci-senha">Ativar ou recuperar acesso</Link>
                </div>
                {erro && <p role="alert" className={styles.error}>{erro}</p>}
                <button className={styles.action} disabled={carregando || verificandoSessao}>
                  {verificandoSessao ? "Verificando sessão…" : carregando ? "Entrando…" : "Entrar"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 id="titulo-entrada" className={styles.title}>CEO <i>Club</i></h1>
              <p className={styles.lede}>Suas aulas, seus encontros e os próximos passos da sua clínica em um só lugar.</p>
              <button className={styles.action} onClick={() => setFormularioAberto(true)}>
                Acessar plataforma <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
        <div className={styles.art} aria-hidden="true">
          <Image src="/images/coroa-prata.webp" alt="" width={1024} height={1024} preload
            sizes="(max-width: 700px) 80vw, 48vw" className={styles.crown} />
        </div>
      </section>
      <footer className={styles.footer}>
        <Image src="/images/luciana.jpg" alt="" width={48} height={48} className={styles.portrait} />
        <div><small>Sua mentora</small><strong>Dra. Luciana Rocha</strong></div>
      </footer>
    </main>
  );
}
