"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/utils/supabase";
import {
  getUsuarioLogado,
  usuarioTemPermissao,
  User,
} from "@/utils/auth";

type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";

type Mentorado = {
  id: string;
  nome: string;
  email: string;
  codigo_inscricao: string | null;
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

type CobrancaComMentorado = Cobranca & {
  mentoradoNome: string;
  mentoradoEmail: string;
  mentoradoCodigo: string;
};

type FormularioCobranca = {
  mentorado_id: string;
  titulo: string;
  descricao: string;
  valor_total: string;
  quantidade_parcelas: string;
  parcela_atual: string;
  valor_parcela: string;
  data_vencimento: string;
  data_pagamento: string;
  forma_pagamento: string;
  status: StatusCobranca;
  observacao: string;
};

type ParcelaPreview = {
  numero: number;
  total: number;
  valor: number;
  vencimento: string;
  status: StatusCobranca;
};

const formularioInicial: FormularioCobranca = {
  mentorado_id: "",
  titulo: "",
  descricao: "",
  valor_total: "",
  quantidade_parcelas: "1",
  parcela_atual: "1",
  valor_parcela: "",
  data_vencimento: "",
  data_pagamento: "",
  forma_pagamento: "Pix",
  status: "Pendente",
  observacao: "",
};

export default function FinanceiroPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioCobranca>(formularioInicial);

  const [mostrarPreviewParcelas, setMostrarPreviewParcelas] = useState(false);

  const [cobrancaSelecionada, setCobrancaSelecionada] =
    useState<CobrancaComMentorado | null>(null);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["mentor", "financeiro"])) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    const { data: mentoradosData, error: mentoradosError } = await supabase
      .from("profiles")
      .select("id, nome, email, codigo_inscricao")
      .eq("role", "mentorado")
      .order("created_at", { ascending: false });

    if (mentoradosError) {
      setErro(mentoradosError.message);
      setCarregando(false);
      return;
    }

    const { data: cobrancasData, error: cobrancasError } = await supabase
      .from("financeiro_cobrancas")
      .select(
        "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, created_at, updated_at"
      )
      .order("data_vencimento", { ascending: true });

    if (cobrancasError) {
      setErro(cobrancasError.message);
      setCarregando(false);
      return;
    }

    setMentorados((mentoradosData ?? []) as Mentorado[]);
    setCobrancas((cobrancasData ?? []) as Cobranca[]);
    setCarregando(false);
  }

  const cobrancasComMentorado = useMemo<CobrancaComMentorado[]>(() => {
    return cobrancas.map((cobranca) => {
      const mentorado = mentorados.find(
        (item) => item.id === cobranca.mentorado_id
      );

      return {
        ...cobranca,
        mentoradoNome: mentorado?.nome ?? "Mentorado não encontrado",
        mentoradoEmail: mentorado?.email ?? "",
        mentoradoCodigo: mentorado?.codigo_inscricao ?? "",
      };
    });
  }, [cobrancas, mentorados]);

  const cobrancasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return cobrancasComMentorado.filter((cobranca) => {
      const bateBusca =
        !termo ||
        cobranca.mentoradoNome.toLowerCase().includes(termo) ||
        cobranca.mentoradoEmail.toLowerCase().includes(termo) ||
        cobranca.mentoradoCodigo.toLowerCase().includes(termo) ||
        cobranca.titulo.toLowerCase().includes(termo) ||
        cobranca.status.toLowerCase().includes(termo);

      const bateStatus =
        filtroStatus === "Todos" || cobranca.status === filtroStatus;

      return bateBusca && bateStatus;
    });
  }, [cobrancasComMentorado, busca, filtroStatus]);

  const resumo = useMemo(() => {
    const totalPrevisto = cobrancas.reduce(
      (acc, item) => acc + Number(item.valor_parcela || 0),
      0
    );

    const recebido = cobrancas
      .filter((item) => item.status === "Pago")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const aberto = cobrancas
      .filter((item) => item.status === "Pendente" || item.status === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const atrasado = cobrancas
      .filter((item) => item.status === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    return {
      totalPrevisto,
      recebido,
      aberto,
      atrasado,
      quantidadeAtrasada: cobrancas.filter((item) => item.status === "Atrasado")
        .length,
    };
  }, [cobrancas]);

  const previewParcelas = useMemo<ParcelaPreview[]>(() => {
    const valorTotal = moedaInputParaNumero(formulario.valor_total);
    const quantidadeParcelas = Number(formulario.quantidade_parcelas);

    if (
      !formulario.data_vencimento ||
      valorTotal <= 0 ||
      quantidadeParcelas <= 0
    ) {
      return [];
    }

    const valorParcela = Number((valorTotal / quantidadeParcelas).toFixed(2));
    const vencimentoBase = new Date(`${formulario.data_vencimento}T12:00:00`);

    return Array.from({ length: quantidadeParcelas }, (_, index) => {
      const dataVencimento = new Date(vencimentoBase);
      dataVencimento.setMonth(vencimentoBase.getMonth() + index);

      return {
        numero: index + 1,
        total: quantidadeParcelas,
        valor: valorParcela,
        vencimento: formatarDataISO(dataVencimento),
        status: index === 0 ? formulario.status : "Pendente",
      };
    });
  }, [
    formulario.valor_total,
    formulario.quantidade_parcelas,
    formulario.data_vencimento,
    formulario.status,
  ]);

  function limparFormulario() {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setMostrarPreviewParcelas(false);
    setErro("");
  }

  function abrirNovoLancamento() {
    limparFormulario();
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    limparFormulario();
    setMostrarFormulario(false);
  }

  function editarCobranca(cobranca: CobrancaComMentorado) {
    setFormulario({
      mentorado_id: cobranca.mentorado_id,
      titulo: cobranca.titulo,
      descricao: cobranca.descricao ?? "",
      valor_total: numeroParaMoedaInput(cobranca.valor_total),
      quantidade_parcelas: String(cobranca.quantidade_parcelas),
      parcela_atual: String(cobranca.parcela_atual),
      valor_parcela: numeroParaMoedaInput(cobranca.valor_parcela),
      data_vencimento: cobranca.data_vencimento,
      data_pagamento: cobranca.data_pagamento ?? "",
      forma_pagamento: cobranca.forma_pagamento ?? "Pix",
      status: cobranca.status,
      observacao: cobranca.observacao ?? "",
    });

    setEditandoId(cobranca.id);
    setCobrancaSelecionada(null);
    setMostrarPreviewParcelas(false);
    setMostrarFormulario(true);
  }

  function gerarPreviewParcelas() {
    setErro("");

    const valorTotal = moedaInputParaNumero(formulario.valor_total);
    const quantidadeParcelas = Number(formulario.quantidade_parcelas);

    if (
      !formulario.mentorado_id ||
      !formulario.titulo.trim() ||
      !formulario.data_vencimento ||
      valorTotal <= 0 ||
      quantidadeParcelas <= 0
    ) {
      setErro(
        "Preencha mentorado, título, valor total, quantidade de parcelas e vencimento para gerar a prévia."
      );
      return;
    }

    setMostrarPreviewParcelas(true);
  }

  function atualizarCampoFormulario(
    campo: keyof FormularioCobranca,
    valor: string
  ) {
    const valorFinal =
      campo === "valor_total" || campo === "valor_parcela"
        ? formatarMoedaInput(valor)
        : valor;

    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valorFinal,
    }));

    if (
      campo === "valor_total" ||
      campo === "quantidade_parcelas" ||
      campo === "data_vencimento" ||
      campo === "status"
    ) {
      setMostrarPreviewParcelas(false);
    }
  }

  async function salvarCobranca(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const valorTotal = moedaInputParaNumero(formulario.valor_total);
    const quantidadeParcelas = Number(formulario.quantidade_parcelas);
    const parcelaAtual = Number(formulario.parcela_atual);
    const valorParcela = moedaInputParaNumero(formulario.valor_parcela);

    if (
      !formulario.mentorado_id ||
      !formulario.titulo.trim() ||
      !formulario.data_vencimento ||
      valorTotal <= 0 ||
      quantidadeParcelas <= 0 ||
      parcelaAtual <= 0
    ) {
      setErro("Preencha os campos obrigatórios corretamente.");
      return;
    }

    try {
      setSalvando(true);

      if (editandoId) {
        if (valorParcela <= 0) {
          setErro("Informe o valor da parcela.");
          setSalvando(false);
          return;
        }

        const payload = {
          mentorado_id: formulario.mentorado_id,
          titulo: formulario.titulo.trim(),
          descricao: formulario.descricao.trim(),
          valor_total: valorTotal,
          quantidade_parcelas: quantidadeParcelas,
          parcela_atual: parcelaAtual,
          valor_parcela: valorParcela,
          data_vencimento: formulario.data_vencimento,
          data_pagamento: formulario.data_pagamento || null,
          forma_pagamento: formulario.forma_pagamento,
          status: formulario.status,
          observacao: formulario.observacao.trim(),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("financeiro_cobrancas")
          .update(payload)
          .eq("id", editandoId);

        if (error) throw new Error(error.message);
      } else {
        const valorParcelaManual = moedaInputParaNumero(formulario.valor_parcela);

const valorParcelaCalculado =
  valorParcelaManual > 0
    ? valorParcelaManual
    : Number((valorTotal / quantidadeParcelas).toFixed(2));

        const vencimentoBase = new Date(`${formulario.data_vencimento}T12:00:00`);

        const parcelas = Array.from(
          { length: quantidadeParcelas },
          (_, index) => {
            const dataVencimento = new Date(vencimentoBase);
            dataVencimento.setMonth(vencimentoBase.getMonth() + index);

            return {
              mentorado_id: formulario.mentorado_id,
              titulo: formulario.titulo.trim(),
              descricao: formulario.descricao.trim(),
              valor_total: valorTotal,
              quantidade_parcelas: quantidadeParcelas,
              parcela_atual: index + 1,
              valor_parcela: valorParcelaCalculado,
              data_vencimento: formatarDataISO(dataVencimento),
              data_pagamento:
                formulario.status === "Pago" && index === 0
                  ? new Date().toISOString().slice(0, 10)
                  : null,
              forma_pagamento: formulario.forma_pagamento,
              status: index === 0 ? formulario.status : "Pendente",
              observacao: formulario.observacao.trim(),
              updated_at: new Date().toISOString(),
            };
          }
        );

        const { error } = await supabase
          .from("financeiro_cobrancas")
          .insert(parcelas);

        if (error) throw new Error(error.message);
      }

      await carregarDados();
      fecharFormulario();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o lançamento."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatus(id: string, status: StatusCobranca) {
    try {
      setErro("");

      const { error } = await supabase
        .from("financeiro_cobrancas")
        .update({
          status,
          data_pagamento:
            status === "Pago" ? new Date().toISOString().slice(0, 10) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await carregarDados();
      setCobrancaSelecionada(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status."
      );
    }
  }

  async function excluirCobranca(id: string) {
    const confirmar = window.confirm("Deseja excluir este lançamento?");

    if (!confirmar) return;

    try {
      setErro("");

      const { error } = await supabase
        .from("financeiro_cobrancas")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);

      await carregarDados();
      setCobrancaSelecionada(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o lançamento."
      );
    }
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando financeiro...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative flex-1 overflow-hidden p-6 md:p-8">
        <div className="relative z-10">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-[0_24px_60px_rgba(8,22,63,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-[#C9CED6]">
                  Financeiro CEO Club
                </p>

                <h1 className="max-w-4xl text-4xl font-black leading-tight">
                  Gestão financeira da mentoria
                </h1>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Organize cobranças, parcelas, vencimentos e pagamentos dos
                  mentorados.
                </p>
              </div>

              <button
                onClick={abrirNovoLancamento}
                className="rounded-2xl px-5 py-3 font-black text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
                style={{
                  background:
                    "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                }}
              >
                Novo lançamento
              </button>
            </div>
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <ResumoCard
              titulo="Total previsto"
              valor={formatarMoeda(resumo.totalPrevisto)}
              destaque
            />

            <ResumoCard titulo="Recebido" valor={formatarMoeda(resumo.recebido)} />

            <ResumoCard titulo="Em aberto" valor={formatarMoeda(resumo.aberto)} />

            <ResumoCard
              titulo="Atrasado"
              valor={formatarMoeda(resumo.atrasado)}
              alerta={resumo.quantidadeAtrasada > 0}
            />
          </section>

          <section className="mb-6 rounded-[28px] border border-white/50 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <input
                type="text"
                placeholder="Buscar por mentorado, e-mail, inscrição, título ou status"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#08163F] outline-none placeholder:text-slate-400 focus:border-[#12317C]"
              />

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#08163F] outline-none focus:border-[#12317C]"
              >
                <option>Todos</option>
                <option>Pago</option>
                <option>Pendente</option>
                <option>Atrasado</option>
                <option>Cancelado</option>
              </select>
            </div>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {mostrarFormulario && (
            <form
              onSubmit={salvarCobranca}
              className="mb-6 rounded-[28px] border border-white/50 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            >
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {editandoId ? "Editar lançamento" : "Novo lançamento"}
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-[#08163F]">
                    Dados da cobrança
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Preencha os dados abaixo para registrar uma cobrança única
                    ou gerar parcelas automaticamente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharFormulario}
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <CampoFinanceiro
                  label="Mentorado"
                  ajuda="Pessoa que receberá esta cobrança. O lançamento ficará vinculado ao perfil selecionado."
                >
                  <select
                    value={formulario.mentorado_id}
                    onChange={(e) =>
                      atualizarCampoFormulario("mentorado_id", e.target.value)
                    }
                    className="input-financeiro"
                  >
                    <option value="">Selecione o mentorado</option>

                    {mentorados.map((mentorado) => (
                      <option key={mentorado.id} value={mentorado.id}>
                        {mentorado.codigo_inscricao ?? "—"} · {mentorado.nome} ·{" "}
                        {mentorado.email}
                      </option>
                    ))}
                  </select>
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Título da cobrança"
                  ajuda="Nome do lançamento. Ex: Mensalidade, Mentoria anual, Parcela CEO Club."
                >
                  <input
                    type="text"
                    placeholder="Ex: Mensalidade CEO Club"
                    value={formulario.titulo}
                    onChange={(e) =>
                      atualizarCampoFormulario("titulo", e.target.value)
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Valor total"
                  ajuda="Valor completo contratado. Se for parcelado, este valor será dividido pela quantidade de parcelas."
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 12.000,00"
                    value={formulario.valor_total}
                    onChange={(e) =>
                      atualizarCampoFormulario("valor_total", e.target.value)
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
  label="Valor da parcela"
  ajuda="Valor cobrado em cada parcela. Se deixar vazio, o sistema calcula automaticamente pelo valor total dividido pela quantidade de parcelas."
>
  <input
    type="text"
    inputMode="numeric"
    placeholder="Ex: 1.000,00"
    value={formulario.valor_parcela}
    onChange={(e) =>
      atualizarCampoFormulario("valor_parcela", e.target.value)
    }
    className="input-financeiro"
  />
</CampoFinanceiro>

                <CampoFinanceiro
                  label="Quantidade de parcelas"
                  ajuda="Total de parcelas que serão criadas. Ex: 12 parcelas para uma mentoria anual."
                >
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 12"
                    value={formulario.quantidade_parcelas}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "quantidade_parcelas",
                        e.target.value
                      )
                    }
                    disabled={Boolean(editandoId)}
                    className={`input-financeiro ${
                      editandoId
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : ""
                    }`}
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Parcela atual"
                  ajuda="Número da parcela deste lançamento. Na criação, o sistema gera isso sozinho."
                >
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 1"
                    value={formulario.parcela_atual}
                    onChange={(e) =>
                      atualizarCampoFormulario("parcela_atual", e.target.value)
                    }
                    disabled={!editandoId}
                    className={`input-financeiro ${
                      !editandoId
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : ""
                    }`}
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Data de vencimento"
                  ajuda="Dia em que a cobrança vence. Em parcelas, os próximos vencimentos serão gerados mês a mês."
                >
                  <input
                    type="date"
                    value={formulario.data_vencimento}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "data_vencimento",
                        e.target.value
                      )
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Data de pagamento"
                  ajuda="Preencha apenas se a cobrança já foi paga ou quando for registrar baixa manual."
                >
                  <input
                    type="date"
                    value={formulario.data_pagamento}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "data_pagamento",
                        e.target.value
                      )
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Status"
                  ajuda="Situação atual da cobrança: pendente, paga, atrasada ou cancelada."
                >
                  <select
                    value={formulario.status}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "status",
                        e.target.value as StatusCobranca
                      )
                    }
                    className="input-financeiro"
                  >
                    <option>Pago</option>
                    <option>Pendente</option>
                    <option>Atrasado</option>
                    <option>Cancelado</option>
                  </select>
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Forma de pagamento"
                  ajuda="Método combinado ou usado para pagamento desta cobrança."
                >
                  <select
                    value={formulario.forma_pagamento}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "forma_pagamento",
                        e.target.value
                      )
                    }
                    className="input-financeiro"
                  >
                    <option>Pix</option>
                    <option>Cartão</option>
                    <option>Boleto</option>
                    <option>Dinheiro</option>
                    <option>Transferência</option>
                  </select>
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Descrição"
                  ajuda="Explique o que está sendo cobrado. Ex: mensalidade, pacote anual, módulo extra ou taxa."
                >
                  <textarea
                    placeholder="Ex: Parcela referente à mentoria anual CEO Club."
                    value={formulario.descricao}
                    onChange={(e) =>
                      atualizarCampoFormulario("descricao", e.target.value)
                    }
                    className="input-financeiro min-h-[110px]"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Observações internas"
                  ajuda="Anotações para a equipe. Ex: desconto, negociação, comprovante ou mudança de vencimento."
                >
                  <textarea
                    placeholder="Ex: Negociado desconto, aguardando comprovante..."
                    value={formulario.observacao}
                    onChange={(e) =>
                      atualizarCampoFormulario("observacao", e.target.value)
                    }
                    className="input-financeiro min-h-[110px]"
                  />
                </CampoFinanceiro>
              </div>

              {!editandoId && (
                <div className="mt-6 rounded-[26px] border border-slate-200 bg-[#f9fafb] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        Prévia das parcelas
                      </p>

                      <h3 className="mt-1 text-xl font-black text-[#08163F]">
                        Confira os vencimentos antes de salvar
                      </h3>

                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                        A prévia mostra quantas cobranças serão criadas, o valor
                        de cada parcela e os vencimentos mensais.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={gerarPreviewParcelas}
                      className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white transition hover:brightness-110"
                    >
                      Gerar prévia
                    </button>
                  </div>

                  {mostrarPreviewParcelas && previewParcelas.length > 0 && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="grid grid-cols-[0.5fr_1fr_1fr_0.8fr] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-3 text-xs font-black uppercase tracking-[0.12em] text-white">
                        <span>Parcela</span>
                        <span>Vencimento</span>
                        <span>Valor</span>
                        <span>Status</span>
                      </div>

                      <div className="max-h-[260px] divide-y divide-slate-100 overflow-y-auto">
                        {previewParcelas.map((parcela) => (
                          <div
                            key={`${parcela.numero}-${parcela.vencimento}`}
                            className="grid grid-cols-[0.5fr_1fr_1fr_0.8fr] items-center p-3 text-sm"
                          >
                            <span className="font-black text-[#08163F]">
                              {parcela.numero}/{parcela.total}
                            </span>

                            <span className="font-semibold text-slate-600">
                              {formatarData(parcela.vencimento)}
                            </span>

                            <span className="font-black text-[#08163F]">
                              {formatarMoeda(parcela.valor)}
                            </span>

                            <span>
                              <StatusBadge status={parcela.status} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mostrarPreviewParcelas && previewParcelas.length === 0 && (
                    <p className="mt-4 rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-700">
                      Preencha os dados principais para visualizar as parcelas.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar lançamento"}
                </button>

                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-[#0B1D59] transition hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </form>
          )}

          <section className="overflow-hidden rounded-[30px] border border-white/50 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
            <div className="grid grid-cols-[1.2fr_1fr_0.6fr_0.6fr_0.7fr_0.6fr] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 font-semibold text-white">
              <span>Mentorado</span>
              <span>Cobrança</span>
              <span>Parcela</span>
              <span>Valor</span>
              <span>Vencimento</span>
              <span>Status</span>
            </div>

            {cobrancasFiltradas.length === 0 ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cobrancasFiltradas.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCobrancaSelecionada(item)}
                    className="grid w-full grid-cols-[1.2fr_1fr_0.6fr_0.6fr_0.7fr_0.6fr] items-center p-4 text-left text-sm transition hover:bg-slate-50"
                  >
                    <span>
                      <strong className="block">{item.mentoradoNome}</strong>
                      <small className="text-xs text-slate-400">
                        {item.mentoradoCodigo || "—"} · {item.mentoradoEmail}
                      </small>
                    </span>

                    <span>{item.titulo}</span>
                    <span>
                      {item.parcela_atual}/{item.quantidade_parcelas}
                    </span>
                    <span>{formatarMoeda(Number(item.valor_parcela))}</span>
                    <span>{formatarData(item.data_vencimento)}</span>
                    <span>
                      <StatusBadge status={item.status} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {cobrancaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[34px] bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes do lançamento
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {cobrancaSelecionada.titulo}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-blue-100">
                    {cobrancaSelecionada.mentoradoCodigo || "—"} ·{" "}
                    {cobrancaSelecionada.mentoradoNome}
                  </p>
                </div>

                <button
                  onClick={() => setCobrancaSelecionada(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge status={cobrancaSelecionada.status} />
              </div>
            </div>

            <div className="grid gap-4 p-7 md:grid-cols-2">
              <InfoBox
                label="Valor da parcela"
                value={formatarMoeda(Number(cobrancaSelecionada.valor_parcela))}
              />

              <InfoBox
                label="Valor total"
                value={formatarMoeda(Number(cobrancaSelecionada.valor_total))}
              />

              <InfoBox
                label="Parcela"
                value={`${cobrancaSelecionada.parcela_atual}/${cobrancaSelecionada.quantidade_parcelas}`}
              />

              <InfoBox
                label="Vencimento"
                value={formatarData(cobrancaSelecionada.data_vencimento)}
              />

              <InfoBox
                label="Pagamento"
                value={
                  cobrancaSelecionada.data_pagamento
                    ? formatarData(cobrancaSelecionada.data_pagamento)
                    : "—"
                }
              />

              <InfoBox
                label="Forma de pagamento"
                value={cobrancaSelecionada.forma_pagamento || "—"}
              />

              <div className="rounded-2xl bg-[#f9fafb] p-5 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Observações
                </p>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  {cobrancaSelecionada.observacao ||
                    cobrancaSelecionada.descricao ||
                    "Nenhuma observação adicionada."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  onClick={() => editarCobranca(cobrancaSelecionada)}
                  className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Editar
                </button>

                <button
                  onClick={() => atualizarStatus(cobrancaSelecionada.id, "Pago")}
                  className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  Marcar como pago
                </button>

                <button
                  onClick={() =>
                    atualizarStatus(cobrancaSelecionada.id, "Atrasado")
                  }
                  className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-black text-red-600 transition hover:bg-red-100"
                >
                  Marcar atraso
                </button>

                <button
                  onClick={() => excluirCobranca(cobrancaSelecionada.id)}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-financeiro {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0.85rem 1rem;
          color: #08163f;
          font-weight: 700;
          outline: none;
          transition: 0.2s ease;
        }

        .input-financeiro::placeholder {
          color: #94a3b8;
        }

        .input-financeiro:focus {
          border-color: #12317c;
          box-shadow: 0 0 0 4px rgba(18, 49, 124, 0.1);
        }
      `}</style>
    </main>
  );
}

function CampoFinanceiro({
  label,
  ajuda,
  children,
}: {
  label: string;
  ajuda: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#08163F]">{label}</span>

      <p className="mt-1 min-h-[38px] text-xs font-semibold leading-5 text-slate-500">
        {ajuda}
      </p>

      <div className="mt-2">{children}</div>
    </label>
  );
}

function ResumoCard({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm ${
        destaque
          ? "bg-[#071A55] text-white"
          : alerta
          ? "bg-red-50 text-red-700"
          : "bg-white/85 text-[#08163F]"
      }`}
    >
      <h2
        className={`text-sm font-black ${
          destaque ? "text-blue-100" : alerta ? "text-red-600" : "text-slate-500"
        }`}
      >
        {titulo}
      </h2>

      <p className="mt-3 text-3xl font-black">{valor}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Pago: "bg-emerald-100 text-emerald-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Atrasado: "bg-red-100 text-red-700",
    Cancelado: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
        estilos[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-[#08163F]">{value}</p>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarMoedaInput(valor: string) {
  const apenasNumeros = valor.replace(/\D/g, "");

  if (!apenasNumeros) return "";

  const numero = Number(apenasNumeros) / 100;

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

function moedaInputParaNumero(valor: string) {
  if (!valor) return 0;

  const numeroNormalizado = valor.replace(/\./g, "").replace(",", ".");

  return Number(numeroNormalizado) || 0;
}

function numeroParaMoedaInput(valor: number | string | null | undefined) {
  const numero = Number(valor || 0);

  if (!numero) return "";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}