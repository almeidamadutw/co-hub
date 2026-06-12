"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

type ResetSenhaMentoradoCardProps = {
  mentoradoId: string;
  mentoradoNome: string;
  mentoradoEmail: string;
};

export default function ResetSenhaMentoradoCard({
  mentoradoId,
  mentoradoNome,
  mentoradoEmail,
}: ResetSenhaMentoradoCardProps) {
  const [resetando, setResetando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function resetarSenhaMentorado() {
    if (!mentoradoId || !mentoradoEmail) {
      setErro("Este mentorado não possui e-mail cadastrado.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja resetar o controle de troca de senha e enviar um novo link para ${mentoradoNome}?`
    );

    if (!confirmar) return;

    try {
      setResetando(true);
      setMensagem("");
      setErro("");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          trocas_senha: 0,
          ultima_troca_senha: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mentoradoId)
        .eq("role", "mentorado");

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        mentoradoEmail.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        }
      );

      if (resetError) {
        throw new Error(resetError.message);
      }

      setMensagem(
        "Controle de troca de senha resetado e link de redefinição enviado para o e-mail do mentorado."
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível resetar a senha deste mentorado."
      );
    } finally {
      setResetando(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
        <h3 className="text-xl font-black text-[#050816] sm:text-2xl">
          Segurança da conta
        </h3>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-2xl bg-[#f9fafb] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Reset de senha
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
            Use este botão quando a Dra. ou o suporte precisar liberar novamente
            a troca automática de senha para este mentorado. O sistema vai zerar
            o controle de primeira troca e enviar um novo link por e-mail.
          </p>

          <div className="mt-4 rounded-2xl border border-[#D9DEE7] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              Mentorado
            </p>

            <p className="mt-1 break-words text-sm font-black text-[#08163F]">
              {mentoradoNome}
            </p>

            <p className="mt-1 break-all text-xs font-bold text-gray-500">
              {mentoradoEmail}
            </p>
          </div>

          {mensagem && (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
              {mensagem}
            </div>
          )}

          {erro && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          <button
            type="button"
            onClick={resetarSenhaMentorado}
            disabled={resetando}
            className="mt-5 w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetando ? "Enviando link..." : "Resetar e enviar link de senha"}
          </button>
        </div>
      </div>
    </section>
  );
}