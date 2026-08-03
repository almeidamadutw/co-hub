import { Suspense } from "react";
import PageLoading from "@/components/PageLoading";
import RouteLoading from "@/components/RouteLoading";

export default function Loading() {
  return (
    <Suspense fallback={<PageLoading pagina="página do suporte" />}>
      <RouteLoading />
    </Suspense>
  );
}
