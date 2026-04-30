"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type Parcela = {
  id: string;
  descricao: string;
  vencimento: string;
  valor: number;
  status: "Pago" | "Pendente" | "Atrasado";
};

const parcelas: Parcela[] = [
  {
    id: "1",
    descricao: "Mensalidade CEO Club",
    vencimento: "05/05/2026",
    valor: 1200,
    status: "Pendente",
  },
  {
    id: "2",
    descricao: "Mensalidade CEO Club",
    vencimento: "05/04/2026",
    valor: 1200,
    status: "Pago",
  },
  {
    id: "3",
    descricao: "Material complementar",
    vencimento: "20/04/2026",
    valor: 250,
    status: "Pago",
  },
];

export default function FinanceiroMentoradoPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);

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

  const resumo = useMemo(() => {
    const totalPago = parcelas
      .filter((parcela) => parcela.status === "Pago")
      .reduce((acc, parcela) => acc + parcela.valor, 0);

    const totalPendente = parcelas
      .filter((parcela) => parcela.status !== "Pago")
      .reduce((acc, parcela) => acc + parcela.valor, 0);

    const pendentes = parcelas.filter(
      (parcela) => parcela.status === "Pendente"
    ).length;

    return {
      totalPago,
      totalPendente,
      pendentes,
    };
  }, []);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando financeiro...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <aside className="hidden min-h-screen w-[310px] flex-col border-r border-black/5 bg-white p-5 shadow-[10px_0_40px_rgba(15,23,42,0.04)] lg:flex">
        <LogoBox />

        <nav className="space-y-2">
          <MenuItem label="Início" onClick={() => router.push("/mentorado/dashboard")} />
          <MenuItem label="Minha agenda" onClick={() => router.push("/mentorado/agenda")} />
          <MenuItem label="Meus módulos" onClick={() => router.push("/mentorado/modulos")} />
          <MenuItem label="Praticar" onClick={() => router.push("/mentorado/praticar")} />
          <MenuItem label="Meu progresso" onClick={() => router.push("/mentorado/progresso")} />
          <MenuItem ativo label="Financeiro" onClick={() => router.push("/mentorado/financeiro")} />
          <MenuItem label="Minha conta" onClick={() => router.push("/mentorado/conta")} />
        </nav>

        <UserBox nome={usuario.nome} onSair={sair} />
      </aside>

      <section className="flex-1 overflow-hidden">
        <Header
          titulo="Financeiro"
          subtitulo="Área do mentorado"
          onVoltar={() => router.push("/mentorado/dashboard")}
          onSuporte={() => router.push("/mentorado/suporte")}
          onSair={sair}
        />

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-6 py-10 md:px-8">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
              Financeiro CEO Club
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Seus pagamentos e mensalidades
            </h1>

            <p className="mt-3 max-w-2xl text-[#D9DEE7]">
              Acompanhe parcelas, vencimentos, status de pagamento e próximos
              compromissos financeiros.
            </p>
          </section>

          <section className="mb-8 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Pago" valor={formatarMoeda(resumo.totalPago)} destaque />
            <KPI titulo="Pendente" valor={formatarMoeda(resumo.totalPendente)} />
            <KPI titulo="Parcelas pendentes" valor={resumo.pendentes} />
            <KPI titulo="Próximo vencimento" valor="05/05" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Card titulo="Histórico financeiro">
              <div className="space-y-4">
                {parcelas.map((parcela) => (
                  <div
                    key={parcela.id}
                    className="flex flex-col gap-4 rounded-2xl bg-[#f9fafb] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-black text-[#08163F]">
                        {parcela.descricao}
                      </p>

                      <p className="mt-1 text-sm font-bold text-gray-500">
                        Vencimento: {parcela.vencimento}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="font-black text-[#08163F]">
                        {formatarMoeda(parcela.valor)}
                      </p>

                      <StatusBadge status={parcela.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <aside className="space-y-6">
              <Card titulo="Próxima cobrança">
                <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                  <p className="text-sm font-bold text-[#C9CED6]">
                    Mensalidade CEO Club
                  </p>

                  <p className="mt-3 text-4xl font-black">
                    {formatarMoeda(1200)}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                    Vencimento em 05/05/2026
                  </p>

                  <button className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-[#08163F] transition hover:brightness-95">
                    Ver detalhes →
                  </button>
                </div>
              </Card>

              <Card titulo="Observação">
                <p className="text-sm font-semibold leading-relaxed text-gray-500">
                  Esta é uma tela demonstrativa. Na versão real, os pagamentos
                  podem ser integrados com o sistema financeiro da mentoria.
                </p>
              </Card>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}

function LogoBox() {
  return (
    <div className="mb-8 flex items-center gap-3 rounded-[24px] bg-[#f8fafc] p-3">
      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#08163F] p-1">
        <img src="/images/logo.jpeg" alt="CEO Club" className="h-full w-full rounded-xl object-cover" />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Curso</p>
        <h1 className="text-lg font-black text-[#08163F]">CEO Club</h1>
      </div>
    </div>
  );
}

function Header({
  titulo,
  subtitulo,
  onVoltar,
  onSuporte,
  onSair,
}: {
  titulo: string;
  subtitulo: string;
  onVoltar: () => void;
  onSuporte: () => void;
  onSair: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-6 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onVoltar}
          className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
        >
          ← Voltar
        </button>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
            {subtitulo}
          </p>
          <h1 className="text-xl font-black">{titulo}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSuporte}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Suporte
        </button>

        <button
          onClick={onSair}
          className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

function UserBox({ nome, onSair }: { nome: string; onSair: () => void }) {
  return (
    <div className="mt-auto rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9CED6]">
        Mentorado
      </p>
      <p className="mt-2 font-black">{nome}</p>

      <button
        onClick={onSair}
        className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] transition hover:brightness-95"
      >
        Sair
      </button>
    </div>
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
      <p className={`text-sm font-bold ${destaque ? "text-[#C9CED6]" : "text-gray-500"}`}>
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

      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Parcela["status"] }) {
  const classes = {
    Pago: "bg-green-100 text-green-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Atrasado: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}