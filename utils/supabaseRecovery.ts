import { createClient } from "@supabase/supabase-js";

const STORAGE_KEY = "ceoclub-recuperacao-senha:v1";
const RECOVERY_MARKER_KEY = "ceoclub_recuperacao_validada:v1";

export type MarcadorRecuperacao = {
  userId: string;
  solicitacaoId: string;
};

let clienteRecuperacao: ReturnType<typeof createClient> | null = null;

function config() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("A recuperação de senha não está configurada.");
  }

  return { supabaseUrl, supabaseKey };
}

const sessionStorageAdapter = {
  getItem(key: string) {
    if (typeof window === "undefined") return null;

    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem(key, value);
    } catch {
      // A sessão continua válida nesta aba mesmo quando o storage é negado.
    }
  },
  removeItem(key: string) {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.removeItem(key);
    } catch {
      // Nada a limpar quando o navegador bloqueia o storage.
    }
  },
};

export function criarClienteRecuperacaoSenha() {
  if (clienteRecuperacao) return clienteRecuperacao;

  const { supabaseUrl, supabaseKey } = config();

  clienteRecuperacao = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: STORAGE_KEY,
      storage: sessionStorageAdapter,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
    },
  });

  return clienteRecuperacao;
}

export function salvarMarcadorRecuperacao(marcador: MarcadorRecuperacao) {
  sessionStorageAdapter.setItem(
    RECOVERY_MARKER_KEY,
    JSON.stringify(marcador)
  );
}

export function lerMarcadorRecuperacao(): MarcadorRecuperacao | null {
  const valor = sessionStorageAdapter.getItem(RECOVERY_MARKER_KEY);

  if (!valor) return null;

  try {
    const marcador = JSON.parse(valor) as Partial<MarcadorRecuperacao>;

    if (
      typeof marcador.userId !== "string" ||
      typeof marcador.solicitacaoId !== "string"
    ) {
      return null;
    }

    return {
      userId: marcador.userId,
      solicitacaoId: marcador.solicitacaoId,
    };
  } catch {
    return null;
  }
}

export function limparMarcadorRecuperacao() {
  sessionStorageAdapter.removeItem(RECOVERY_MARKER_KEY);
}
