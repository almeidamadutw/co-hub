"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import SuporteSidebar from "@/components/SuporteSidebar";
import { supabase } from "@/utils/supabase";
import {
  logoutUsuario,
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  User,
  usuarioTemAcessoSuporte,
} from "@/utils/auth";
import {
  atualizarFotoPerfil,
  resolverFotoPerfil,
  validarArquivoFotoPerfil,
} from "@/utils/perfilFotoClient";

type PerfilSuporte = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  genero: string | null;
  nascimento: string | null;
  nacionalidade: string | null;
  profissao: string | null;
  cidade: string | null;
  foto_url: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AbaConta = "dados" | "seguranca";

const CAMPOS_PERFIL =
  "id, nome, email, telefone, genero, nascimento, nacionalidade, profissao, cidade, foto_url, role, status, created_at, updated_at";

function separarNome(nomeCompleto: string) {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);

  return {
    nome: partes[0] ?? "",
    sobrenome: partes.slice(1).join(" "),
  };
}

export default function ContaSuportePage() {
  const router = useRouter();
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilSuporte | null>(null);
  const [aba, setAba] = useState<AbaConta>("dados");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [fotoInicial, setFotoInicial] = useState<string | null>(null);
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoRemovida, setFotoRemovida] = useState(false);

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [genero, setGenero] = useState("Não informado");
  const [nascimento, setNascimento] = useState("");
  const [nacionalidade, setNacionalidade] = useState("Brasil");
  const [profissao, setProfissao] = useState("");
  const [cidade, setCidade] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await sincronizarUsuarioComSessao();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!usuarioTemAcessoSuporte(user)) {
        router.replace(rotaInicialUsuario(user));
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(CAMPOS_PERFIL)
        .eq("id", user.id)
        .single<PerfilSuporte>();

      if (error || !data) {
        setUsuario(user);
        setErro(
          error?.message
            ? `Não foi possível carregar sua conta: ${error.message}`
            : "Não foi possível carregar sua conta."
        );
        setCarregando(false);
        return;
      }

      const nomeCompleto = data.nome || user.nome || "";
      const nomeSeparado = separarNome(nomeCompleto);

      setUsuario({
        ...user,
        nome: nomeCompleto || user.nome,
        email: data.email || user.email,
      });
      setPerfil(data);
      setNome(nomeSeparado.nome);
      setSobrenome(nomeSeparado.sobrenome);
      setTelefone(data.telefone || "");
      setGenero(data.genero || "Não informado");
      setNascimento(data.nascimento || "");
      setNacionalidade(data.nacionalidade || "Brasil");
      setProfissao(data.profissao || "");
      setCidade(data.cidade || "");

      try {
        const fotoResolvida = await resolverFotoPerfil(data.foto_url);
        setFotoPerfil(fotoResolvida);
        setFotoInicial(fotoResolvida);
      } catch {
        setFotoPerfil(null);
        setFotoInicial(null);
        setAviso("Os dados foram carregados, mas a foto de perfil não pôde ser exibida.");
      }

      setCarregando(false);
    }

    void carregar();
  }, [router]);

  function formatarData(data: string | null | undefined) {
    if (!data) return "Não informado";

    const valor = new Date(data);

    if (Number.isNaN(valor.getTime())) return "Não informado";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(valor);
  }

  function alterarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];

    if (!arquivo) return;

    const erroArquivo = validarArquivoFotoPerfil(arquivo);

    if (erroArquivo) {
      setErro(erroArquivo);
      e.target.value = "";
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      setFotoPerfil(leitor.result as string);
      setFotoArquivo(arquivo);
      setFotoRemovida(false);
      setErro("");
      setAviso("");
      setSalvo(false);
    };

    leitor.onerror = () => setErro("Não foi possível carregar a foto escolhida.");
    leitor.readAsDataURL(arquivo);
  }

  function removerFoto() {
    setFotoPerfil(null);
    setFotoArquivo(null);
    setFotoRemovida(true);
    setErro("");
    setAviso("");
    setSalvo(false);

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  }

  function cancelarAlteracoes() {
    if (!perfil) return;

    const nomeSeparado = separarNome(perfil.nome || usuario?.nome || "");

    setNome(nomeSeparado.nome);
    setSobrenome(nomeSeparado.sobrenome);
    setTelefone(perfil.telefone || "");
    setGenero(perfil.genero || "Não informado");
    setNascimento(perfil.nascimento || "");
    setNacionalidade(perfil.nacionalidade || "Brasil");
    setProfissao(perfil.profissao || "");
    setCidade(perfil.cidade || "");
    setFotoPerfil(fotoInicial);
    setFotoArquivo(null);
    setFotoRemovida(false);
    setErro("");
    setAviso("");
    setSalvo(false);

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  }

  async function salvarDados(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!usuario || !perfil || salvando) return;

    setErro("");
    setAviso("");
    setSalvo(false);
    setSalvando(true);

    const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`
      .replace(/\s+/g, " ")
      .trim();

    if (!nomeCompleto) {
      setSalvando(false);
      setErro("Informe seu nome antes de salvar.");
      return;
    }

    const telefoneNormalizado = telefone.trim();
    const profissaoNormalizada = profissao.trim();
    const cidadeNormalizada = cidade.trim();
    const nacionalidadeNormalizada = nacionalidade.trim();
    const generoNormalizado = genero === "Não informado" ? null : genero;

    const { data: perfilAtualizado, error } = await supabase
      .from("profiles")
      .update({
        nome: nomeCompleto,
        telefone: telefoneNormalizado || null,
        genero: generoNormalizado,
        nascimento: nascimento || null,
        nacionalidade: nacionalidadeNormalizada || null,
        profissao: profissaoNormalizada || null,
        cidade: cidadeNormalizada || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id)
      .select("id, updated_at")
      .single<{ id: string; updated_at: string | null }>();

    if (error || !perfilAtualizado) {
      setSalvando(false);
      setErro(
        error?.message
          ? `Não foi possível salvar suas alterações: ${error.message}`
          : "Não foi possível confirmar a atualização do seu perfil."
      );
      return;
    }

    setPerfil((perfilAtual) =>
      perfilAtual
        ? {
            ...perfilAtual,
            nome: nomeCompleto,
            telefone: telefoneNormalizado || null,
            genero: generoNormalizado,
            nascimento: nascimento || null,
            nacionalidade: nacionalidadeNormalizada || null,
            profissao: profissaoNormalizada || null,
            cidade: cidadeNormalizada || null,
            updated_at: perfilAtualizado.updated_at,
          }
        : perfilAtual
    );

    const usuarioSincronizado = await sincronizarUsuarioComSessao();

    if (usuarioSincronizado) {
      setUsuario(usuarioSincronizado);
    }

    try {
      const fotoAtualizada = await atualizarFotoPerfil({
        arquivo: fotoArquivo,
        remover: fotoRemovida,
      });

      if (fotoAtualizada) {
        setFotoPerfil(fotoAtualizada.foto_url);
        setFotoInicial(fotoAtualizada.foto_url);

        if (fotoAtualizada.aviso) {
          setAviso(fotoAtualizada.aviso);
        }
      } else {
        setFotoInicial(fotoPerfil);
      }

      setFotoArquivo(null);
      setFotoRemovida(false);

      if (inputFotoRef.current) {
        inputFotoRef.current.value = "";
      }
    } catch (fotoError) {
      setSalvando(false);
      setErro(
        `Seus dados foram salvos, mas a foto não foi atualizada. ${
          fotoError instanceof Error ? fotoError.message : "Tente novamente."
        }`
      );
      return;
    }

    setSalvando(false);
    setSalvo(true);

    window.setTimeout(() => {
      setSalvo(false);
    }, 3000);
  }

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (carregando || !usuario) {
    return <PageLoading pagina="minha conta" />;
  }

  const roleExibida = perfil?.role || usuario.role || "suporte";
  const statusExibido = perfil?.status || "ativo";
  const inicial = (perfil?.nome || usuario.nome || "S").charAt(0).toUpperCase();

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/suporte")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Suporte técnico
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                Minha conta
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void sair()}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Sair
          </button>
        </header>

        <section className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 p-1.5 shadow-lg sm:h-24 sm:w-24">
                  {fotoPerfil ? (
                    <Image
                      src={fotoPerfil}
                      alt="Foto de perfil"
                      width={96}
                      height={96}
                      unoptimized
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-2xl font-black text-white sm:text-3xl">
                      {inicial}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                    Perfil administrativo
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                    {perfil?.nome || usuario.nome}
                  </h2>
                  <p className="mt-2 break-all text-sm font-semibold text-[#D9DEE7]">
                    {perfil?.email || usuario.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={alterarFoto}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => inputFotoRef.current?.click()}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:brightness-95"
                >
                  Alterar foto
                </button>

                {fotoPerfil && (
                  <button
                    type="button"
                    onClick={removerFoto}
                    className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>
          </section>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAba("dados")}
              className={`rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                aba === "dados"
                  ? "bg-[#08163F] text-white shadow-lg"
                  : "bg-white text-gray-500 hover:text-[#08163F] hover:shadow-md"
              }`}
            >
              Dados básicos
            </button>

            <button
              type="button"
              onClick={() => setAba("seguranca")}
              className={`rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                aba === "seguranca"
                  ? "bg-[#08163F] text-white shadow-lg"
                  : "bg-white text-gray-500 hover:text-[#08163F] hover:shadow-md"
              }`}
            >
              Segurança
            </button>
          </div>

          {salvo && (
            <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              Alterações salvas com sucesso.
            </div>
          )}

          {aviso && (
            <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-700">
              {aviso}
            </div>
          )}

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          {aba === "dados" && (
            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
              <div className="min-w-0 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5 lg:p-6">
                <div className="mb-5">
                  <h3 className="text-xl font-black text-[#050816] sm:text-2xl">
                    Dados básicos
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                    Atualize seus dados pessoais sem alterar permissões administrativas da conta.
                  </p>
                </div>

                <form onSubmit={salvarDados} className="grid min-w-0 gap-4 md:grid-cols-2">
                  <Campo label="Nome">
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="input-ceo"
                      autoComplete="given-name"
                    />
                  </Campo>

                  <Campo label="Sobrenome">
                    <input
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      className="input-ceo"
                      autoComplete="family-name"
                    />
                  </Campo>

                  <Campo label="E-mail">
                    <input
                      value={perfil?.email || usuario.email}
                      readOnly
                      disabled
                      className="input-ceo cursor-not-allowed bg-gray-100 text-gray-500"
                    />
                  </Campo>

                  <Campo label="Telefone">
                    <input
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="input-ceo"
                      autoComplete="tel"
                    />
                  </Campo>

                  <Campo label="Gênero">
                    <select
                      value={genero}
                      onChange={(e) => setGenero(e.target.value)}
                      className="input-ceo"
                    >
                      <option>Não informado</option>
                      <option>Feminino</option>
                      <option>Masculino</option>
                      <option>Outro</option>
                    </select>
                  </Campo>

                  <Campo label="Data de nascimento">
                    <input
                      type="date"
                      value={nascimento}
                      onChange={(e) => setNascimento(e.target.value)}
                      className="input-ceo"
                    />
                  </Campo>

                  <Campo label="Nacionalidade">
                    <select
                      value={nacionalidade}
                      onChange={(e) => setNacionalidade(e.target.value)}
                      className="input-ceo"
                    >
                      <option>Brasil</option>
                      <option>Portugal</option>
                      <option>Outro</option>
                    </select>
                  </Campo>

                  <Campo label="Cidade">
                    <input
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="input-ceo"
                      autoComplete="address-level2"
                    />
                  </Campo>

                  <div className="md:col-span-2">
                    <Campo label="Profissão / função">
                      <input
                        value={profissao}
                        onChange={(e) => setProfissao(e.target.value)}
                        className="input-ceo"
                      />
                    </Campo>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2 md:col-span-2">
                    <button
                      type="submit"
                      disabled={salvando}
                      className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salvando ? "Salvando..." : "Salvar alterações"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelarAlteracoes}
                      disabled={salvando}
                      className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>

              <aside className="min-w-0 space-y-4">
                <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                    Acesso da conta
                  </p>
                  <div className="mt-4 space-y-3">
                    <ResumoConta label="Perfil" value={roleExibida} />
                    <ResumoConta label="Status" value={statusExibido} />
                    <ResumoConta
                      label="Criada em"
                      value={formatarData(perfil?.created_at)}
                    />
                    <ResumoConta
                      label="Última atualização"
                      value={formatarData(perfil?.updated_at)}
                    />
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#D9DEE7] bg-[#f9fafb] p-5">
                  <h4 className="text-base font-black text-[#08163F]">
                    Permissões protegidas
                  </h4>
                  <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                    E-mail, role, status e acessos administrativos não podem ser alterados por esta tela. Esses dados continuam centralizados na gestão de usuários e nos logs técnicos.
                  </p>
                </div>
              </aside>
            </section>
          )}

          {aba === "seguranca" && (
            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
              <div className="min-w-0 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5 lg:p-6">
                <h3 className="text-xl font-black text-[#050816] sm:text-2xl">
                  Segurança da conta
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                  As credenciais ficam separadas dos dados de perfil para evitar alterações administrativas acidentais.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#D9DEE7] bg-[#f9fafb] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                      E-mail de acesso
                    </p>
                    <p className="mt-2 break-all text-sm font-black text-[#08163F]">
                      {perfil?.email || usuario.email}
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
                      O e-mail é a identidade de acesso e não é editado por esta página.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#D9DEE7] bg-[#f9fafb] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                      Senha
                    </p>
                    <p className="mt-2 text-sm font-black text-[#08163F]">
                      Protegida pelo fluxo de recuperação
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
                      A troca de senha não é feita diretamente aqui para não contornar as regras de recuperação e auditoria do sistema.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-[#f3f5f8] p-4">
                  <p className="text-sm font-bold leading-6 text-gray-600">
                    Para trocar a senha da sua própria conta, encerre a sessão e use “Esqueci minha senha” na tela de login. A central “Reset de senha” do suporte continua destinada ao atendimento dos demais usuários.
                  </p>
                </div>
              </div>

              <aside className="min-w-0 space-y-4">
                <div className="rounded-[22px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C9CED6]">
                    Sessão atual
                  </p>
                  <h4 className="mt-2 text-xl font-black">Acesso administrativo</h4>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#D9DEE7]">
                    Perfil {roleExibida} com status {statusExibido}. O acesso à área de suporte é validado novamente pela sessão e pelo perfil salvo no Supabase.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void sair()}
                  className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Encerrar sessão
                </button>
              </aside>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ResumoConta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}
