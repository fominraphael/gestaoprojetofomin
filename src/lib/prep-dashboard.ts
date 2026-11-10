import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { carregarVeiculosCalculados } from "./preparacao-anuncios";
import { agregarDashboard, inicioHistorico, type DimensaoDashboard } from "./prep-dashboard-calculo";
import type { Json } from "@/integrations/supabase/types";

export async function carregarCadastroDashboard() {
  const [lojas, gestores] = await Promise.all([
    supabase.from("prep_lojas").select("loja, regional").order("loja"),
    supabase.from("prep_gestor_regional").select("id, loja, gestor").order("gestor").order("loja"),
  ]);
  if (lojas.error) throw lojas.error;
  if (gestores.error) throw gestores.error;
  return { lojas: lojas.data ?? [], gestores: gestores.data ?? [] };
}
/** Stored dimensions preserve the filters and assignments that applied on the capture day. */
function lerDimensoes(json: Json): DimensaoDashboard[] {
  if (!Array.isArray(json)) return [];
  return json.filter((l): l is Json & DimensaoDashboard => typeof l === "object" && l !== null && !Array.isArray(l) && typeof l.loja === "string" && typeof l.regional === "string" && typeof l.gestor === "string" && typeof l.pendentes === "number") as DimensaoDashboard[];
}
export const dashboardQuery = queryOptions({
  queryKey: ["prep", "dashboard"], staleTime: 60_000,
  queryFn: async () => {
    const [veiculos, cadastro, historico] = await Promise.all([
      carregarVeiculosCalculados(true), carregarCadastroDashboard(),
      supabase.from("prep_dashboard_historico_diario").select("data_referencia, dimensoes").gte("data_referencia", inicioHistorico(3)).order("data_referencia"),
    ]);
    if (historico.error) throw historico.error;
    return { dimensoes: agregarDashboard(veiculos, cadastro.lojas, cadastro.gestores),
      historico: (historico.data ?? []).map(h => ({ data: h.data_referencia, dimensoes: lerDimensoes(h.dimensoes) })) };
  },
});