"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "../login/entrada.module.css";

export default function AcessoPorCodigo() {
  const [usarCodigo, setUsarCodigo] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const campos = Object.fromEntries(new FormData(evento.currentTarget));
    setErro("");
    setMensagem("");
    if (usarCodigo && campos.senha !== campos.confirmacao) {
      setErro("As senhas devem ser iguais.");
      return;
    }
    setEnviando(true);
    try {
      const rota = usarCodigo ? "redefinicao-senha" : "recuperar-senha";
      const resposta = await fetch(`/api/auth/${rota}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: campos.login, codigo: campos.codigo, senha: campos.senha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Tente novamente.");
      setMensagem(dados.mensagem);
      if (usarCodigo) setConcluido(true);
      else setUsarCodigo(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.recovery}>
      <section>
        <p className={styles.eyebrow}>CEO Club</p>
        <h1 className={styles.formTitle}>{concluido ? "Acesso liberado" : usarCodigo ? "Defina sua senha" : "Código de acesso"}</h1>
        {!concluido && <form onSubmit={enviar} className={styles.form}>
          <p>{usarCodigo ? "Use o código entregue pelo suporte para ativar sua conta ou trocar a senha." : "Informe seu login para pedir um código ao suporte."}</p>
          <label htmlFor="login">Login</label>
          <input id="login" name="login" autoComplete="username" autoCapitalize="none" required placeholder="nome@ceoclubmentoria" />
          {usarCodigo && <>
            <label htmlFor="codigo">Código do suporte</label>
            <input id="codigo" name="codigo" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,10}" />
            <label htmlFor="senha">Nova senha</label>
            <input id="senha" type="password" name="senha" required autoComplete="new-password" minLength={8} maxLength={128} placeholder="Pelo menos 8 caracteres, com letra e número" />
            <label htmlFor="confirmacao">Confirme a senha</label>
            <input id="confirmacao" name="confirmacao" type="password" required autoComplete="new-password" />
          </>}
          <button className={styles.action} disabled={enviando}>{enviando ? "Aguarde…" : usarCodigo ? "Salvar senha" : "Solicitar código ao suporte"}</button>
          <button type="button" disabled={enviando} className="cursor-pointer py-2 underline" onClick={() => { setUsarCodigo(!usarCodigo); setMensagem(""); setErro(""); }}>
            {usarCodigo ? "Solicitar outro código" : "Já tenho um código"}
          </button>
        </form>}
        {mensagem && <p role="status" className="my-4">{mensagem}</p>}
        {erro && <p role="alert" className={styles.error}>{erro}</p>}
        <Link href="/login" className="mt-4 inline-block underline">Voltar ao login</Link>
      </section>
    </main>
  );
}
