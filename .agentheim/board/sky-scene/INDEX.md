# Sky Scene — Index (task board)

Catalog of this bounded context's tasks by status.

> Updated by: `modeling` (tasks), the lifecycle verbs (promote / claim / complete / capture / dismiss / bounce / reroute).
> Hand-edits are fine but the verbs will append at the section markers below.

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 1
- **Todo:** 1
- **Doing:** 0
- **Done:** 3
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **sky-scene-n0sfy** — Flugzeug-Übergänge (kommt / geht / wechselt) in der Live-Szene abspielen statt hart zu schneiden; Diff per icao24, Übergang-Sperre puffert den neuesten Stand (feature) — `todo/sky-scene-n0sfy-flugzeug-uebergaenge-live-abspielen-diff-und-uebergang-sperre.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
- **sky-scene-g3r8w** — Mindesthaltezeit pro Slot gegen Flackern beim Flugzeugwechsel (feature) — `done/sky-scene-g3r8w-mindesthaltezeit-pro-slot-gegen-flackern-beim-flugzeugwechsel.md`
- **sky-scene-w9n4f** — Szene gilt erst als veraltet, wenn der letzte erfolgreiche Abruf älter als 3 Takte (90 s) ist (feature) — `done/sky-scene-w9n4f-szene-gilt-erst-als-veraltet-wenn-der-letzte-erfolgreiche-ab.md`
- **sky-scene-xczgm** — Decide German speech output behind a swappable synthesizer port (Piper default, ElevenLabs etc. pluggable), played as audio on the iPad (decision) — `done/sky-scene-xczgm-german-speech-output.md`
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
- **sky-scene-t6h2p** — ElevenLabs-Adapter (opt-in) mit Zeichenbudget und Piper-Fallback (feature) — `backlog/sky-scene-t6h2p-elevenlabs-adapter-opt-in-mit-zeichenbudget-und-piper-fallba.md`
<!-- backlog-list:end -->

## Pointers

- Done-list archive (entries rolled out beyond the live cap, if any): `done-archive/YYYY-MM.md` (ADR-0039 convention, agentic-workflow-c8j3w)
- Knowledge half (ADRs / research / concepts / BC README) for this BC: `../../knowledge/contexts/<bc-name>/INDEX.md`
