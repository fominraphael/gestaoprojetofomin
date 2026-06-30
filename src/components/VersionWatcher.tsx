import { useEffect, useRef } from "react";

/**
 * Cache busting client-side:
 * 1) O Vite já gera assets com hash (main.[hash].js) → mudanças de código
 *    invalidam o cache automaticamente.
 * 2) Quando o navegador tem um index.html antigo em cache apontando para um
 *    chunk que não existe mais (deploy novo), o dynamic import falha com
 *    "Failed to fetch dynamically imported module". Capturamos esse erro e
 *    forçamos um reload limpo — o usuário nunca precisa limpar cache manualmente.
 */
export function VersionWatcher() {
  const reloaded = useRef(false);

  useEffect(() => {
    const isChunkLoadError = (msg: string) =>
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Loading chunk \d+ failed/i.test(msg) ||
      /Importing a module script failed/i.test(msg) ||
      /ChunkLoadError/i.test(msg);

    const forceReload = () => {
      if (reloaded.current) return;
      reloaded.current = true;
      // ?v= quebra cache do index.html em CDNs intermediários
      const url = new URL(window.location.href);
      url.searchParams.set("v", Date.now().toString());
      window.location.replace(url.toString());
    };

    const onError = (e: ErrorEvent) => {
      if (isChunkLoadError(e.message || "")) forceReload();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason || "");
      if (isChunkLoadError(msg)) forceReload();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
