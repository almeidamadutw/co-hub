import { permanentRedirect } from "next/navigation";

export default function SuporteMentoradosRedirectPage() {
  permanentRedirect("/suporte/usuarios?perfil=mentorado");
}
