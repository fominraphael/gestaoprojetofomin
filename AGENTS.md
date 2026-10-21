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
