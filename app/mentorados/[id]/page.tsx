"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type StatusMentorado = "Ativo" | "Pendente" | "Inativo";
type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";
type TipoAgenda = "Mentoria" | "Módulo" | "Reunião";
type StatusAgenda = "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";

type Mentorado = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  codigo_inscricao: string | null;
  status: StatusMentorado | null;
  role: string;
  created_at: string;
  updated_at: string | null;
};

type Cobranca = {
  id: string;
  mentorado_id: string;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: StatusCobranca;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

type EventoAgenda = {
  id: string;
  mentorado_id: string;
  titulo: string | null;
  tipo: TipoAgenda;
  data: string;
  horario: string;
  status: StatusAgenda;
  observacao: string | null;
  created_at: string;
};

type ModuloMentoria = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string | null;
};

type AulaMentoria = {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  duracao: string | null;
  video_url: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string | null;
};

type ProgressoAula = {
  id: string;
  mentorado_id: string;
  aula_id: string;
  concluida: boolean;
  concluida_em: string | null;
  created_at: string;
  updated_at: string | null;
};

type ModuloComProgresso = ModuloMentoria & {
  aulas: AulaMentoria[];
  totalAulasModulo: number;
  aulasConcluidasModulo: number;
  percentual: number;
  statusProgresso: string;
};

export default function PerfilMentoradoPage() {
  const router = useRouter();
  const params = useParams();

  const mentoradoId = String(params.id);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorado, setMentorado] = useState<Mentorado | null>(null);

  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);

  const [modulos, setModulos] = useState<ModuloMentoria[]>([]);
  const [aulas, setAulas] = useState<AulaMentoria[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<ProgressoAula[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (user.role !== "mentor" && user.role !== "financeiro") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
    carregarPerfil();
  }, [router, mentoradoId]);

  async function carregarPerfil() {
    try {
      setCarregando(true);
      setErro("");

      const { data: mentoradoData, error: mentoradoError } = await supabase
        .from("profiles")
        .select(
          "id, nome, email, telefone, codigo_inscricao, status, role, created_at, updated_at"
        )
        .eq("id", mentoradoId)
        .eq("role", "mentorado")
        .single();

      if (mentoradoError) {
        throw new Error(mentoradoError.message);
      }

      setMentorado(mentoradoData as Mentorado);

      const { data: cobrancasData, error: cobrancasError } = await supabase
        .from("financeiro_cobrancas")
        .select(
          "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, created_at, updated_at"
        )
        .eq("mentorado_id", mentoradoId)
        .order("data_vencimento", { ascending: true });

      if (cobrancasError) {
        throw new Error(cobrancasError.message);
      }

      setCobrancas((cobrancasData ?? []) as Cobranca[]);

      const { data: eventosData, error: eventosError } = await supabase
        .from("agenda_eventos")
        .select(
          "id, mentorado_id, titulo, tipo, data, horario, status, observacao, created_at"
        )
        .eq("mentorado_id", mentoradoId)
        .order("data", { ascending: true })
        .order("horario", { ascending: true });

      if (eventosError) {
        throw new Error(eventosError.message);
      }

      setEventos((eventosData ?? []) as EventoAgenda[]);

      const { data: modulosData, error: modulosError } = await supabase
        .from("modulos")
        .select("id, titulo, descricao, ordem, ativo, created_at, updated_at")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (modulosError) {
        throw new Error(modulosError.message);
      }

      setModulos((modulosData ?? []) as ModuloMentoria[]);

      const { data: aulasData, error: aulasError } = await supabase
        .from("aulas")
        .select(
          "id, modulo_id, titulo, descricao, objetivo, duracao, video_url, ordem, ativo, created_at, updated_at"
        )
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (aulasError) {
        throw new Error(aulasError.message);
      }

      setAulas((aulasData ?? []) as AulaMentoria[]);

      const { data: progressoData, error: progressoError } = await supabase
        .from("progresso_aulas")
        .select(
          "id, mentorado_id, aula_id, concluida, concluida_em, created_at, updated_at"
        )
        .eq("mentorado_id", mentoradoId);

      if (progressoError) {
        throw new Error(progressoError.message);
      }

      setProgressoAulas((progressoData ?? []) as ProgressoAula[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o perfil do mentorado."
      );
    } finally {
      setCarregando(false);
    }
  }

  const resumoFinanceiro = useMemo(() => {
    const total = cobrancas.reduce(
      (acc, item) => acc + Number(item.valor_parcela || 0),
      0
    );

    const pago = cobrancas
      .filter((item) => item.status === "Pago")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const pendente = cobrancas
      .filter((item) => item.status === "Pendente")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const atrasado = cobrancas
      .filter((item) => item.status === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const proximaCobranca = cobrancas
      .filter((item) => item.status !== "Pago" && item.status !== "Cancelado")
      .sort(
        (a, b) =>
          new Date(a.data_vencimento).getTime() -
          new Date(b.data_vencimento).getTime()
      )[0];

    return {
      total,
      pago,
      pendente,
      atrasado,
      quantidade: cobrancas.length,
      proximaCobranca,
    };
  }, [cobrancas]);

  const proximosEventos = useMemo<EventoAgenda[]>(() => {
    const agora = new Date();

    return eventos
      .filter((evento) => {
        const dataEvento = new Date(
          `${evento.data}T${limparHorario(evento.horario)}:00`
        );

        return dataEvento.getTime() >= agora.getTime();
      })
      .sort((a, b) => {
        const dataA = new Date(
          `${a.data}T${limparHorario(a.horario)}:00`
        ).getTime();

        const dataB = new Date(
          `${b.data}T${limparHorario(b.horario)}:00`
        ).getTime();

        return dataA - dataB;
      })
      .slice(0, 5);
  }, [eventos]);

  const resumoProgresso = useMemo(() => {
    const aulasAtivas = aulas.filter((aula) => aula.ativo);
    const idsAulasAtivas = aulasAtivas.map((aula) => aula.id);

    const aulasConcluidas = progressoAulas.filter(
      (item) => item.concluida && idsAulasAtivas.includes(item.aula_id)
    );

    const totalAulas = aulasAtivas.length;
    const totalConcluidas = aulasConcluidas.length;

    const percentual =
      totalAulas === 0 ? 0 : Math.round((totalConcluidas / totalAulas) * 100);

    const modulosComProgresso: ModuloComProgresso[] = modulos.map((modulo) => {
      const aulasDoModulo = aulasAtivas.filter(
        (aula) => aula.modulo_id === modulo.id
      );

      const concluidasDoModulo = aulasDoModulo.filter((aula) =>
        aulasConcluidas.some((item) => item.aula_id === aula.id)
      ).length;

      const percentualModulo =
        aulasDoModulo.length === 0
          ? 0
          : Math.round((concluidasDoModulo / aulasDoModulo.length) * 100);

      const statusProgresso =
        aulasDoModulo.length === 0
          ? "Sem aulas"
          : percentualModulo === 100
          ? "Concluído"
          : percentualModulo > 0
          ? "Em andamento"
          : "Não iniciado";

      return {
        ...modulo,
        aulas: aulasDoModulo,
        totalAulasModulo: aulasDoModulo.length,
        aulasConcluidasModulo: concluidasDoModulo,
        percentual: percentualModulo,
        statusProgresso,
      };
    });

    const modulosConcluidos = modulosComProgresso.filter(
      (modulo) => modulo.percentual === 100 && modulo.totalAulasModulo > 0
    ).length;

    const modulosEmAndamento = modulosComProgresso.filter(
      (modulo) => modulo.percentual > 0 && modulo.percentual < 100
    ).length;

    return {
      totalAulas,
      totalConcluidas,
      percentual,
      modulosComProgresso,
      modulosConcluidos,
      modulosEmAndamento,
    };
  }, [aulas, modulos, progressoAulas]);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando perfil do mentorado...
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-lg rounded-[30px] bg-white p-8 text-center shadow-lg">
            <h1 className="text-3xl font-black">Erro ao carregar perfil</h1>

            <p className="mt-3 text-gray-500">{erro}</p>

            <button
              onClick={() => router.push("/mentorados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-6 py-3 font-bold text-white"
            >
              Voltar para mentorados
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!mentorado) {
    return (
      <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-lg rounded-[30px] bg-white p-8 text-center shadow-lg">
            <h1 className="text-3xl font-black">Mentorado não encontrado</h1>

            <p className="mt-3 text-gray-500">
              Esse perfil não foi encontrado no sistema.
            </p>

            <button
              onClick={() => router.push("/mentorados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-6 py-3 font-bold text-white"
            >
              Voltar para mentorados
            </button>
          </div>
        </section>
      </main>
    );
  }

  const status = mentorado.status ?? "Ativo";

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/mentorados")}
              className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
            >
              ← Voltar
            </button>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Perfil do mentorado
              </p>

              <h1 className="text-xl font-black">{mentorado.nome}</h1>
            </div>
          </div>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Sair
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-lg">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-3xl font-black uppercase text-white">
                    {mentorado.nome?.charAt(0) ?? "M"}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                    Código de inscrição
                  </p>

                  <h2 className="mt-2 text-4xl font-black">
                    {mentorado.nome}
                  </h2>

                  <p className="mt-2 text-[#D9DEE7]">
                    Código:{" "}
                    <span className="font-bold text-white">
                      {mentorado.codigo_inscricao ?? "—"}
                    </span>
                  </p>
                </div>
              </div>

              <StatusBadge status={status} />
            </div>
          </section>

          <section className="mb-7 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Status" valor={status} destaque />

            <KPI titulo="Código" valor={mentorado.codigo_inscricao ?? "—"} />

            <KPI titulo="Cadastro" valor={formatarData(mentorado.created_at)} />

            <KPI
              titulo="Progresso"
              valor={`${resumoProgresso.percentual}%`}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card titulo="Dados do mentorado">
              <Info label="Nome" value={mentorado.nome} />
              <Info label="E-mail" value={mentorado.email} />
              <Info
                label="Telefone"
                value={mentorado.telefone || "Telefone não informado"}
              />
              <Info
                label="Código de inscrição"
                value={mentorado.codigo_inscricao || "Código não gerado"}
              />
              <Info label="Status" value={status} />
            </Card>

            <Card titulo="Financeiro">
              <div className="grid gap-4 md:grid-cols-2">
                <MiniBox
                  label="Total lançado"
                  value={formatarMoeda(resumoFinanceiro.total)}
                  destaque
                />

                <MiniBox
                  label="Pago"
                  value={formatarMoeda(resumoFinanceiro.pago)}
                />

                <MiniBox
                  label="Pendente"
                  value={formatarMoeda(resumoFinanceiro.pendente)}
                />

                <MiniBox
                  label="Atrasado"
                  value={formatarMoeda(resumoFinanceiro.atrasado)}
                  alerta={resumoFinanceiro.atrasado > 0}
                />
              </div>

              <div className="mt-5 rounded-2xl bg-[#f9fafb] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  Próxima cobrança
                </p>

                {resumoFinanceiro.proximaCobranca ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-[#08163F]">
                        {resumoFinanceiro.proximaCobranca.titulo}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        Parcela{" "}
                        {resumoFinanceiro.proximaCobranca.parcela_atual}/
                        {resumoFinanceiro.proximaCobranca.quantidade_parcelas} ·{" "}
                        {formatarData(
                          resumoFinanceiro.proximaCobranca.data_vencimento
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      status={resumoFinanceiro.proximaCobranca.status}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-gray-500">
                    Nenhuma cobrança em aberto.
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3">
                {cobrancas.slice(0, 5).map((cobranca) => (
                  <div
                    key={cobranca.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                  >
                    <div>
                      <p className="font-black text-[#08163F]">
                        {cobranca.titulo}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Parcela {cobranca.parcela_atual}/
                        {cobranca.quantidade_parcelas} ·{" "}
                        {formatarData(cobranca.data_vencimento)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-[#08163F]">
                        {formatarMoeda(Number(cobranca.valor_parcela))}
                      </p>

                      <div className="mt-1">
                        <StatusBadge status={cobranca.status} />
                      </div>
                    </div>
                  </div>
                ))}

                {cobrancas.length === 0 && (
                  <div className="rounded-2xl bg-[#f9fafb] p-5 text-sm font-semibold text-gray-500">
                    Nenhuma cobrança cadastrada para este mentorado.
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push("/financeiro")}
                className="mt-5 w-full rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-110"
              >
                Abrir financeiro geral →
              </button>
            </Card>

            <Card titulo="Próximos compromissos">
              <div className="space-y-3">
                {proximosEventos.length === 0 ? (
                  <div className="rounded-2xl bg-[#f9fafb] p-5 text-sm font-semibold text-gray-500">
                    Nenhum compromisso futuro cadastrado para este mentorado.
                  </div>
                ) : (
                  proximosEventos.map((evento) => (
                    <div
                      key={evento.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f9fafb] p-5"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                          {formatarData(evento.data)} ·{" "}
                          {limparHorario(evento.horario)}
                        </p>

                        <p className="mt-2 font-black text-[#08163F]">
                          {evento.titulo || evento.tipo}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          {evento.tipo}
                        </p>
                      </div>

                      <StatusBadge status={evento.status} />
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ActionButton
                  label="Agendar sessão"
                  onClick={() => router.push("/agenda")}
                />

                <ActionButton
                  label="Abrir agenda"
                  onClick={() => router.push("/agenda")}
                />

                <ActionButton
                  label="Ver simulados"
                  onClick={() => router.push("/simulados")}
                />

                <ActionButton
                  label="Financeiro"
                  onClick={() => router.push("/financeiro")}
                />
              </div>
            </Card>

            <Card titulo="Progresso">
              <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                  Evolução individual
                </p>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <strong className="block text-5xl font-black">
                      {resumoProgresso.percentual}%
                    </strong>

                    <p className="mt-2 text-sm font-bold text-blue-100">
                      {resumoProgresso.totalConcluidas}/
                      {resumoProgresso.totalAulas} aulas concluídas
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                      Módulos concluídos
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {resumoProgresso.modulosConcluidos}
                    </p>
                  </div>
                </div>

                <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${resumoProgresso.percentual}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <MiniBox
                  label="Em andamento"
                  value={String(resumoProgresso.modulosEmAndamento)}
                />

                <MiniBox
                  label="Aulas concluídas"
                  value={`${resumoProgresso.totalConcluidas}/${resumoProgresso.totalAulas}`}
                />
              </div>

              <div className="space-y-3">
                {resumoProgresso.modulosComProgresso.slice(0, 4).map((modulo) => (
                  <div
                    key={modulo.id}
                    className="rounded-2xl bg-[#f9fafb] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                          Módulo {modulo.ordem}
                        </p>

                        <h4 className="mt-1 font-black text-[#08163F]">
                          {modulo.titulo}
                        </h4>

                        <p className="mt-1 text-xs font-bold text-gray-400">
                          {modulo.aulasConcluidasModulo}/
                          {modulo.totalAulasModulo} aulas
                        </p>
                      </div>

                      <StatusBadge status={modulo.statusProgresso} />
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C]"
                        style={{ width: `${modulo.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}

                {resumoProgresso.modulosComProgresso.length === 0 && (
                  <div className="rounded-2xl bg-[#f9fafb] p-5 text-sm font-semibold text-gray-500">
                    Nenhum módulo disponível para calcular o progresso.
                  </div>
                )}
              </div>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function KPI({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-4 text-3xl font-black">{valor}</p>
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

function MiniBox({
  label,
  value,
  destaque,
  alerta,
}: {
  label: string;
  value: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        destaque
          ? "bg-[#08163F] text-white"
          : alerta
          ? "bg-red-50 text-red-700"
          : "bg-[#f9fafb] text-[#08163F]"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.18em] ${
          destaque ? "text-blue-100" : alerta ? "text-red-600" : "text-gray-400"
        }`}
      >
        {label}
      </p>

      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase();

  const classe =
    statusLower === "ativo" ||
    statusLower === "pago" ||
    statusLower === "confirmada" ||
    statusLower === "concluído" ||
    statusLower === "concluido"
      ? "bg-emerald-50 text-emerald-700"
      : statusLower === "pendente" ||
        statusLower === "aguardando" ||
        statusLower === "em andamento"
      ? "bg-amber-50 text-amber-700"
      : statusLower === "inativo" ||
        statusLower === "cancelado" ||
        statusLower === "cancelada" ||
        statusLower === "não iniciado" ||
        statusLower === "nao iniciado"
      ? "bg-slate-100 text-slate-600"
      : statusLower === "atrasado"
      ? "bg-red-50 text-red-700"
      : statusLower === "concluída" || statusLower === "concluida"
      ? "bg-blue-50 text-blue-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`rounded-full px-4 py-2 text-xs font-black ${classe}`}>
      {status}
    </span>
  );
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-[#f9fafb] p-5 text-left font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
    >
      {label} →
    </button>
  );
}