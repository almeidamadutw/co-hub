"use client";

import { useState } from "react";
import { salvarVideoDaAula } from "@/utils/aulasVideos";

type UploadVideoModuloProps = {
  moduloId: string;
  aulaId: string;
  videoUidAtual?: string | null;
  onVideoSalvo?: (videoUid: string) => void;
};

export default function UploadVideoModulo({
  moduloId,
  aulaId,
  videoUidAtual,
  onVideoSalvo,
}: UploadVideoModuloProps) {
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState("");
  const [videoUid, setVideoUid] = useState(videoUidAtual ?? "");

  async function enviarVideo(file: File) {
    setErro("");
    setProgresso(0);
    setEnviando(true);

    try {
      const respostaUploadUrl = await fetch("/api/cloudflare/stream/upload-url", {
        method: "POST",
      });

      const jsonUploadUrl = await respostaUploadUrl.json();

      if (!respostaUploadUrl.ok) {
        throw new Error(
          jsonUploadUrl.error ?? "Não foi possível iniciar o upload."
        );
      }

      const formData = new FormData();
      formData.append("file", file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", jsonUploadUrl.uploadURL);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;

          const percentual = Math.round((event.loaded / event.total) * 100);
          setProgresso(percentual);
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Falha ao enviar vídeo para a Cloudflare."));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Erro de conexão durante o upload."));
        };

        xhr.send(formData);
      });

      salvarVideoDaAula({
        moduloId,
        aulaId,
        videoUid: jsonUploadUrl.videoUid,
      });

      setVideoUid(jsonUploadUrl.videoUid);
      onVideoSalvo?.(jsonUploadUrl.videoUid);
      setProgresso(100);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o vídeo."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Vídeo da aula
          </p>

          <p className="mt-1 text-sm font-bold text-[#08163F]">
            {videoUid ? "Vídeo vinculado a esta aula" : "Nenhum vídeo vinculado"}
          </p>
        </div>

        {videoUid && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            Enviado
          </span>
        )}
      </div>

      <label className="mt-4 block">
        <input
          type="file"
          accept="video/*"
          disabled={enviando}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) enviarVideo(file);
          }}
          className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#08163F]"
        />
      </label>

      {enviando && (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
            <span>Enviando</span>
            <span>{progresso}%</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#08163F]"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {erro && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}