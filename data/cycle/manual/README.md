# Manual sources for the cycle engine

Some sources block automated downloads. Save each month's release here, then run `npx tsx scripts/run-cycle-engine.ts`. The engine page shows how current each file is.

## Format

One CSV per series, named by its key, with a header row and one row per month:

```csv
month,value
2026-08,45750
2026-09,47420
```

- `month` is `YYYY-MM`.
- `value` is a number. Thousands separators are fine (`45,750` or `"45,750"`).
- Lines starting with `#` are ignored. A row that can't be read is reported, not guessed.
- Keep the whole history in the file, oldest first or in any order. The finder needs several years to test a series against past cycles.

## Files

| File | Where to find it | Value to copy |
|---|---|---|
| `taiwan-orders-electronics.csv` | Ministry of Economic Affairs, Department of Statistics: Export Orders release (moea.gov.tw, Statistics, Export Orders), around the 20th of each month | Export orders for electronic products, US$ millions |
| `tsmc-revenue.csv` | TSMC Investor Relations: Monthly Revenue (investor.tsmc.com), around the 10th of each month | Net revenue for the month, NT$ millions |

Once the first real downloads are saved here (the MOEA spreadsheet, the TSMC table), a parser for their exact layout can be added so they can be dropped in as they come.
