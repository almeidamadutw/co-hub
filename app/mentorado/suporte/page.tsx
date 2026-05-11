"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type Chamado = {
  id: string;
  titulo: string;
  categoria: string;
  status: "Aberto" | "Em análise" | "Respondido";
  data: string;
};

const chamadosMock: Chamado[] = [
  {
    id: "1",
    titulo: "Dúvida sobre o módulo de Posicionamento",
    categoria: "Conteúdo",
    status: "Respondido",
    data: "29/04",
  },
  {
    id: "2",
    titulo: "Não encontrei o material da aula",
    categoria: "Material",
    status: "Em análise",
    data: "30/04",
  },
];

const perguntasFrequentes = [
  {
    pergunta: "Onde encontro os materiais das aulas?",
    resposta:
      "Dentro da tela de aula, clique em 'Arquivos disponíveis'. Se a aula possuir materiais, eles aparecerão para download.",
  },
  {
    pergunta: "Como faço os simulados?",
    resposta:
      "Acesse 'Praticar' no menu lateral. Os simulados aparecem conforme os módulos liberados pela mentora.",
  },
  {
    pergunta: "Quando minha próxima mentoria aparece?",
    resposta:
      "Assim que a equipe ou a mentora registrar um encontro, ele aparecerá na sua agenda.",
  },
  {
    pergunta: "Posso refazer um simulado?",
    resposta:
      "Sim. Durante os testes, você pode refazer. Na versão final, essa permissão poderá ser definida pela mentora.",
  },
];

export default function SuporteMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [categoria, setCategoria] = useState("Conteúdo");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [faqAberto, setFaqAberto] = useState<number | null>(0);
  const [enviado, setEnviado] = useState(false);

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
  }, [router]);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  function enviarChamado(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!assunto.trim() || !mensagem.trim()) {
      return;
    }

    setEnviado(true);
    setAssunto("");
    setMensagem("");

    setTimeout(() => {
      setEnviado(false);
    }, 3500);
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando suporte...
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
          <MenuItem label="Início" onClick={() => router.push("/mentorado/dashboard")} />
          <MenuItem label="Assistir aula" onClick={() => router.push("/mentorado/modulos")} />
          <MenuItem label="Praticar" onClick={() => router.push("/mentorado/praticar")} />
          <MenuItem label="Meu progresso" onClick={() => router.push("/mentorado/progresso")} />
          <MenuItem label="Minha agenda" onClick={() => router.push("/mentorado/agenda")} />
          <MenuItem label="Praticar" onClick={() => router.push("/mentorado/praticar")} />
          <MenuItem ativo label="Suporte" onClick={() => router.push("/mentorado/suporte")} />
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
                Central de apoio
              </p>
              <h1 className="text-xl font-black">Suporte CEO Club</h1>
            </div>
          </div>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Sair
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-6 py-10 md:px-8">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Suporte
                </p>

                <h2 className="mt-3 text-4xl font-black">
                  Como podemos te ajudar?
                </h2>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Tire dúvidas sobre aulas, materiais, simulados, encontros,
                  tarefas e uso da plataforma.
                </p>
              </div>

              <div className="rounded-[26px] bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Tempo médio de resposta
                </p>
                <p className="mt-2 text-4xl font-black">24h</p>
              </div>
            </div>
          </section>

          <section className="mb-8 grid gap-5 xl:grid-cols-4">
            <AjudaRapida
              titulo="Aulas"
              texto="Problemas com vídeos ou módulos."
              emoji="▶️"
            />
            <AjudaRapida
              titulo="Materiais"
              texto="PDFs, arquivos e downloads."
              emoji="📄"
            />
            <AjudaRapida
              titulo="Simulados"
              texto="Dúvidas sobre prática e perguntas."
              emoji="🎯"
            />
            <AjudaRapida
              titulo="Agenda"
              texto="Encontros, horários e remarcações."
              emoji="📅"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-6">
              <Card titulo="Abrir chamado">
                {enviado && (
                  <div className="mb-5 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
                    Solicitação registrada nesta tela. Para atendimento real, use o canal oficial da equipe.
                  </div>
                )}

                <form onSubmit={enviarChamado} className="space-y-4">
                  <div>
                    <label className="text-sm font-black text-gray-500">
                      Categoria
                    </label>

                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-4 font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                    >
                      <option>Conteúdo</option>
                      <option>Material</option>
                      <option>Simulado</option>
                      <option>Agenda</option>
                      <option>Problema técnico</option>
                      <option>Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-black text-gray-500">
                      Assunto
                    </label>

                    <input
                      value={assunto}
                      onChange={(e) => setAssunto(e.target.value)}
                      placeholder="Ex: Não consigo acessar o material da aula"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-4 font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-gray-500">
                      Mensagem
                    </label>

                    <textarea
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      placeholder="Descreva sua dúvida ou problema com detalhes..."
                      rows={6}
                      className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-4 font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-2xl bg-[#08163F] px-7 py-4 font-black text-white shadow-lg transition hover:brightness-110"
                  >
                    Enviar chamado →
                  </button>
                </form>
              </Card>

              <Card titulo="Perguntas frequentes">
                <div className="space-y-3">
                  {perguntasFrequentes.map((item, index) => {
                    const aberto = faqAberto === index;

                    return (
                      <button
                        key={item.pergunta}
                        onClick={() => setFaqAberto(aberto ? null : index)}
                        className="w-full rounded-2xl bg-[#f9fafb] p-5 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-black text-[#08163F]">
                            {item.pergunta}
                          </p>

                          <span className="text-xl font-black">
                            {aberto ? "−" : "+"}
                          </span>
                        </div>

                        {aberto && (
                          <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-500">
                            {item.resposta}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            <aside className="space-y-6">
              <Card titulo="Meus chamados">
                <div className="space-y-4">
                  {chamadosMock.map((chamado) => (
                    <div
                      key={chamado.id}
                      className="rounded-2xl bg-[#f9fafb] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#08163F]">
                            {chamado.titulo}
                          </p>

                          <p className="mt-1 text-sm font-bold text-gray-500">
                            {chamado.categoria} · {chamado.data}
                          </p>
                        </div>

                        <StatusBadge status={chamado.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card titulo="Canais rápidos">
                <div className="space-y-3">
                  <Canal
                    titulo="WhatsApp da equipe"
                    texto="Atendimento rápido em horário comercial."
                    botao="Abrir WhatsApp"
                  />
                  <Canal
                    titulo="Dúvida para a mentora"
                    texto="Envie uma pergunta para ser tratada na próxima sessão."
                    botao="Enviar dúvida"
                  />
                  <Canal
                    titulo="Problema urgente"
                    texto="Use quando algo impedir seu acesso à plataforma."
                    botao="Reportar"
                  />
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </section>
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

function AjudaRapida({
  titulo,
  texto,
  emoji,
}: {
  titulo: string;
  texto: string;
  emoji: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF] text-3xl">
        {emoji}
      </div>

      <h3 className="text-xl font-black text-[#08163F]">{titulo}</h3>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>
    </div>
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

      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Chamado["status"] }) {
  const classes = {
    Aberto: "bg-blue-100 text-blue-700",
    "Em análise": "bg-yellow-100 text-yellow-700",
    Respondido: "bg-green-100 text-green-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}

function Canal({
  titulo,
  texto,
  botao,
}: {
  titulo: string;
  texto: string;
  botao: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <h4 className="font-black text-[#08163F]">{titulo}</h4>

      <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      <button className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] shadow-sm transition hover:shadow-md">
        {botao} →
      </button>
    </div>
  );
}