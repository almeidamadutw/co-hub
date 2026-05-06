import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json(
      { error: "Cloudflare Stream não configurado." },
      { status: 500 }
    );
  }

  const resposta = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 60 * 60 * 4,
        requireSignedURLs: false,
      }),
    }
  );

  const json = await resposta.json();

  if (!resposta.ok || !json.success) {
    return NextResponse.json(
      {
        error: "Não foi possível criar a URL de upload.",
        details: json.errors ?? json,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    uploadURL: json.result.uploadURL,
    videoUid: json.result.uid,
  });
}