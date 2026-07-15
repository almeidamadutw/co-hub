const PERSISTENCIA_LOCAL_KEY = "ceoclub_persistir_sessao";
const PERSISTENCIA_ABA_KEY = "ceoclub_sessao_da_aba";

function navegadorDisponivel() {
  return typeof window !== "undefined";
}

export function definirPersistenciaSessao(manterConectado: boolean) {
  if (!navegadorDisponivel()) return;

  if (manterConectado) {
    localStorage.setItem(PERSISTENCIA_LOCAL_KEY, "true");
    sessionStorage.removeItem(PERSISTENCIA_ABA_KEY);
    return;
  }

  localStorage.removeItem(PERSISTENCIA_LOCAL_KEY);
  sessionStorage.setItem(PERSISTENCIA_ABA_KEY, "true");
}

export function sessaoDevePersistir() {
  if (!navegadorDisponivel()) return true;

  if (sessionStorage.getItem(PERSISTENCIA_ABA_KEY) === "true") {
    return false;
  }

  return localStorage.getItem(PERSISTENCIA_LOCAL_KEY) !== "false";
}

export const supabaseAuthStorage = {
  getItem(key: string) {
    if (!navegadorDisponivel()) return null;

    const armazenamentoPrincipal = sessaoDevePersistir()
      ? localStorage
      : sessionStorage;
    const armazenamentoAlternativo = sessaoDevePersistir()
      ? sessionStorage
      : localStorage;

    return (
      armazenamentoPrincipal.getItem(key) ??
      armazenamentoAlternativo.getItem(key)
    );
  },

  setItem(key: string, value: string) {
    if (!navegadorDisponivel()) return;

    const armazenamentoPrincipal = sessaoDevePersistir()
      ? localStorage
      : sessionStorage;
    const armazenamentoAlternativo = sessaoDevePersistir()
      ? sessionStorage
      : localStorage;

    armazenamentoAlternativo.removeItem(key);
    armazenamentoPrincipal.setItem(key, value);
  },

  removeItem(key: string) {
    if (!navegadorDisponivel()) return;

    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
