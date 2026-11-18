// O identificador público preserva o mesmo usuário técnico no Supabase Auth.
const dominio = "@ceoclubmentoria";
const sufixoInterno = ".com.br";

export function emailDoLogin(login: string) {
  const valor = login.trim().toLowerCase();
  if (!/^[a-z0-9._+%-]{1,64}@ceoclubmentoria$/.test(valor)) return "";
  return valor + sufixoInterno;
}

export function loginVisivel(email: string | null | undefined) {
  return (email ?? "").toLowerCase().replace(dominio + sufixoInterno, dominio);
}
