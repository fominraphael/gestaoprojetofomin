// Server function que faz download de um PDF remoto (Laudo Cautelar por link)
// bypassando CORS do navegador. Retorna base64.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fetchRemotePdf = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ url: z.string().url() }).parse(data))
  .handler(async ({ data }) => {
    const res = await fetch(data.url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(`Falha ao baixar laudo remoto (${res.status})`);
    }
    const buf = await res.arrayBuffer();
    // Retorna como base64 para atravessar a fronteira RPC de forma serializável
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return { base64: btoa(binary), contentType: res.headers.get("content-type") ?? "application/pdf" };
  });
