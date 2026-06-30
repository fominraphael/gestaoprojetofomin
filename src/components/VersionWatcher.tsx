import { useEffect, useRef } from "react";

/**
 * Polls /version.json (gerado no build) e força reload quando o hash muda.
 * Combinado com os hashes que o Vite já adiciona aos assets, garante que o
 * usuário nunca fique preso a uma versão antiga após um novo deploy.
 */
export function VersionWatcher() {
  const currentVersion = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (!data.version || cancelled) return;

        if (currentVersion.current === null) {
          currentVersion.current = data.version;
          return;
        }

        if (data.version !== currentVersion.current) {
          // Nova versão publicada — força reload limpo.
          window.location.reload();
        }
      } catch {
        // silencioso: em dev o arquivo pode não existir
      }
    };

    check();
    const id = window.setInterval(check, 60_000); // 1min
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
