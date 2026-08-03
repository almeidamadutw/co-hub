import PageLoading from "@/components/PageLoading";

export default function MentoradoLoading({
  mensagem = "Carregando área do mentorado...",
}: {
  mensagem?: string;
}) {
  return <PageLoading mensagem={mensagem} />;
}
