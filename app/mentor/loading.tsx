import { Suspense } from "react";
import PageLoading from "@/components/PageLoading";
import RouteLoading from "@/components/RouteLoading";

export default function Loading() {
  return (
    <Suspense fallback={<PageLoading pagina="página da mentora" />}>
      <RouteLoading />
    </Suspense>
  );
}
