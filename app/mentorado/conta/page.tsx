"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";

type PerfilMentorado = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string | null;
  telefone: string | null;
  genero: string | null;
  nascimento: string | null;
  nacionalidade: string | null;
  profissao: string | null;
  cidade: string | null;
  foto_url: string | null;
};

export default function ContaMentoradoPage() {
  const router = useRouter();

  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [aba, setAba] = useState<"dados" | "seguranca">("dados");
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [genero, setGenero] = useState("Não informado");
  const [nascimento, setNascimento] = useState("");
  const [nacionalidade, setNacionalidade] = useState("Brasil");
  const [profissao, setProfissao] = useState("");
  const [cidade, setCidade] = useState("");

  useEffect(() => {
    async function carregarConta() {
      const user = getUsuarioLogado();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role === "mentor") {
        router.replace("/mentor/dashboard");
        return;
      }

      if (user.role !== "mentorado") {
        logoutUsuario();
        router.replace("/login");
        return;
      }

      setUsuario(user);

      const { data: perfil, error } = await supabase
        .from("profiles")
        .select(
          "id, nome, email, role, telefone, genero, nascimento, nacionalidade, profissao, cidade, foto_url"
        )
        .eq("id", user.id)
        .single<PerfilMentorado>();

      if (error || !perfil) {
        console.error(error);
        setErro("Não foi possível carregar seus dados. Tente novamente.");
        setCarregando(false);
        return;
      }

      const nomeCompleto = perfil.nome || user.nome || "";
      const partesNome = nomeCompleto.trim().split(" ").filter(Boolean);

      setNome(partesNome[0] ?? "");
      setSobrenome(partesNome.slice(1).join(" ") || "");
      setTelefone(perfil.telefone || "");
      setGenero(perfil.genero || "Não informado");
      setNascimento(perfil.nascimento || "");
      setNacionalidade(perfil.nacionalidade || "Brasil");
      setProfissao(perfil.profissao || "");
      setCidade(perfil.cidade || "");
      setFotoPerfil(perfil.foto_url || null);

      const usuarioAtualizado: User = {
        ...user,
        nome: nomeCompleto || user.nome,
        email: perfil.email || user.email,
        role: user.role,
      };

      localStorage.setItem("ceoclub_user", JSON.stringify(usuarioAtualizado));
      setUsuario(usuarioAtualizado);
      setCarregando(false);
    }

    carregarConta();
  }, [router]);

  function alterarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      const resultado = leitor.result as string;
      setFotoPerfil(resultado);
    };

    leitor.readAsDataURL(arquivo);
  }

  function removerFoto() {
    setFotoPerfil(null);

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  }

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  async function salvarDados(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!usuario) return;

    setErro("");
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

    const { error } = await supabase
      .from("profiles")
      .update({
        nome: nomeCompleto,
        telefone: telefone.trim(),
        genero,
        nascimento: nascimento || null,
        nacionalidade,
        profissao: profissao.trim(),
        cidade: cidade.trim(),
        foto_url: fotoPerfil,
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id);

    setSalvando(false);

    if (error) {
      console.error(error);
      setErro(
        "Não foi possível salvar suas alterações. Verifique se os campos existem no Supabase."
      );
      return;
    }

    const usuarioAtualizado: User = {
      ...usuario,
      nome: nomeCompleto,
    };

    localStorage.setItem("ceoclub_user", JSON.stringify(usuarioAtualizado));
    setUsuario(usuarioAtualizado);

    setSalvo(true);

    setTimeout(() => {
      setSalvo(false);
    }, 3000);
  }

  if (carregando || !usuario) {
    return <MentoradoLoading mensagem="Carregando minha conta..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Área do mentorado
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                Minha conta
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:text-sm"
            >
              Suporte
            </button>

            <button
              onClick={sair}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mx-auto w-full max-w-[1280px]">
            <div className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
              <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                        {usuario.nome.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                      Perfil do mentorado
                    </p>

                    <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                      {usuario.nome}
                    </h2>

                    <p className="mt-2 break-all text-sm font-semibold text-[#D9DEE7]">
                      {usuario.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/*"
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
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
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

            {aba === "dados" && (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
                <div className="min-w-0 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5 lg:p-6">
                  <div className="mb-5">
                    <h3 className="break-words text-xl font-black text-[#050816] sm:text-2xl">
                      Dados básicos
                    </h3>

                    <p className="mt-2 break-words text-sm font-semibold leading-6 text-gray-500">
                      Mantenha suas informações atualizadas para a equipe da
                      mentoria.
                    </p>
                  </div>

                  {salvo && (
                    <div className="mb-5 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
                      Alterações salvas com sucesso.
                    </div>
                  )}

                  {erro && (
                    <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                      {erro}
                    </div>
                  )}

                  <form
                    onSubmit={salvarDados}
                    className="grid min-w-0 gap-4 md:grid-cols-2"
                  >
                    <Campo label="Nome">
                      <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="input-ceo"
                      />
                    </Campo>

                    <Campo label="Sobrenome">
                      <input
                        value={sobrenome}
                        onChange={(e) => setSobrenome(e.target.value)}
                        className="input-ceo"
                      />
                    </Campo>

                    <Campo label="E-mail">
                      <input
                        value={usuario.email}
                        disabled
                        className="input-ceo cursor-not-allowed opacity-70"
                      />
                    </Campo>

                    <Campo label="Telefone">
                      <input
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="input-ceo"
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
                        <option>Prefiro não informar</option>
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
                      />
                    </Campo>

                    <Campo label="Profissão">
                      <input
                        value={profissao}
                        onChange={(e) => setProfissao(e.target.value)}
                        className="input-ceo"
                      />
                    </Campo>

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
                        onClick={() => router.push("/mentorado/dashboard")}
                        className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>

                <aside className="min-w-0 space-y-4">
                  <Card titulo="Resumo da conta">
                    <Info label="Perfil" value="Mentorado" />
                    <Info label="Plano" value="CEO Club Mentoria" />
                    <Info label="Status" value="Ativo" />
                  </Card>

                  <Card titulo="Privacidade">
                    <p className="text-sm font-semibold leading-relaxed text-gray-500">
                      Seus dados aparecem apenas para a equipe responsável pela
                      mentoria e para controle da sua jornada dentro da
                      plataforma.
                    </p>
                  </Card>
                </aside>
              </section>
            )}

            {aba === "seguranca" && (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
                <div className="min-w-0 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5 lg:p-6">
                  <div className="mb-5">
                    <h3 className="break-words text-xl font-black text-[#050816] sm:text-2xl">
                      Segurança
                    </h3>

                    <p className="mt-2 break-words text-sm font-semibold leading-6 text-gray-500">
                      Para alterar sua senha novamente, solicite suporte da
                      equipe responsável pelo acesso.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#D9DEE7] bg-[#f9fafb] p-4">
                    <p className="text-sm font-bold leading-6 text-gray-600">
                      A primeira redefinição de senha pode ser feita pela tela
                      de recuperação. Novas alterações passam por análise do
                      suporte/T.I para proteger seu acesso.
                    </p>

                    <button
                      type="button"
                      onClick={() => router.push("/mentorado/suporte")}
                      className="mt-4 w-fit rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                    >
                      Solicitar alteração de senha
                    </button>
                  </div>
                </div>

                <aside className="min-w-0 space-y-4">
                  <Card titulo="Status de segurança">
                    <Info label="Senha" value="Configurada" />
                    <Info label="Último acesso" value="Hoje" />
                    <Info label="Sessão" value="Ativa" />
                  </Card>

                  <Card titulo="Dica">
                    <p className="text-sm font-semibold leading-relaxed text-gray-500">
                      Use uma senha forte e evite compartilhar seu acesso com
                      outras pessoas.
                    </p>
                  </Card>
                </aside>
              </section>
            )}
          </section>
        </div>
      </section>

      <style jsx global>{`
        .input-ceo {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 0.75rem 0.9rem;
          font-weight: 700;
          color: #08163f;
          outline: none;
          transition: 0.2s ease;
        }

        .input-ceo::placeholder {
          color: #9ca3af;
        }

        .input-ceo:focus {
          border-color: #12317c;
          box-shadow: 0 0 0 4px rgba(18, 49, 124, 0.1);
          background: white;
        }
      `}</style>
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
    <label className="min-w-0">
      <span className="break-words text-sm font-black text-gray-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
        <h3 className="break-words text-xl font-black text-[#050816] sm:text-2xl">
          {titulo}
        </h3>
      </div>

      <div className="min-w-0 space-y-3 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words font-black text-[#08163F]">{value}</p>
    </div>
  );
}
