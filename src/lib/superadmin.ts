/**
 * Configuração do superusuário.
 * O username é lido de variável de ambiente para não ficar hardcoded no código-fonte.
 * Server-side: use process.env.SUPERADMIN_USERNAME
 * Client-side: use import.meta.env.VITE_SUPERADMIN_USERNAME
 */
export function getSuperUsername(): string {
  if (typeof window === "undefined") {
    return process.env.SUPERADMIN_USERNAME || "";
  }
  return import.meta.env.VITE_SUPERADMIN_USERNAME || "";
}

export function isSuperUser(username: string | null | undefined): boolean {
  const superUser = getSuperUsername();
  if (!superUser) return false;
  return (username ?? "").toLowerCase() === superUser.toLowerCase();
}
