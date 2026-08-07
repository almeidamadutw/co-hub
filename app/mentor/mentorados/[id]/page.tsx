"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import Sidebar from "@/components/Sidebar";
import {
  logoutUsuario,
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  User,
} from "@/utils/auth";
import {
  aplicarStatusFinanceiroEfetivo,
  resumirCobrancas,
} from "@/utils/financeiroStatus";
import {
  idsModulosLiberados,
  moduloEstaLiberado,
  ModuloLiberacaoGlobal,
} from "@/utils/moduloLiberacoes";
import { resolverFotoPerfil } from "@/utils/perfilFotoClient";
import { supabase } from "@/utils/supabase";

type AbaPerfil = "dados" | "financeiro" | "compromissos" | "progresso";

type Mentorado = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  codigo_inscricao: string | null;
  status: string | null;
  genero: string | null;
  nascimento: string | null;
  nacionalidade: string | null;
  profissao: string | null;
  cidade: string | null;
  foto_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CobrancaFinanceira = {
  id: string;
  mentorado_id: string;
  titulo: string;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: "Pago" | "Pendente" | "Atrasado" | "Cancelado";
  observacao: string | null;
};

type EventoAgenda = {
  id: string;
  mentorado_id: string;
  titulo: string | null;
  tipo: string | null;
  data: string;
  horario: string;
  status: string | null;
  observacao: string | null;
};

type ModuloBanco = {
  id: string;
  titulo: string;
  ordem: number | null;
  ativo: boolean | null;
};

type AulaBanco = {
  id: string;
  modulo_id: string;
  titulo: string;
  ordem: number | null;
  ativo: boolean | null;
};

type ProgressoAula = {
  id: string;
  mentorado_id: string;
  aula_id: string;
  concluida: boolean | null;
  concluida_em: string | null;
  updated_at: string | null;
};

type ProgressoModulo = {
  id: string;
  titulo: string;
  ordem: number;
  statusLiberacao: "Liberado" | "Agendado" | "Fechado";
  liberarEm: string | null;
  totalAulas: number;
  concluidas: number;
  percentual: number;
};

function dataHoraEvento(evento: EventoAgenda) {
  return new Date(`${evento.data}T${evento.horario?.slice(0, 5) || "00:00"}:00`);
}

export default function MentorMentoradoPerfilPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const mentoradoId = String(params?.id || "");

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorado, setMentorado] = useState<Mentorado | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [cobrancas, setCobrancas] = useState<CobrancaFinanceira[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [modulos, setModulos] = useState<ModuloBanco[]>([]);
  const [liberacoes, setLiberacoes] = useState<ModuloLiberacaoGlobal[]>([]);
  const [aulas, setAulas] = useState<AulaBanco[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<ProgressoAula[]>([]);

  const [aba, setAba] = useState<AbaPerfil>("dados");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const carregarPerfil = useCallback(
    async (inicial = false) => {
      if (!mentoradoId) return;

      if (inicial) setCarregando(true);
      else setAtualizando(true);

      try {
        setErro("");
        setNaoEncontrado(false);

        const [
          perfilResposta,
          cobrancasResposta,
          eventosResposta,
          modulosResposta,
          liberacoesResposta,
          aulasResposta,
          progressoResposta,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, nome, email, telefone, codigo_inscricao, status, genero, nascimento, nacionalidade, profissao, cidade, foto_url, created_at, updated_at"
            )
            .eq("id", mentoradoId)
            .eq("role", "mentorado")
            .is("excluido_em", null)
            .maybeSingle<Mentorado>(),
          supabase
            .from("financeiro_cobrancas")
            .select(
              "id, mentorado_id, titulo, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao"
            )
            .eq("mentorado_id", mentoradoId)
            .order("data_vencimento", { ascending: true }),
          supabase
            .from("agenda_eventos")
            .select(
              "id, mentorado_id, titulo, tipo, data, horario, status, observacao"
            )
            .eq("mentorado_id", mentoradoId)
            .order("data", { ascending: true })
            .order("horario", { ascending: true }),
          supabase
            .from("modulos")
            .select("id, titulo, ordem, ativo")
            .eq("ativo", true)
            .order("ordem", { ascending: true }),
          supabase
            .from("modulo_liberacoes")
            .select("modulo_id, status_liberacao, liberar_em"),
          supabase
            .from("aulas")
            .select("id, modulo_id, titulo, ordem, ativo")
            .eq("ativo", true)
            .order("ordem", { ascending: true }),
          supabase
            .from("progresso_aulas")
            .select(
              "id, mentorado_id, aula_id, concluida, concluida_em, updated_at"
            )
            .eq("mentorado_id", mentoradoId),
        ]);

        const falha = [
          perfilResposta.error,
          cobrancasResposta.error,
          eventosResposta.error,
          modulosResposta.error,
          liberacoesResposta.error,
          aulasResposta.error,
          progressoResposta.error,
        ].find(Boolean);

        if (falha) throw new Error(falha.message);

        if (!perfilResposta.data) {
          setMentorado(null);
          setNaoEncontrado(true);
          return;
        }

        const perfil = perfilResposta.data as Mentorado;
        setMentorado(perfil);
        setCobrancas(
          aplicarStatusFinanceiroEfetivo(
            (cobrancasResposta.data ?? []) as CobrancaFinanceira[]
          )
        );
        setEventos((eventosResposta.data ?? []) as EventoAgenda[]);
        setModulos((modulosResposta.data ?? []) as ModuloBanco[]);
        setLiberacoes(
          (liberacoesResposta.data ?? []) as ModuloLiberacaoGlobal[]
        );
        setAulas((aulasResposta.data ?? []) as AulaBanco[]);
        setProgressoAulas(
          (progressoResposta.data ?? []) as ProgressoAula[]
        );

        try {
          setFotoPerfil(await resolverFotoPerfil(perfil.foto_url));
        } catch {
          setFotoPerfil(null);
        }
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o acompanhamento do mentorado."
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [mentoradoId]
  );

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const user = await sincronizarUsuarioComSessao();

      if (!ativo) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "mentor") {
        router.replace(rotaInicialUsuario(user));
        return;
      }

      setUsuario(user);
      await carregarPerfil(true);
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [carregarPerfil, router]);

  const idsLiberados = useMemo(
    () => idsModulosLiberados(liberacoes),
    [liberacoes]
  );

  const progressoModulos = useMemo<ProgressoModulo[]>(() => {
    const concluidas = new Set(
      progressoAulas
        .filter((item) => item.concluida === true)
        .map((item) => item.aula_id)
    );

    return modulos.map((modulo) => {
      const aulasModulo = aulas.filter(
        (aula) => aula.modulo_id === modulo.id && aula.ativo !== false
      );
      const concluidasModulo = aulasModulo.filter((aula) =>
        concluidas.has(aula.id)
      ).length;
      const liberacao = liberacoes.find(
        (item) => item.modulo_id === modulo.id
      );
      const liberado = moduloEstaLiberado(liberacao);
      const agendado =
        !liberado &&
        liberacao?.status_liberacao === "agendado" &&
        Boolean(liberacao.liberar_em);

      return {
        id: modulo.id,
        titulo: modulo.titulo,
        ordem: modulo.ordem ?? 999,
        statusLiberacao: liberado
          ? "Liberado"
          : agendado
          ? "Agendado"
          : "Fechado",
        liberarEm: liberacao?.liberar_em ?? null,
        totalAulas: aulasModulo.length,
        concluidas: concluidasModulo,
        percentual:
          aulasModulo.length > 0
            ? Math.round((concluidasModulo / aulasModulo.length) * 100)
            : 0,
      };
    });
  }, [aulas, liberacoes, modulos, progressoAulas]);

  const progressoGeral = useMemo(() => {
    const aulasLiberadas = aulas.filter(
      (aula) => aula.ativo !== false && idsLiberados.has(aula.modulo_id)
    );
    const idsAulas = new Set(aulasLiberadas.map((aula) => aula.id));
    const concluidas = progressoAulas.filter(
      (item) => item.concluida === true && idsAulas.has(item.aula_id)
    ).length;

    return {
      total: aulasLiberadas.length,
      concluidas,
      percentual:
        aulasLiberadas.length > 0
          ? Math.round((concluidas / aulasLiberadas.length) * 100)
          : 0,
    };
  }, [aulas, idsLiberados, progressoAulas]);

  const financeiro = useMemo(() => resumirCobrancas(cobrancas), [cobrancas]);

  const agenda = useMemo(() => {
    const agora = Date.now();
    const futuros = eventos
      .filter(
        (evento) =>
          !["Cancelada", "Concluída"].includes(evento.status || "") &&
          dataHoraEvento(evento).getTime() >= agora
      )
      .sort(
        (a, b) => dataHoraEvento(a).getTime() - dataHoraEvento(b).getTime()
      );

    const historico = eventos
      .filter((evento) => !futuros.some((futuro) => futuro.id === evento.id))
      .sort(
        (a, b) => dataHoraEvento(b).getTime() - dataHoraEvento(a).getTime()
      );

    return { futuros, historico };
  }, [eventos]);

  const ultimaAtividade = useMemo(() => {
    const registros = progressoAulas
      .filter((item) => item.concluida === true)
      .sort((a, b) => {
        const dataA = new Date(
          a.concluida_em || a.updated_at || 0
        ).getTime();
        const dataB = new Date(
          b.concluida_em || b.updated_at || 0
        ).getTime();
        return dataB - dataA;
      });

    const registro = registros[0];
    if (!registro) return null;

    return {
      data: registro.concluida_em || registro.updated_at,
      aula: aulas.find((aula) => aula.id === registro.aula_id)?.titulo || "Aula",
    };
  }, [aulas, progressoAulas]);

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return <PageLoading pagina="acompanhamento do mentorado" />;
  }

  if (naoEncontrado || !mentorado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] p-4 text-[#08163F]">
        <section className="w-full max-w-xl rounded-[28px] bg-white p-8 text-center shadow-xl shadow-slate-200/70">
          <h1 className="text-2xl font-black">Mentorado não encontrado</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            O cadastro pode ter sido removido ou o endereço não corresponde a um mentorado ativo no sistema.
          </p>
          <Link
            href="/mentor/mentorados/lista"
            className="mt-5 inline-flex rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white"
          >
            Voltar para mentorados
          </Link>
        </section>
      </main>
    );
  }

  const proximoEncontro = agenda.futuros[0] ?? null;
  const inicial = mentorado.nome.charAt(0).toUpperCase();

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar
        nome={usuario.nome}
        role={usuario.role}
        acessoSuporte={Boolean(usuario.acesso_suporte)}
      />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/mentor/mentorados/lista")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Mentorados
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Acompanhamento individual
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                {mentorado.nome}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void carregarPerfil(false)}
              disabled={atualizando}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-lg transition hover:shadow-xl disabled:opacity-60 sm:text-sm"
            >
              {atualizando ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={() => void sair()}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 p-1.5 sm:h-24 sm:w-24">
                  {fotoPerfil ? (
                    <Image
                      src={fotoPerfil}
                      alt={`Foto de ${mentorado.nome}`}
                      width={96}
                      height={96}
                      unoptimized
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white/15 text-3xl font-black text-white">
                      {inicial}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9CED6] sm:text-xs">
                      Mentorado CEO Club
                    </p>
                    <StatusBadge status={mentorado.status || "Ativo"} />
                  </div>
                  <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl lg:text-4xl">
                    {mentorado.nome}
                  </h2>
                  <p className="mt-2 break-all text-sm font-semibold text-[#D9DEE7]">
                    {mentorado.email}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#C9CED6]">
                    Código {mentorado.codigo_inscricao || "não informado"} · Entrada {formatarData(mentorado.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/mentor/biblioteca?mentorado=${mentorado.id}`}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:brightness-95"
                >
                  Biblioteca
                </Link>
                <Link
                  href="/mentor/agenda"
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                >
                  + Agendar encontro
                </Link>
              </div>
            </div>
          </section>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Progresso" valor={`${progressoGeral.percentual}%`} destaque />
            <KPI
              titulo="Próximo encontro"
              valor={
                proximoEncontro
                  ? `${formatarData(proximoEncontro.data)} · ${limparHorario(
                      proximoEncontro.horario
                    )}`
                  : "Sem agenda"
              }
            />
            <KPI
              titulo="Cobranças atrasadas"
              valor={financeiro.quantidadeAtrasada}
              alerta={financeiro.quantidadeAtrasada > 0}
            />
            <KPI
              titulo="Última atividade"
              valor={
                ultimaAtividade?.data
                  ? formatarDataHora(ultimaAtividade.data)
                  : "Sem registro"
              }
            />
          </section>

          <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <AbaButton ativa={aba === "dados"} onClick={() => setAba("dados")}>Dados</AbaButton>
            <AbaButton ativa={aba === "financeiro"} onClick={() => setAba("financeiro")}>Financeiro</AbaButton>
            <AbaButton ativa={aba === "compromissos"} onClick={() => setAba("compromissos")}>Compromissos</AbaButton>
            <AbaButton ativa={aba === "progresso"} onClick={() => setAba("progresso")}>Progresso</AbaButton>
          </nav>

          {aba === "dados" && (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card titulo="Dados do mentorado" subtitulo="Informações de contato e perfil para acompanhamento da mentoria.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoBox label="E-mail" value={mentorado.email} />
                  <InfoBox label="Telefone" value={mentorado.telefone || "Não informado"} />
                  <InfoBox label="Cidade" value={mentorado.cidade || "Não informada"} />
                  <InfoBox label="Profissão" value={mentorado.profissao || "Não informada"} />
                  <InfoBox label="Nascimento" value={formatarNascimento(mentorado.nascimento)} />
                  <InfoBox label="Gênero" value={mentorado.genero || "Não informado"} />
                  <InfoBox label="Nacionalidade" value={mentorado.nacionalidade || "Não informada"} />
                  <InfoBox label="Código de inscrição" value={mentorado.codigo_inscricao || "Não informado"} />
                  <InfoBox label="Entrada no programa" value={formatarData(mentorado.created_at)} />
                </div>
              </Card>

              <aside className="space-y-4">
                <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Acompanhamento</p>
                  <p className="mt-3 text-3xl font-black text-[#08163F]">{progressoGeral.percentual}%</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{progressoGeral.concluidas} de {progressoGeral.total} aulas liberadas</p>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eef1f5]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]" style={{ width: `${progressoGeral.percentual}%` }} />
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#D9DEE7] bg-[#f9fafb] p-5">
                  <h3 className="text-base font-black text-[#08163F]">Cadastro protegido</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    A mentora acompanha estes dados, mas alterações de cadastro, status e acesso ficam centralizadas no Suporte para evitar divergência de permissões.
                  </p>
                </div>
              </aside>
            </section>
          )}

          {aba === "financeiro" && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ResumoBox titulo="Pago" valor={formatarMoeda(financeiro.totalPago)} descricao={`${financeiro.quantidadePaga} parcela(s)`} />
                <ResumoBox titulo="Em aberto" valor={formatarMoeda(financeiro.totalAberto)} descricao={`${financeiro.quantidadeAberta} parcela(s)`} />
                <ResumoBox titulo="Atrasado" valor={formatarMoeda(financeiro.totalAtrasado)} descricao={`${financeiro.quantidadeAtrasada} parcela(s)`} alerta={financeiro.quantidadeAtrasada > 0} />
                <ResumoBox titulo="Parcelas ativas" valor={String(financeiro.quantidadeAtiva)} descricao="histórico financeiro" />
              </div>

              <Card titulo="Histórico financeiro" subtitulo="Visão de acompanhamento. Ajustes continuam na área Financeiro.">
                {cobrancas.length === 0 ? (
                  <EmptyState titulo="Nenhuma cobrança cadastrada" texto="Quando o financeiro lançar parcelas para este mentorado, elas aparecerão aqui." />
                ) : (
                  <div className="space-y-3">
                    {cobrancas.map((cobranca) => (
                      <div key={cobranca.id} className="grid gap-3 rounded-2xl bg-[#f9fafb] p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-black text-[#08163F]">{cobranca.titulo}</p>
                            <FinanceiroBadge status={cobranca.status} />
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Parcela {cobranca.parcela_atual} de {cobranca.quantidade_parcelas} · vencimento {formatarData(cobranca.data_vencimento)}</p>
                        </div>
                        <p className="text-sm font-black text-[#08163F]">{formatarMoeda(cobranca.valor_parcela)}</p>
                        <p className="text-xs font-bold text-slate-400">{cobranca.data_pagamento ? `Pago em ${formatarData(cobranca.data_pagamento)}` : cobranca.forma_pagamento || "Pagamento não registrado"}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <Link href="/mentor/financeiro" className="inline-flex rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110">Abrir Financeiro</Link>
                </div>
              </Card>
            </section>
          )}

          {aba === "compromissos" && (
            <section className="grid gap-4 xl:grid-cols-2">
              <Card titulo="Próximos compromissos" subtitulo="Encontros confirmados ou aguardando com este mentorado.">
                {agenda.futuros.length === 0 ? (
                  <EmptyState titulo="Nenhum compromisso futuro" texto="Use a Agenda para marcar o próximo encontro deste mentorado." />
                ) : (
                  <div className="space-y-3">
                    {agenda.futuros.map((evento) => <EventoCard key={evento.id} evento={evento} />)}
                  </div>
                )}
                <div className="mt-4"><Link href="/mentor/agenda" className="inline-flex rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white">Abrir Agenda</Link></div>
              </Card>

              <Card titulo="Histórico de encontros" subtitulo="Compromissos concluídos, cancelados ou já passados.">
                {agenda.historico.length === 0 ? (
                  <EmptyState titulo="Sem histórico ainda" texto="Os encontros anteriores aparecerão aqui conforme a jornada avançar." />
                ) : (
                  <div className="space-y-3">
                    {agenda.historico.slice(0, 12).map((evento) => <EventoCard key={evento.id} evento={evento} />)}
                  </div>
                )}
              </Card>
            </section>
          )}

          {aba === "progresso" && (
            <section className="space-y-4">
              <Card titulo="Progresso geral" subtitulo="O percentual considera somente aulas de módulos já liberados.">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-4xl font-black text-[#08163F]">{progressoGeral.percentual}%</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{progressoGeral.concluidas} de {progressoGeral.total} aulas liberadas concluídas</p>
                  </div>
                  <div className="min-w-0 flex-1 sm:max-w-xl">
                    <div className="h-3 overflow-hidden rounded-full bg-[#eef1f5]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]" style={{ width: `${progressoGeral.percentual}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-400">Última atividade: {ultimaAtividade?.data ? `${ultimaAtividade.aula} · ${formatarDataHora(ultimaAtividade.data)}` : "nenhuma aula concluída ainda"}</p>
                  </div>
                </div>
              </Card>

              <section className="grid gap-4 xl:grid-cols-2">
                {progressoModulos.map((modulo) => (
                  <article key={modulo.id} className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Módulo {modulo.ordem}</p>
                        <h3 className="mt-2 break-words text-lg font-black text-[#08163F]">{modulo.titulo}</h3>
                      </div>
                      <ModuloBadge status={modulo.statusLiberacao} />
                    </div>

                    {modulo.statusLiberacao === "Liberado" ? (
                      <>
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                          <span>{modulo.concluidas} de {modulo.totalAulas} aulas</span>
                          <span className="font-black text-[#08163F]">{modulo.percentual}%</span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#eef1f5]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]" style={{ width: `${modulo.percentual}%` }} />
                        </div>
                      </>
                    ) : (
                      <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                        {modulo.statusLiberacao === "Agendado" && modulo.liberarEm
                          ? `Liberação programada para ${formatarDataHora(modulo.liberarEm)}.`
                          : "Este módulo ainda não foi liberado para a jornada."}
                      </p>
                    )}
                  </article>
                ))}
              </section>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function AbaButton({ ativa, onClick, children }: { ativa: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${ativa ? "bg-[#08163F] text-white shadow-lg" : "bg-white text-slate-500 hover:text-[#08163F] hover:shadow-md"}`}>{children}</button>;
}

function Card({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5 lg:p-6"><h3 className="text-xl font-black text-[#050816] sm:text-2xl">{titulo}</h3>{subtitulo && <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{subtitulo}</p>}<div className="mt-5">{children}</div></section>;
}

function KPI({ titulo, valor, destaque, alerta }: { titulo: string; valor: React.ReactNode; destaque?: boolean; alerta?: boolean }) {
  return <div className={`rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${destaque ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white" : alerta ? "bg-amber-50 text-amber-800" : "bg-white text-[#08163F]"}`}><p className={`text-xs font-black sm:text-sm ${destaque ? "text-[#C9CED6]" : alerta ? "text-amber-600" : "text-slate-500"}`}>{titulo}</p><p className="mt-3 break-words text-xl font-black sm:text-2xl">{valor}</p></div>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 break-words text-sm font-black text-[#08163F]">{value}</p></div>;
}

function ResumoBox({ titulo, valor, descricao, alerta }: { titulo: string; valor: string; descricao: string; alerta?: boolean }) {
  return <div className={`rounded-[20px] p-4 shadow-lg shadow-slate-200/70 ${alerta ? "bg-red-50" : "bg-white"}`}><p className={`text-xs font-black ${alerta ? "text-red-500" : "text-slate-500"}`}>{titulo}</p><p className={`mt-2 text-2xl font-black ${alerta ? "text-red-700" : "text-[#08163F]"}`}>{valor}</p><p className="mt-1 text-xs font-semibold text-slate-400">{descricao}</p></div>;
}

function EmptyState({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="rounded-2xl bg-[#f9fafb] p-5 text-center"><p className="font-black text-[#08163F]">{titulo}</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{texto}</p></div>;
}

function EventoCard({ evento }: { evento: EventoAgenda }) {
  return <div className="rounded-2xl bg-[#f9fafb] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{formatarData(evento.data)} · {limparHorario(evento.horario)}</p><AgendaBadge status={evento.status || "Aguardando"} /></div><p className="mt-2 text-sm font-black text-[#08163F]">{evento.titulo || evento.tipo || "Compromisso"}</p>{evento.observacao && <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{evento.observacao}</p>}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const valor = status.toLowerCase();
  const classe = ["inativo", "cancelado", "bloqueado", "suspenso"].includes(valor) ? "bg-white/10 text-[#D9DEE7]" : valor === "pendente" ? "bg-amber-300/15 text-amber-100" : "bg-emerald-300/15 text-emerald-100";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${classe}`}>{status}</span>;
}

function FinanceiroBadge({ status }: { status: CobrancaFinanceira["status"] }) {
  const classes: Record<CobrancaFinanceira["status"], string> = { Pago: "bg-emerald-50 text-emerald-700", Pendente: "bg-amber-50 text-amber-700", Atrasado: "bg-red-50 text-red-700", Cancelado: "bg-slate-100 text-slate-500" };
  return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${classes[status]}`}>{status}</span>;
}

function AgendaBadge({ status }: { status: string }) {
  const classes = status === "Confirmada" ? "bg-emerald-50 text-emerald-700" : status === "Concluída" ? "bg-blue-50 text-blue-700" : status === "Cancelada" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${classes}`}>{status}</span>;
}

function ModuloBadge({ status }: { status: ProgressoModulo["statusLiberacao"] }) {
  const classes: Record<ProgressoModulo["statusLiberacao"], string> = { Liberado: "bg-emerald-50 text-emerald-700", Agendado: "bg-blue-50 text-blue-700", Fechado: "bg-slate-100 text-slate-500" };
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${classes[status]}`}>{status}</span>;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));
}

function formatarData(data?: string | null) {
  if (!data) return "—";
  const dataISO = data.slice(0, 10);
  const [ano, mes, dia] = dataISO.split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(data?: string | null) {
  if (!data) return "—";
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return formatarData(data);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function formatarNascimento(valor?: string | null) {
  if (!valor) return "Não informado";
  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return formatarData(valor);
  return valor;
}

function limparHorario(horario?: string | null) {
  return horario?.slice(0, 5) || "—";
}
