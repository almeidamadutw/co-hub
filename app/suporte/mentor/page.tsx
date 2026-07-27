import { permanentRedirect } from "next/navigation";

export default function SuporteMentorRedirectPage() {
  permanentRedirect("/suporte/usuarios?perfil=mentor");
}
