import { useRouter, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function ModuleErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "module_route_error" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-card border border-border p-8 rounded-2xl shadow-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 text-destructive mb-5">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Não foi possível carregar esta tela
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Ocorreu um erro inesperado neste módulo."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Voltar ao Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
