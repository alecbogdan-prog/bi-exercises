# Power BI Exercises

Interactive Power BI / DAX exercises that run entirely in the browser, with instant answer checking.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + checker tests (vitest)
npm run build    # production build in dist/ (deploy to Vercel; vercel.json handles SPA routes)
```

## How it works

- `src/engine/` is a small in-memory BI engine:
  - `parser.ts`: DAX tokenizer and parser (subset of DAX).
  - `engine.ts`: evaluator with filter context, row context, context transition, relationships,
    CALCULATE semantics (filter override, ALL/REMOVEFILTERS, KEEPFILTERS), iterators and time intelligence.
  - `visual.ts`: turns a visual definition (wells + filters) into a result grid.
  - `dataset.ts`: deterministic fictional sales model (Sales, Product, Customer, Date).
- `src/exercises/`: exercise definitions (`exercises.ts`) and the automatic checker (`checker.ts`).
  Report exercises compare the learner's visual output with the target; DAX exercises evaluate the
  learner's measure in several filter contexts and compare with the reference solution.
- `src/components/Workspace.tsx`: report editor (fields pane, visualizations pane, filters, formula bar, data view).

## Adding an exercise

Add an object to `EXERCISES` in `src/exercises/exercises.ts` with a starter visual, a solution and a
check. `src/exercises/checker.test.ts` automatically verifies that every solution passes and every starter fails.

Not affiliated with Microsoft. Sample data is fictional.
