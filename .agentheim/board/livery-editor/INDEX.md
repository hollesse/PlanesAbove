# Livery Editor — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 0
- **Todo:** 1
- **Doing:** 1
- **Done:** 3
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **livery-editor-ec2zz** — Rundungen: Griff in der Segmentmitte macht aus der Geraden eine Kurve (feature) — `todo/livery-editor-ec2zz-rundungen-griff-segmentmitte.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
- **livery-editor-nxdzh** — Ebenenpanel: Pfade als Ebenen sehen, auswählen, umsortieren, ein-/ausblenden, löschen, färben, benennen (feature) — `doing/livery-editor-nxdzh-ebenenpanel-pfade-umsortieren.md`
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
- **livery-editor-hz0hb** — Pfad durch Klick auf den ersten Punkt schließen statt über den Knopf (feature) — `done/livery-editor-hz0hb-pfad-schliessen-per-klick-auf-ersten-punkt.md`
- **livery-editor-zc7hk** — Spike: Editor-Durchstich — Narrowbody-Silhouette, Lackierungsdatei, Render-Funktion, Pfad zeichnen, speichern, in Storybook sehen (spike) — `done/livery-editor-zc7hk-spike-editor-durchstich-narrowbody-silhouette-lackierungsdat.md`
- **livery-editor-rv382** — Entscheidung: Editor als lokaler Vite-Dev-Server mit Schreib-Plugin unter tools/, nie im Client-Bundle oder Docker-Image (decision) — `done/livery-editor-rv382-entscheidung-editor-als-lokaler-vite-dev-server-mit-schreib.md`
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
