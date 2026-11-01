# Liveries — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 0
- **Todo:** 1
- **Doing:** 0
- **Done:** 4
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **liveries-yafve** — Silhouette und Detailschicht für widebody und regional-jet aus der Altgrafik (nach dem Narrowbody-Muster) (feature) — `todo/liveries-yafve-silhouette-und-detailschicht-widebody-und-regional-jet.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
- **liveries-yzshd** — Trennlinie zwischen Rumpf und Finne wieder sichtbar machen (bug) — `done/liveries-yzshd-trennlinie-rumpf-finne-zurueck.md`
- **liveries-wyypc** — Narrowbody-Detailschicht: alle Cockpitfenster aus der Altgrafik übernehmen (bug) — `done/liveries-wyypc-narrowbody-details-cockpitfenster-vollstaendig.md`
- **liveries-ptm0c** — Entscheidung: Einmaliger Import der CSS-Lackierungen, Pixelvergleich als Gate, Umstellung in einem Commit (decision) — `done/liveries-ptm0c-entscheidung-einmaliger-import-der-css-lackierungen-pixelver.md`
- **liveries-w35k0** — Entscheidung: Lackierungsdatei als JSON-Ebenenmodell, Silhouette und Detailschicht als SVG je Typklasse, eine gemeinsame Render-Funktion (decision) — `done/liveries-w35k0-entscheidung-lackierungsdatei-als-json-ebenenmodell-silhouet.md`
<!-- done-list:end -->

Current-month entries stay live in full — the nominal ~30-entry figure
(`lib/index-rotation.mjs`'s `DEFAULT_CAP_ENTRIES`) is a steady-state target, not a hard cap, so a
busy month can legitimately hold well past 30 live entries (ADR-0039); rotation never splits a
month. Once a whole month closes and rotation rolls it out, this header is rewritten in place to
name the archive location (ADR-0047) and the block above holds only the still-live entries.
Rolled-out months land verbatim, newest-on-top, in `done-archive/YYYY-MM.md` — the same
cap-and-roll convention ADR-0039 established for `protocol.md` (agentic-workflow-r2c7m), applied
here to the INDEX done-list (agentic-workflow-c8j3w). Rotation never touches the actual
`done/<task-id>-<slug>.md` files or the `**Done:** N` lifetime count above, so `depends_on`/
`blocks` resolution and the dashboard search corpus (ADR-0023) are unaffected; `modeling`'s
prior-art matcher additionally checks `done-archive/` when present.

### Backlog
<!-- backlog-list:start -->
<!-- backlog-list:end -->

## Pointers

- Done-list archive (entries rolled out beyond the live cap, if any): `done-archive/YYYY-MM.md` (ADR-0039 convention, agentic-workflow-c8j3w)
- Knowledge half (ADRs / research / concepts / BC README) for this BC: `../../knowledge/contexts/<bc-name>/INDEX.md`
