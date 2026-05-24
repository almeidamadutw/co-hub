"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";

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
    return <MentoradoLoading mensagem="Carregando suporte..." />;
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
                Central de apoio
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">Suporte CEO Club</h1>
            </div>
          </div>

          <button
            onClick={sair}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Sair
          </button>
        </header>

        <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Suporte
                </p>

                <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                  Como podemos te ajudar?
                </h2>

                <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Tire dúvidas sobre aulas, materiais, simulados, encontros,
                  tarefas e uso da plataforma.
                </p>
              </div>

              <div className="rounded-[20px] bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Tempo médio de resposta
                </p>
                <p className="mt-2 text-2xl font-black sm:text-3xl">24h</p>
              </div>
            </div>
          </section>

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
            <div className="min-w-0 space-y-4">
              <Card titulo="Abrir chamado">
                {enviado && (
                  <div className="mb-5 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
                    Solicitação registrada nesta tela. Para atendimento real, use o canal oficial da equipe.
                  </div>
                )}

                <form onSubmit={enviarChamado} className="space-y-3">
                  <div>
                    <label className="text-sm font-black text-gray-500">
                      Categoria
                    </label>

                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
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
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
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
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
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
                        className="w-full min-w-0 rounded-2xl bg-[#f9fafb] p-4 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-4">
                          <p className="break-words font-black text-[#08163F]">
                            {item.pergunta}
                          </p>

                          <span className="text-xl font-black">
                            {aberto ? "−" : "+"}
                          </span>
                        </div>

                        {aberto && (
                          <p className="mt-3 break-words text-sm font-semibold leading-relaxed text-gray-500">
                            {item.resposta}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            <aside className="min-w-0 space-y-4">
              <Card titulo="Meus chamados">
                <div className="space-y-3">
                  {chamadosMock.map((chamado) => (
                    <div
                      key={chamado.id}
                      className="min-w-0 rounded-2xl bg-[#f9fafb] p-4"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div>
                          <p className="break-words font-black text-[#08163F]">
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
    <div className="min-w-0 rounded-[20px] bg-white p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-xl sm:p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF] text-2xl sm:h-12 sm:w-12">
        {emoji}
      </div>

      <h3 className="break-words text-lg font-black text-[#08163F]">{titulo}</h3>
      <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-gray-500">
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
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
        <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">{titulo}</h3>
      </div>

      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status: Chamado["status"] }) {
  const classes = {
    Aberto: "bg-blue-100 text-blue-700",
    "Em análise": "bg-yellow-100 text-yellow-700",
    Respondido: "bg-green-100 text-green-700",
  };

  return (
    <span className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
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
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <h4 className="break-words font-black text-[#08163F]">{titulo}</h4>

      <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      <button className="mt-4 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[#08163F] shadow-sm transition hover:shadow-md">
        {botao} →
      </button>
    </div>
  );
}