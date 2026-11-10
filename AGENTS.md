<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Preparação/Anúncios module: pending status is computed on read in `src/lib/preparacao-anuncios.ts` from the latest import of each base (`prep_base_linhas`, replaced per base on import), so config changes apply instantly without recalculation jobs.
- Preparação dashboard aggregates share a pure calculation module; completed stock imports upsert one snapshot per São Paulo date with frozen dimensional totals, while a daily database job and write trigger enforce retention. Why: live rules remain immediate and historical filters do not rewrite past totals.
- Module data access is enforced in RLS via `public.has_modulo(<module-id>)` (admins pass); Compras rows via `can_access_chamado` (creator, assignee, central_compras, admin). Why: users only see modules liberated to them.
- Stock Matrix vehicle lists use `estoque-filtros.ts` for filtering; each filter shows Excel-style options from vehicles passing the other filters plus current selections, then the generic ordering helper without FIPE grouping. Why: users asked for Excel-like filters.
- Exceptional Stock Matrix repricing uses `estoque-reprocessamento.ts` to rebuild from configured base rules while retaining the original price for audit; the ordinary pricing engine's same-band freeze remains unchanged.
