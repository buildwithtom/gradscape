# Catalogue contract

`data/catalogue.json` is the validated public seed. `src/schema.ts` is the executable schema. `scripts/catalogue.ts` controls the editable CSV, preview, validation and atomic writes. Keep private spreadsheets and backups in the gitignored import directory. Do not add applicant contacts, transcripts, credentials, application history or personal fit to public records.

## CSV fields

| Field                                                 | Contract                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                                    | Immutable lowercase hyphenated key, unique per credit pathway. Keep it when title/fee changes.                                                                                                                                                    |
| country                                               | ISO alpha-2 code; add the corresponding entry in `data/countries.json` (code/name/currency/flag).                                                                                                                                                 |
| institution, title                                    | Public provider and programme name; qualification is stored separately.                                                                                                                                                                           |
| campuses                                              | Pipe-separated explicit campus/city choices; each value matches city filtering. Use a consistent city label. `data/campus-cities.json` groups district labels such as Auckland CBD under their city without discarding the original campus label. |
| providerType, studyArea, qualification, programmeType | Public text. Filter options derive from data.                                                                                                                                                                                                     |
| credits, durationMonths                               | Positive numeric values; blank means null. Do not guess duration from credits.                                                                                                                                                                    |
| intakeText                                            | Original public caveats, retained alongside normalized dates.                                                                                                                                                                                     |
| intakeDates                                           | Pipe-separated `YYYY-MM-DD`, `YYYY-MM` or `unknown`. Month-only stays month-only.                                                                                                                                                                 |
| intakeStatuses                                        | Corresponding `confirmed`, `tentative` or `unknown` entries. Unknown dates require unknown status.                                                                                                                                                |
| feeAmount                                             | Numeric quote in original currency; blank means null. Zero is allowed only for a genuine published zero-fee quote.                                                                                                                                |
| feeCurrency                                           | NZD, INR, AUD, CAD, GBP, USD or EUR. Extend the enum when adding another supported currency.                                                                                                                                                      |
| feeScope                                              | `full`, `annual` or `partial`. Only full quotes participate in full tuition sorting/budgets.                                                                                                                                                      |
| feeYear                                               | Four-digit year, or blank when unspecified. Do not infer the year from the target intake.                                                                                                                                                         |
| feeLabel                                              | Published, Estimated, Annual only or Unverified. A linked page alone does not mean Published.                                                                                                                                                     |
| feeBasis                                              | Scope, inclusions and assumptions. Legacy `× 1.5` quotes expose annual rate × 1.5 calculation.                                                                                                                                                    |
| sourceUrl                                             | HTTPS official source URL. Missing or malformed URLs reject the import.                                                                                                                                                                           |
| verification, lastVerifiedAt                          | `unverified`, `verified` or `conflict`; ISO day or blank. Verified/conflict requires a real check date.                                                                                                                                           |
| entry                                                 | Source-backed public criteria or a neutral question for admissions, never a personal admission prediction.                                                                                                                                        |
| deadline                                              | ISO day or month, or blank. No guessed deadlines.                                                                                                                                                                                                 |
| otherFees                                             | Separate compulsory fees and exclusions; state unknown when not checked.                                                                                                                                                                          |

Use text formatting for ISO dates in the spreadsheet to prevent conversion to serial numbers. Save UTF-8 CSV with quoting for commas/newlines. Unknown numeric/date values are empty cells, not zero or the string “N/A”. A dry run must succeed before writing. Back up edits before re-exporting into the same file.

## Sources and verification

The main CSV source is a group covering imported public facts; it stays unverified until those facts have actually been checked. Add narrowly scoped checks in `data/source-checks.json` when only some facts were checked. Each check records ID, verified/conflict status, actual check date, precise facts and limitations. The provider URL is inherited from the programme. For additional official calendars, admissions or fee schedules, add a `url` to a check; the app uses it when present. Cross-check programme starts with the provider academic calendar, and international fees with the applicable year’s official fee schedule. Check scholarships separately and record restrictions rather than reducing tuition.

The application currently promotes Auckland IT intake dates and entry information only when the original checked dates match, and promotes Canterbury’s fee only when amount/year match the checked quote. Other scoped checks are informative and never promote an entire record. When changing those facts, recheck and update or remove scoped checks and the explicit promotion in `src/lib.ts`; a historic source check must not certify a new fact. The check date belongs to the checked group, never the entire imported workbook.

## Review rules

`reviewReasons` and `reviewRules` in `src/review.ts` are the app rules. The CLI flags the same conservative conditions for imported records:

- Any source group is unverified or conflicting.
- Any intake is tentative or unknown.
- Fee amount is missing, scope is annual/partial, label is not Published, or fee year is not the release year (2027).

Current flags intentionally include all 27 pathways because a scoped check does not verify every material fact. Imported annual estimates remain estimates, even when the annual rate is published. Conflicting values remain visible in source notes and in Needs review; they are never silently averaged. The public data includes the original workbook quote until an explicit maintainer decision resolves it.

## Adding data

Export the current public catalogue to CSV, append new rows with immutable IDs and preview. Add a country to `data/countries.json`; filters and catalogue counts are generated from the rows. Add a campus to the pipe-separated campus list. Add an intake date/status pair to the pipe-separated lists. Add a distinct fee or credit pathway as a new row with a new ID; do not overwrite a different pathway. The comparator preserves selection across country changes.

Rates in `src/App.tsx` are INR per one unit of the original currency; initially NZD and INR are available. Missing rates produce “Not available”, never zero, and those converted amounts cannot satisfy a numeric budget. Add a sourced dated reference and override UI before supporting another conversion. Original same-currency amounts remain comparable without an exchange rate.

## Public data audit

The import excludes columns H, I, J, Q and R and the QS numbers. Q is omitted entirely because mixed notes can carry applicant-specific information; only neutral entry prompts are created. Derived INR cells are recalculated from the editable reference rate. Raw workbooks are ignored globally and `data/import/` is ignored except its placeholder. Screenshots are captured before shortlist test notes are entered. Review `git diff --cached`, `git ls-files` and `dist/` before deployment. No `public/` imports, public backups or source maps contain private input.
