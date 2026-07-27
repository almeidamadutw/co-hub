import { permanentRedirect } from "next/navigation";

export default function SuporteMentoresRedirectPage() {
  permanentRedirect("/suporte/usuarios?perfil=mentor");
}
