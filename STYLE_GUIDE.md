# Style Guide

Concise rules the codebase and Copilot suggestions should follow.

## 1. General Principles

- Prefer clarity over brevity; explicit names, no ambiguous abbreviations.
- All exported functions/classes/interfaces: full JSDoc.
- Validate external inputs; never trust parameters coming from device/network events.
- Fail fast with descriptive Error messages; return early on invalid input.
- Keep functions focused (single responsibility, <= ~40 lines ideally).

## 2. TypeScript Conventions

- Use `strict` typing; no `any` unless justified with a preceding comment `// intentional any: reason`.
- Prefer readonly (`readonly` or `as const`) for constant structures / lookup tables.
- Narrow types with guards instead of type assertions. Avoid `as X` unless unavoidable.
- Prefer enums / literal unions over magic numbers. Map protocol constants in lookup arrays.

## 3. Naming

- Functions: verb or verb phrase (`createDevice`, `updateState`).
- Booleans: prefix with `is/has/can/should` (internal helpers); state flags in this project may keep existing names (`intervalOnOff`).
- Private file‑local helpers start with `_` only if intentionally unused yet (silencing ESLint); otherwise export or remove.
- Constants: `UPPER_SNAKE_CASE` only for process env or true constants; otherwise camelCase.

## 4. JSDoc Template

For every public/exported function or public methods (and important internal helpers):

```
/**
 * One‑line summary (starts with a verb, ends without period if short).
 *
 * Longer description (optional) explaining rationale or algorithm. Mention spec refs if relevant.
 *
 * Edge cases:
 *  - bullet 1
 *  - bullet 2
 *
 * @param {Type} name Description (units, accepted range, behavior on bounds)
 *
 * @returns {Type} Description (units, range, side effects)
 */
```

Rules:

- Always include `@param` and `@returns` with explicit types (even if TS can infer) for consistency with lint rules.
- Document units (e.g. `°C * 100`, `lux`, `mireds`, `Pa`).
- List clamping and fallback behaviors under Edge cases.
- If returning Promise, use `@returns {Promise<Type>}`.

## 5. Error Handling & Validation

- Reject invalid numeric input: use `Number.isFinite(n)`; clamp with `Math.min/Math.max`.
- When decoding device values, guard against null/undefined before math.
- Prefer returning 0 / empty array for non‑critical sensor errors, log at debug level.
- Throw only for programmer/config errors; not for transient sensor states.

## 6. Logging

- Use `log.debug` for verbose internal transitions.
- Use `log.info` for state changes & received commands.
- Use `log.notice` for notices.
- Use `log.warn` for recoverable anomalies (out‑of‑range adjusted, missing optional attribute).
- Use `log.error` only for failed operations that stop progress.
- Use `log.fatal` only for failed operations that are not recoverable.
- Avoid duplicate logs inside tight intervals; coalesce if needed.

## 7. Formatting & Lint

- ESLint + Prettier govern style; do not fight formatters.
- No trailing spaces; keep imports sorted by groups: std libs, external deps, internal modules, types.
- Use trailing commas where multi‑line.

## 8. Tests

- Add at least one test per new helper function (happy path + one edge case).
- Use explicit test names describing behavior (`converts 100 lux to encoded value`).
- Keep test data small and deterministic.

## 9. Performance

- Avoid premature optimization; micro‑opt only with measurable hotspot proof.
- Prefer simple loops over complex chaining when in per‑tick update paths.

## 10. Copilot Prompting Hints

Placing this file at root lets Copilot pick patterns. Reinforce by:

- Keeping 2–3 perfect exemplar functions near top of large files.
- Adding a brief `// Style: ...` comment before a series of helpers.
- Rejecting poor suggestions early so the buffer stays clean.

## 11. File Header Blocks

- Keep existing license header exactly; update `@version` only on functional changes, not style edits.

## 12. Deprecation

- Mark deprecated APIs with `@deprecated` tag explaining alternative and planned removal version.

## 13. Commit Messages (conventional subset)

- `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` prefix.
- Imperative, lower case first line; no period.

## 14. Example (Reference)

```ts
/**
 * Convert lux to Matter encoded illuminance value.
 *
 * Edge cases:
 *  - <=0 or non-finite -> 0
 *  - Caps at 0xFFFE
 *
 * @param {number} lux Illuminance in lux (>=0).
 * @returns {number} Encoded value (0..0xFFFE)
 */
function luxToMatterExample(lux: number): number {
  if (!Number.isFinite(lux) || lux <= 0) return 0;
  return Math.round(Math.min(10000 * Math.log10(lux), 0xfffe));
}
```

---

Short, opinionated. If a rule isn’t helping, propose a PR to adjust.
