"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import SuporteSidebar from "@/components/SuporteSidebar";
import {
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  User,
  usuarioTemAcessoSuporte,
} from "@/utils/auth";
import {
  aplicarStatusFinanceiroEfetivo,
  gruposFinanceirosDivergentes,
  resumirCobrancas,
  StatusFinanceiro,
} from "@/utils/financeiroStatus";
import { supabase } from "@/utils/supabase";

type Mentorado = {
  id: string;
  nome: string | null;
  email: string | null;
  codigo_inscricao: string | null;
};

type CobrancaSuporte = {
  id: string;
  grupo_id: string;
  mentorado_id: string;
  titulo: string;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: StatusFinanceiro;
  created_at: string;
  updated_at: string;
};

type HistoricoFinanceiro = {
  id: string;
  cobranca_id: string | null;
  grupo_id: string | null;
  acao: "criado" | "atualizado" | "excluido";
  status_anterior: string | null;
  status_novo: string | null;
  origem: "gestao" | "ajuste_administrativo" | "sistema";
  motivo: string | null;
  alterado_por: string | null;
  alterado_por_nome: string | null;
  alterado_por_email: string | null;
  created_at: string;
};

type FormularioAjuste = {
  data_vencimento: string;
  data_pagamento: string;
  forma_pagamento: string;
  status: StatusFinanceiro;
  motivo: string;
};

type StatusFiltro = "Todos" | StatusFinanceiro;

const statusDisponiveis: StatusFiltro[] = [
  "Todos",
  "Pago",
  "Pendente",
  "Atrasado",
  "Cancelado",
];

export default function SuporteFinanceiroPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaSuporte[]>([]);
  const [historico, setHistorico] = useState<HistoricoFinanceiro[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("Todos");
  const [somenteInconsistencias, setSomenteInconsistencias] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [podeAjustar, setPodeAjustar] = useState(false);
  const [ajusteSelecionado, setAjusteSelecionado] =
    useState<CobrancaSuporte | null>(null);
  const [formularioAjuste, setFormularioAjuste] = useState<FormularioAjuste>({
    data_vencimento: "",
    data_pagamento: "",
    forma_pagamento: "",
    status: "Pendente",
    motivo: "",
  });

  const carregar = useCallback(async () => {
    const user = await sincronizarUsuarioComSessao();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!usuarioTemAcessoSuporte(user)) {
      router.replace(rotaInicialUsuario(user));
      return;
    }

    setUsuario(user);
    setCarregando(true);
    setErro("");

    const [
      mentoradosResposta,
      cobrancasResposta,
      historicoResposta,
      permissaoResposta,
    ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, codigo_inscricao")
          .is("excluido_em", null)
          .eq("role", "mentorado")
          .order("nome", { ascending: true }),
        supabase.rpc("financeiro_listar_cobrancas_suporte"),
        supabase.rpc("financeiro_listar_historico_suporte", {
          p_limite: 30,
        }),
        supabase.rpc("pode_ajustar_financeiro"),
      ]);

    const fontesComErro = [
      mentoradosResposta.error ? "mentorados" : null,
      cobrancasResposta.error ? "cobranças" : null,
      historicoResposta.error ? "histórico" : null,
      permissaoResposta.error ? "permissão administrativa" : null,
    ].filter(Boolean);

    setMentorados((mentoradosResposta.data ?? []) as Mentorado[]);
    setCobrancas(
      aplicarStatusFinanceiroEfetivo(
        (cobrancasResposta.data ?? []) as CobrancaSuporte[]
      )
    );
    setHistorico(
      (historicoResposta.data ?? []) as HistoricoFinanceiro[]
    );
    setPodeAjustar(
      !permissaoResposta.error && permissaoResposta.data === true
    );

    if (fontesComErro.length > 0) {
      setErro(
        `Não foi possível consultar: ${fontesComErro.join(", ")}. Verifique as permissões e tente novamente.`
      );
    }

    setAtualizadoEm(new Date().toISOString());
    setCarregando(false);
  }, [router]);

  function abrirAjuste(cobranca: CobrancaSuporte) {
    if (!podeAjustar) return;

    setAjusteSelecionado(cobranca);
    setFormularioAjuste({
      data_vencimento: cobranca.data_vencimento,
      data_pagamento:
        cobranca.status === "Pago"
          ? cobranca.data_pagamento || dataLocalISO()
          : "",
      forma_pagamento: cobranca.forma_pagamento || "Pix",
      status: cobranca.status,
      motivo: "",
    });
    setErro("");
    setSucesso("");
  }

  function fecharAjuste() {
    if (salvandoAjuste) return;
    setAjusteSelecionado(null);
  }

  function atualizarStatusAjuste(statusNovo: StatusFinanceiro) {
    setFormularioAjuste((estadoAtual) => ({
      ...estadoAtual,
      status: statusNovo,
      data_pagamento:
        statusNovo === "Pago"
          ? estadoAtual.data_pagamento || dataLocalISO()
          : "",
    }));
  }

  async function salvarAjuste(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!ajusteSelecionado || !podeAjustar || !usuario) return;

    const motivo = formularioAjuste.motivo.trim();

    if (motivo.length < 10 || motivo.length > 500) {
      setErro("Explique o motivo do ajuste usando entre 10 e 500 caracteres.");
      return;
    }

    if (
      formularioAjuste.status === "Pago" &&
      !formularioAjuste.data_pagamento
    ) {
      setErro("Informe a data do pagamento para marcar a parcela como paga.");
      return;
    }

    try {
      setSalvandoAjuste(true);
      setErro("");
      setSucesso("");

      const { data, error } = await supabase
        .from("financeiro_ajustes_administrativos")
        .insert({
          cobranca_id: ajusteSelecionado.id,
          data_vencimento: formularioAjuste.data_vencimento,
          data_pagamento:
            formularioAjuste.status === "Pago"
              ? formularioAjuste.data_pagamento
              : null,
          forma_pagamento: formularioAjuste.forma_pagamento || null,
          status: formularioAjuste.status,
          motivo,
          solicitado_por: usuario.id,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("O ajuste não retornou confirmação do banco.");

      setAjusteSelecionado(null);
      await carregar();
      setSucesso(
        "Ajuste administrativo salvo. Motivo, autoria e horário foram registrados na auditoria."
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o ajuste administrativo."
      );
    } finally {
      setSalvandoAjuste(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 0);
    return () => window.clearTimeout(timer);
  }, [carregar]);

  const mentoradoPorId = useMemo(
    () => new Map(mentorados.map((mentorado) => [mentorado.id, mentorado])),
    [mentorados]
  );

  const gruposDivergentes = useMemo(
    () => gruposFinanceirosDivergentes(cobrancas),
    [cobrancas]
  );
  const idsGruposDivergentes = useMemo(
    () => new Set(gruposDivergentes.map((grupo) => grupo.grupoId)),
    [gruposDivergentes]
  );

  const cobrancasFiltradas = useMemo(() => {
    const termo = normalizar(busca);

    return cobrancas.filter((cobranca) => {
      const mentorado = mentoradoPorId.get(cobranca.mentorado_id);
      const bateStatus = status === "Todos" || cobranca.status === status;
      const bateIntegridade =
        !somenteInconsistencias ||
        idsGruposDivergentes.has(cobranca.grupo_id) ||
        (cobranca.status === "Pago" && !cobranca.data_pagamento) ||
        (cobranca.status !== "Pago" && Boolean(cobranca.data_pagamento));
      const bateBusca =
        !termo ||
        normalizar(
          [
            cobranca.titulo,
            cobranca.status,
            cobranca.forma_pagamento,
            mentorado?.nome,
            mentorado?.email,
            mentorado?.codigo_inscricao,
          ]
            .filter(Boolean)
            .join(" ")
        ).includes(termo);

      return bateStatus && bateIntegridade && bateBusca;
    });
  }, [
    busca,
    cobrancas,
    idsGruposDivergentes,
    mentoradoPorId,
    somenteInconsistencias,
    status,
  ]);

  const resumo = useMemo(() => {
    const totais = resumirCobrancas(cobrancas);
    const contratos = new Set(cobrancas.map((item) => item.grupo_id)).size;
    const pagamentosIncoerentes = cobrancas.filter(
      (item) =>
        (item.status === "Pago" && !item.data_pagamento) ||
        (item.status !== "Pago" && Boolean(item.data_pagamento))
    ).length;

    return {
      ...totais,
      contratos,
      alertasIntegridade: gruposDivergentes.length + pagamentosIncoerentes,
    };
  }, [cobrancas, gruposDivergentes.length]);

  if (carregando || !usuario) {
    return <PageLoading pagina="diagnóstico financeiro" />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              {podeAjustar
                ? "Área técnica · ajuste individual"
                : "Área técnica · somente leitura"}
            </p>
            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Diagnóstico financeiro
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {atualizadoEm && (
              <p className="hidden text-xs font-bold text-gray-400 sm:block">
                Atualizado às {formatarHora(atualizadoEm)}
              </p>
            )}
            <button
              type="button"
              onClick={() => void carregar()}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110 sm:text-sm"
            >
              Atualizar diagnóstico
            </button>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-[#C9CED6]">
                  Financeiro para Suporte/T.I.
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  {podeAjustar
                    ? "Diagnóstico com ajuste administrativo"
                    : "Encontre falhas sem alterar pagamentos"}
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
                  {podeAjustar
                    ? "Consulte contratos e corrija vencimento, pagamento ou status quando necessário. Todo ajuste exige motivo e fica auditado."
                    : "Consulte parcelas, contratos e auditoria. Baixa, edição e cancelamento permanecem exclusivamente com a gestão financeira."}
                </p>
              </div>

              <div
                className={`rounded-[22px] border px-5 py-4 ${
                  resumo.alertasIntegridade > 0
                    ? "border-amber-300/30 bg-amber-400/15"
                    : "border-emerald-300/30 bg-emerald-400/15"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                  Integridade
                </p>
                <p className="mt-2 text-2xl font-black">
                  {resumo.alertasIntegridade > 0
                    ? `${resumo.alertasIntegridade} alerta(s)`
                    : "Dados consistentes"}
                </p>
              </div>
            </div>
          </section>

          {erro && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
              {sucesso}
            </div>
          )}

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi titulo="Contratos" valor={String(resumo.contratos)} />
            <Kpi titulo="Parcelas" valor={String(resumo.quantidadeAtiva)} />
            <Kpi titulo="Em aberto" valor={formatarMoeda(resumo.totalAberto)} />
            <Kpi
              titulo="Atrasadas"
              valor={String(resumo.quantidadeAtrasada)}
              alerta={resumo.quantidadeAtrasada > 0}
            />
            <Kpi
              titulo="Alertas técnicos"
              valor={String(resumo.alertasIntegridade)}
              alerta={resumo.alertasIntegridade > 0}
            />
          </section>

          <section className="mt-4 rounded-[24px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_auto]">
              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar mentorado, e-mail, código, cobrança ou forma"
                className="rounded-2xl border border-slate-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C] focus:bg-white"
              />
              <select
                value={status}
                onChange={(evento) =>
                  setStatus(evento.target.value as StatusFiltro)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none focus:border-[#12317C]"
              >
                {statusDisponiveis.map((item) => (
                  <option key={item} value={item}>
                    {item === "Todos" ? "Todos os status" : item}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#f9fafb] px-4 py-3 text-sm font-black">
                <input
                  type="checkbox"
                  checked={somenteInconsistencias}
                  onChange={(evento) =>
                    setSomenteInconsistencias(evento.target.checked)
                  }
                  className="h-4 w-4 accent-[#08163F]"
                />
                Somente inconsistências
              </label>
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="overflow-hidden rounded-[24px] bg-white shadow-lg shadow-slate-200/70">
              <div className="border-b border-slate-100 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Registros consultados
                </p>
                <h3 className="mt-1 text-xl font-black">
                  {cobrancasFiltradas.length} parcela(s)
                </h3>
              </div>

              {cobrancasFiltradas.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-slate-500">
                  Nenhuma parcela encontrada com os filtros atuais.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cobrancasFiltradas.map((cobranca) => {
                    const mentorado = mentoradoPorId.get(cobranca.mentorado_id);
                    const divergente = idsGruposDivergentes.has(
                      cobranca.grupo_id
                    );

                    return (
                      <article
                        key={cobranca.id}
                        className="grid gap-3 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={cobranca.status} />
                            {divergente && (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-700">
                                Total divergente
                              </span>
                            )}
                          </div>
                          <h4 className="mt-2 break-words text-base font-black">
                            {cobranca.titulo}
                          </h4>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                            {mentorado?.nome || "Mentorado não encontrado"} ·{" "}
                            {mentorado?.codigo_inscricao || "sem código"}
                          </p>
                          <p className="mt-1 break-all text-xs font-semibold text-slate-400">
                            {mentorado?.email || "E-mail não encontrado"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-left md:min-w-[300px] md:text-right">
                          <Dado
                            label="Parcela"
                            valor={`${cobranca.parcela_atual}/${cobranca.quantidade_parcelas}`}
                          />
                          <Dado
                            label="Valor"
                            valor={formatarMoeda(cobranca.valor_parcela)}
                          />
                          <Dado
                            label="Vencimento"
                            valor={formatarData(cobranca.data_vencimento)}
                          />
                          <Dado
                            label="Atualização"
                            valor={formatarDataHora(cobranca.updated_at)}
                          />
                          {podeAjustar && (
                            <button
                              type="button"
                              onClick={() => abrirAjuste(cobranca)}
                              className="col-span-2 rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110 md:ml-auto md:w-fit"
                            >
                              Ajuste administrativo
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <section className="rounded-[24px] bg-white p-5 shadow-lg shadow-slate-200/70">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Últimas alterações
                </p>
                <h3 className="mt-1 text-xl font-black">Auditoria financeira</h3>

                {historico.length === 0 ? (
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                    O histórico começa a registrar mudanças após esta atualização.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {historico.slice(0, 10).map((item) => (
                      <div key={item.id} className="py-3 first:pt-0">
                        <p className="text-sm font-black">
                          {textoHistorico(item)}
                        </p>
                        {item.motivo && (
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            Motivo: {item.motivo}
                          </p>
                        )}
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {item.alterado_por_nome || "Sistema CEO Club"} ·{" "}
                          {formatarDataHora(item.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[24px] border border-blue-100 bg-[#eef2ff] p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#12317C]">
                  {podeAjustar ? "Seu acesso individual" : "Limite de acesso"}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {podeAjustar
                    ? "Você pode corrigir vencimento, data e forma de pagamento ou status, sempre informando o motivo. Criação, valores, total do contrato e exclusão continuam exclusivamente com a Mirelen."
                    : "Esta tela não permite criar, editar, dar baixa, cancelar ou excluir cobranças. Se a falha for de negócio, encaminhe para a Mirelen no perfil Financeiro."}
                </p>
              </section>
            </aside>
          </section>
        </section>
      </section>

      {ajusteSelecionado && podeAjustar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={salvarAjuste}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                    Ajuste administrativo auditado
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-black">
                    {ajusteSelecionado.titulo}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-blue-100">
                    Parcela {ajusteSelecionado.parcela_atual}/
                    {ajusteSelecionado.quantidade_parcelas} ·{" "}
                    {formatarMoeda(ajusteSelecionado.valor_parcela)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharAjuste}
                  disabled={salvandoAjuste}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl font-black transition hover:bg-white/20 disabled:opacity-50"
                  aria-label="Fechar ajuste"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                Valores e total do contrato ficam protegidos. Para alterar dinheiro
                ou criar cobranças, use o fluxo da Mirelen no perfil Financeiro.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black">Vencimento</span>
                  <input
                    type="date"
                    required
                    value={formularioAjuste.data_vencimento}
                    onChange={(evento) =>
                      setFormularioAjuste((estadoAtual) => ({
                        ...estadoAtual,
                        data_vencimento: evento.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black">Status</span>
                  <select
                    value={formularioAjuste.status}
                    onChange={(evento) =>
                      atualizarStatusAjuste(
                        evento.target.value as StatusFinanceiro
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                  >
                    {statusDisponiveis.slice(1).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black">Forma de pagamento</span>
                  <select
                    value={formularioAjuste.forma_pagamento}
                    onChange={(evento) =>
                      setFormularioAjuste((estadoAtual) => ({
                        ...estadoAtual,
                        forma_pagamento: evento.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                  >
                    {[
                      "Crédito",
                      "Débito",
                      "Pix",
                      "Boleto",
                      "Dinheiro",
                    ].map((forma) => (
                      <option key={forma} value={forma}>
                        {forma}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black">Data do pagamento</span>
                  <input
                    type="date"
                    required={formularioAjuste.status === "Pago"}
                    disabled={formularioAjuste.status !== "Pago"}
                    value={formularioAjuste.data_pagamento}
                    onChange={(evento) =>
                      setFormularioAjuste((estadoAtual) => ({
                        ...estadoAtual,
                        data_pagamento: evento.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-black">Motivo do ajuste</span>
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  value={formularioAjuste.motivo}
                  onChange={(evento) =>
                    setFormularioAjuste((estadoAtual) => ({
                      ...estadoAtual,
                      motivo: evento.target.value,
                    }))
                  }
                  placeholder="Ex.: pagamento confirmado pela Mirelen em 04/08; correção da data informada."
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#12317C]"
                />
                <span className="mt-1 block text-right text-xs font-bold text-slate-400">
                  {formularioAjuste.motivo.length}/500
                </span>
              </label>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={fecharAjuste}
                  disabled={salvandoAjuste}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAjuste}
                  className="rounded-xl bg-[#08163F] px-5 py-2.5 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvandoAjuste ? "Salvando..." : "Salvar ajuste auditado"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Kpi({
  titulo,
  valor,
  alerta = false,
}: {
  titulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <article
      className={`rounded-[22px] border p-5 shadow-lg shadow-slate-200/60 ${
        alerta ? "border-red-100 bg-red-50" : "border-white bg-white"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
        {titulo}
      </p>
      <p
        className={`mt-3 break-words text-2xl font-black ${
          alerta ? "text-red-700" : "text-[#08163F]"
        }`}
      >
        {valor}
      </p>
    </article>
  );
}

function Dado({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-black text-[#08163F] sm:text-sm">
        {valor}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusFinanceiro }) {
  const estilos: Record<StatusFinanceiro, string> = {
    Pago: "bg-emerald-100 text-emerald-700",
    Pendente: "bg-amber-100 text-amber-700",
    Atrasado: "bg-red-100 text-red-700",
    Cancelado: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${estilos[status]}`}
    >
      {status}
    </span>
  );
}

function textoHistorico(item: HistoricoFinanceiro) {
  const prefixo =
    item.origem === "ajuste_administrativo"
      ? "Ajuste administrativo · "
      : "";

  if (item.acao === "criado") return "Parcela criada";
  if (item.acao === "excluido") return "Parcela excluída por operação administrativa";
  if (item.status_anterior !== item.status_novo) {
    return `${prefixo}status: ${item.status_anterior || "—"} → ${item.status_novo || "—"}`;
  }
  return `${prefixo}dados da parcela atualizados`;
}

function dataLocalISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function normalizar(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "—";
}

function formatarDataHora(data: string) {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}

function formatarHora(data: string) {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}
