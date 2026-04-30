"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

export default function ContaMentoradoPage() {
  const router = useRouter();

  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [aba, setAba] = useState<"dados" | "seguranca">("dados");
  const [salvo, setSalvo] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("(15) 99999-0000");
  const [genero, setGenero] = useState("Não informado");
  const [nascimento, setNascimento] = useState("");
  const [nacionalidade, setNacionalidade] = useState("Brasil");
  const [profissao, setProfissao] = useState("Empreendedor(a)");
  const [cidade, setCidade] = useState("Sorocaba");

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentor") {
      router.replace("/dashboard");
      return;
    }

    if (user.role !== "mentorado") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);

    const fotoSalva = localStorage.getItem("ceoclub_foto_perfil");

    if (fotoSalva) {
      setFotoPerfil(fotoSalva);
    }

    const partesNome = user.nome.split(" ");
    setNome(partesNome[0] ?? "");
    setSobrenome(partesNome.slice(1).join(" ") || "Teste");
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
      localStorage.setItem("ceoclub_foto_perfil", resultado);
    };

    leitor.readAsDataURL(arquivo);
  }

  function removerFoto() {
    setFotoPerfil(null);
    localStorage.removeItem("ceoclub_foto_perfil");

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  }

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  function salvarDados(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSalvo(true);

    setTimeout(() => {
      setSalvo(false);
    }, 3000);
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando minha conta...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <aside className="hidden min-h-screen w-[310px] flex-col border-r border-black/5 bg-white p-5 shadow-[10px_0_40px_rgba(15,23,42,0.04)] lg:flex">
        <div className="mb-8 flex items-center gap-3 rounded-[24px] bg-[#f8fafc] p-3">
          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#08163F] p-1">
            <img
              src="/images/logo.jpeg"
              alt="CEO Club"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
              Curso
            </p>
            <h1 className="text-lg font-black text-[#08163F]">CEO Club</h1>
          </div>
        </div>

        <nav className="space-y-2">
          <MenuItem
            label="Início"
            onClick={() => router.push("/mentorado/dashboard")}
          />

          <MenuItem
            label="Minha agenda"
            onClick={() => router.push("/mentorado/agenda")}
          />

          <MenuItem
            label="Meus módulos"
            onClick={() => router.push("/mentorado/modulos")}
          />

          <MenuItem
            label="Praticar"
            onClick={() => router.push("/mentorado/praticar")}
          />

          <MenuItem
            label="Meu progresso"
            onClick={() => router.push("/mentorado/progresso")}
          />

          <MenuItem
            label="Financeiro"
            onClick={() => router.push("/mentorado/financeiro")}
          />

          <MenuItem
            ativo
            label="Minha conta"
            onClick={() => router.push("/mentorado/conta")}
          />
        </nav>

        <div className="mt-auto rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9CED6]">
            Mentorado
          </p>
          <p className="mt-2 font-black">{usuario.nome}</p>

          <button
            onClick={sair}
            className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] transition hover:brightness-95"
          >
            Sair
          </button>
        </div>
      </aside>

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-6 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
            >
              ← Voltar
            </button>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Área do mentorado
              </p>
              <h1 className="text-xl font-black">Minha conta</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Suporte
            </button>

            <button
              onClick={sair}
              className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-6 py-10 md:px-8">
          <section className="mx-auto max-w-6xl">
            <div className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 p-2 shadow-lg">
                    {fotoPerfil ? (
                      <img
                        src={fotoPerfil}
                        alt="Foto de perfil"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-3xl font-black text-white">
                        {usuario.nome.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                      Perfil do mentorado
                    </p>

                    <h2 className="mt-2 text-4xl font-black">{usuario.nome}</h2>

                    <p className="mt-2 text-[#D9DEE7]">{usuario.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
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
                    className="rounded-2xl bg-white px-6 py-4 font-black text-[#08163F] shadow-lg transition hover:brightness-95"
                  >
                    Alterar foto
                  </button>

                  {fotoPerfil && (
                    <button
                      type="button"
                      onClick={removerFoto}
                      className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-black text-white transition hover:bg-white/15"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => setAba("dados")}
                className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                  aba === "dados"
                    ? "bg-[#08163F] text-white shadow-lg"
                    : "bg-white text-gray-500 hover:text-[#08163F] hover:shadow-md"
                }`}
              >
                Dados básicos
              </button>

              <button
                onClick={() => setAba("seguranca")}
                className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                  aba === "seguranca"
                    ? "bg-[#08163F] text-white shadow-lg"
                    : "bg-white text-gray-500 hover:text-[#08163F] hover:shadow-md"
                }`}
              >
                Segurança
              </button>
            </div>

            {aba === "dados" && (
              <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="rounded-[32px] bg-white p-7 shadow-lg">
                  <div className="mb-7">
                    <h3 className="text-2xl font-black text-[#050816]">
                      Dados básicos
                    </h3>

                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      Mantenha suas informações atualizadas para a equipe da
                      mentoria.
                    </p>
                  </div>

                  {salvo && (
                    <div className="mb-5 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
                      Alterações salvas com sucesso.
                    </div>
                  )}

                  <form
                    onSubmit={salvarDados}
                    className="grid gap-5 md:grid-cols-2"
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
                        value={nascimento}
                        onChange={(e) => setNascimento(e.target.value)}
                        placeholder="dd/mm/aaaa"
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

                    <div className="flex flex-wrap gap-4 pt-2 md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-2xl bg-[#08163F] px-7 py-4 font-black text-white shadow-lg transition hover:brightness-110"
                      >
                        Salvar alterações
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/mentorado/dashboard")}
                        className="rounded-2xl bg-[#f3f5f8] px-7 py-4 font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>

                <aside className="space-y-6">
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
              <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="rounded-[32px] bg-white p-7 shadow-lg">
                  <div className="mb-7">
                    <h3 className="text-2xl font-black text-[#050816]">
                      Segurança
                    </h3>

                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      Altere sua senha e revise opções de acesso.
                    </p>
                  </div>

                  <form className="grid gap-5">
                    <Campo label="Senha atual">
                      <input
                        type="password"
                        placeholder="Digite sua senha atual"
                        className="input-ceo"
                      />
                    </Campo>

                    <Campo label="Nova senha">
                      <input
                        type="password"
                        placeholder="Digite a nova senha"
                        className="input-ceo"
                      />
                    </Campo>

                    <Campo label="Confirmar nova senha">
                      <input
                        type="password"
                        placeholder="Confirme a nova senha"
                        className="input-ceo"
                      />
                    </Campo>

                    <button
                      type="button"
                      className="w-fit rounded-2xl bg-[#08163F] px-7 py-4 font-black text-white shadow-lg transition hover:brightness-110"
                    >
                      Atualizar senha
                    </button>
                  </form>
                </div>

                <aside className="space-y-6">
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
          padding: 1rem;
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

function MenuItem({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
        ativo
          ? "bg-[#EEF2FF] text-[#08163F]"
          : "text-gray-500 hover:bg-[#f8fafc] hover:text-[#08163F]"
      }`}
    >
      <span>{label}</span>
      <span>→</span>
    </button>
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
    <label>
      <span className="text-sm font-black text-gray-500">{label}</span>
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
    <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
        <h3 className="text-2xl font-black text-[#050816]">{titulo}</h3>
      </div>

      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-black text-[#08163F]">{value}</p>
    </div>
  );
}