import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_PREFIX = "storage://";
const PUBLIC_OBJECT_MARKER = "/storage/v1/object/public/";
const AUTHENTICATED_OBJECT_MARKER = "/storage/v1/object/authenticated/";

export const CEO_STORAGE_BUCKETS = [
  "ceo-club-biblioteca",
  "ceo-club-materiais",
] as const;

type CeoStorageBucket = (typeof CEO_STORAGE_BUCKETS)[number];

export type ReferenciaStorage = {
  bucket: CeoStorageBucket;
  path: string;
};

function decodificarCaminho(path: string) {
  const semQuery = path.split(/[?#]/, 1)[0].replace(/^\/+/, "");

  try {
    return decodeURIComponent(semQuery);
  } catch {
    return semQuery;
  }
}

function bucketPermitido(bucket: string): bucket is CeoStorageBucket {
  return CEO_STORAGE_BUCKETS.includes(bucket as CeoStorageBucket);
}

function separarBucketECaminho(valor: string): ReferenciaStorage | null {
  const [bucket, ...partesPath] = valor.replace(/^\/+/, "").split("/");
  const path = decodificarCaminho(partesPath.join("/"));

  if (!bucketPermitido(bucket) || !path) return null;

  return { bucket, path };
}

export function extrairReferenciaStorage(
  valorOriginal?: string | null
): ReferenciaStorage | null {
  const valor = valorOriginal?.trim();

  if (!valor) return null;

  if (valor.startsWith(STORAGE_PREFIX)) {
    return separarBucketECaminho(valor.slice(STORAGE_PREFIX.length));
  }

  for (const marcador of [PUBLIC_OBJECT_MARKER, AUTHENTICATED_OBJECT_MARKER]) {
    const indice = valor.indexOf(marcador);

    if (indice >= 0) {
      return separarBucketECaminho(valor.slice(indice + marcador.length));
    }
  }

  return null;
}

export function criarReferenciaStorage(bucket: CeoStorageBucket, path: string) {
  const pathLimpo = decodificarCaminho(path);

  if (!pathLimpo) {
    throw new Error("Caminho do arquivo no Storage não informado.");
  }

  return `${STORAGE_PREFIX}${bucket}/${pathLimpo}`;
}

export async function assinarUrlStorage(
  cliente: Pick<SupabaseClient, "storage">,
  valorOriginal: string,
  expiraEmSegundos = 60 * 60
) {
  const referencia = extrairReferenciaStorage(valorOriginal);

  if (!referencia) return valorOriginal;

  const { data, error } = await cliente.storage
    .from(referencia.bucket)
    .createSignedUrl(referencia.path, expiraEmSegundos);

  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message || "Não foi possível autorizar o acesso ao arquivo."
    );
  }

  return data.signedUrl;
}
