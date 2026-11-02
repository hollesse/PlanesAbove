import { h } from '../../../src/client/ui/dom';
import { PLANE_PARTS } from '../../../src/client/ui/assets/generated/plane-parts';
import { FIELD_DEFAULTS, LOGO_PLACEHOLDER, logoSize, pathData, renderLiverySvg } from '../../../src/client/ui/domain/livery-render';
import type { LiveryFile, LogoLayer, PathLayer } from '../../../src/client/ui/domain/livery-file';
import { layerLabel, moveItem, moveLayer, NAME_MAX, recolorLayer, removeItem, removeLayer, renameLayer, visibleFile, type Direction } from '../layers';
import { movePoint, segmentHandle, setVia } from '../curve';
import { LOGO_SVG } from '../../../src/client/ui/assets/generated/logos';
import { logoFrame, newLogoLayer, rotationFromHandle, scaleFromCorner, snapRotation } from '../logo';
import { LIVERY_FILES } from '../../../src/client/ui/assets/generated/liveries';
import { LIVERY_ID, LiveryFileSchema } from '../../../src/client/ui/domain/livery-file';
import { groupByAirline, typeOptions, type AirlineGroup, type SightingsResponse } from '../gaps';
import { addPoint, closeDraft, draftPathData, setDraftVia, closesAt, snap, rubberTarget, CLOSE_RADIUS, type Draft } from '../board';

// Walking-skeleton editor (spike): Typklasse choice, board with silhouette/details opacity, path tool, one colour, save.
const typklassen = Object.keys(PLANE_PARTS);
const state = {
  file: { version: 1, livery: 'spike', typklasse: typklassen.includes('narrowbody') ? 'narrowbody' : typklassen[0], fields: { ...FIELD_DEFAULTS }, layers: [] } as unknown as LiveryFile,
  draft: { points: [] } as Draft,
  /** Index into file.layers (bottom -> top) of the selected layer, or null. The curve-handle tool builds on this. */
  selected: null as number | null,
  /** Editor-only visibility, parallel to file.layers; never written to the file. */
  hidden: [] as boolean[],
  pathColor: '#d6001c',
  silhouetteOpacity: 1,
  detailsOpacity: 1,
};
// the defaults are upper case in the renderer; the colour inputs and files use lower case
for (const k of Object.keys(state.file.fields) as (keyof LiveryFile['fields'])[]) state.file.fields[k] = state.file.fields[k]!.toLowerCase();

const board = document.getElementById('board')!;
const panel = document.getElementById('panel')!;
const status = h('div', { attrs: { id: 'status', 'data-testid': 'status' } });

let handleGesture = false;
let dragging = false;
function drawBoard() {
  const vb = PLANE_PARTS[state.file.typklasse].viewBox;
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.setAttribute('class', 'overlay');
  overlay.setAttribute('viewBox', vb);
  overlay.dataset.testid = 'overlay';
  const pts = state.draft.points;
  const toBoard = (e: MouseEvent) => {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform((board.querySelector('svg.overlay') as SVGSVGElement ?? overlay).getScreenCTM()!.inverse());
    return snap(pt.x, pt.y);
  };
  const sel = state.selected === null ? undefined : state.file.layers[state.selected];
  const selOutline = sel?.type === 'path' && !state.hidden[state.selected!]
    ? `<path data-testid="selection-outline" d="${pathData(sel)}" fill="none" stroke="#0a84ff" stroke-width="3" stroke-dasharray="8 5" pointer-events="none"/>` : '';
  const handles = sel?.type === 'path' && !state.hidden[state.selected!] && !pts.length
    ? sel.points.map((_, i) => { const [x, y] = segmentHandle(sel, i); return `<circle class="curve-handle" data-testid="curve-handle-${i}" data-segment="${i}" cx="${x}" cy="${y}" r="6" fill="#0a84ff" stroke="#fff" stroke-width="2" style="cursor:grab"/>`; }).join('') : '';
  const corners = sel?.type === 'path' && !state.hidden[state.selected!] && !pts.length
    ? sel.points.map(([x, y], i) => `<rect class="vertex-handle" data-testid="vertex-handle-${i}" data-vertex="${i}" x="${x - 6}" y="${y - 6}" width="12" height="12" fill="#fff" stroke="#0a84ff" stroke-width="3" style="cursor:move"/>`).join('') : '';
  const logoSel = sel?.type === 'logo' && !state.hidden[state.selected!] && !pts.length ? sel : undefined;
  const logoFrameEls = logoSel ? logoFrameSvg(logoSel) : '';
  overlay.innerHTML = selOutline + handles + corners + logoFrameEls;
  if (pts.length) {
    overlay.innerHTML +=
      `<path data-testid="draft-path" d="${draftPathData(state.draft)}" fill="none" stroke="${state.pathColor}" stroke-width="3"/>` +
      pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="${state.pathColor}" stroke-width="2"/>`).join('') +
 pts.slice(1).map((_, i) => { const [x, y] = segmentHandle(state.draft, i); return `<circle class="curve-handle draft-handle" data-testid="draft-handle-${i}" data-segment="${i}" cx="${x}" cy="${y}" r="6" fill="#0a84ff" stroke="#fff" stroke-width="2" style="cursor:grab"/>`; }).join('') +
      `<circle data-testid="first-point-ring" cx="${pts[0][0]}" cy="${pts[0][1]}" r="${CLOSE_RADIUS}" fill="none" stroke="${state.pathColor}" stroke-width="3" visibility="hidden"/>` +
      `<path data-testid="draft-rubber" d="" fill="none" stroke="${state.pathColor}" stroke-width="3" stroke-dasharray="6 5" pointer-events="none" visibility="hidden"/>`;
  }
  // a gesture that starts on a handle must not also add a draft point (its click bubbles to the overlay)
  overlay.addEventListener('mousedown', (e) => {
    const target = e.target as Element;
    const logoPart = target.closest?.('[data-logo-part]');
    if (logoPart && state.selected !== null) { startLogoGesture(e, logoPart, toBoard); return; }
    const vertex = target.closest?.('.vertex-handle');
    const handle = vertex ?? target.closest?.('.curve-handle');
    // a click that would close the draft wins over a draft handle lying on top of the first point
    if (!handle || (handle.classList.contains('draft-handle') && closesAt(state.draft, toBoard(e)))) { handleGesture = false; return; }
    handleGesture = true; dragging = true;
    e.preventDefault();
    const i = Number(handle.getAttribute(vertex ? 'data-vertex' : 'data-segment'));
    const isDraft = handle.classList.contains('draft-handle');
    const move = (ev: MouseEvent) => {
      if (isDraft) { state.draft = setDraftVia(state.draft, i, toBoard(ev)); drawBoard(); return; }
      if (state.selected === null) return;
      const edit = vertex ? (l: PathLayer) => movePoint(l, i, toBoard(ev)) : (l: PathLayer) => setVia(l, i, toBoard(ev));
      state.file = { ...state.file, layers: state.file.layers.map((l, k) => (k === state.selected && l.type === 'path' ? edit(l) : l)) };
      drawBoard();
    };
    const up = () => { dragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  overlay.addEventListener('dblclick', (e) => {
    const handle = (e.target as Element).closest?.('.curve-handle');
    if (!handle) return;
    const i = Number(handle.getAttribute('data-segment'));
    if (handle.classList.contains('draft-handle')) { state.draft = setDraftVia(state.draft, i, null); drawBoard(); return; }
    if (state.selected === null) return;
    state.file = { ...state.file, layers: state.file.layers.map((l, k) => (k === state.selected && l.type === 'path' ? setVia(l, i, null) : l)) };
    drawBoard();
  });
  overlay.addEventListener('click', (e) => {
    if (handleGesture) { handleGesture = false; return; }
    if (board.classList.contains('preview')) return;
    const p = toBoard(e);
    if (closesAt(state.draft, p)) {
      state.file = closeDraft(state.file, state.draft, state.pathColor);
      state.hidden = [...state.hidden, false];
      state.selected = state.file.layers.length - 1;
      renderLayerPanel();
      state.draft = { points: [] };
      say(`Pfad geschlossen (${state.file.layers.length} Pfad/e).`);
    } else {
      state.draft = addPoint(state.draft, rubberTarget(state.draft, p, e.shiftKey) ?? p);
    }
    drawBoard();
  });
  overlay.addEventListener('mousemove', (e) => {
    const ring = overlay.querySelector('[data-testid="first-point-ring"]');
    if (ring) ring.setAttribute('visibility', closesAt(state.draft, toBoard(e)) ? 'visible' : 'hidden');
    const rubber = overlay.querySelector('[data-testid="draft-rubber"]');
    if (!rubber) return;
    const last = state.draft.points[state.draft.points.length - 1];
    const target = dragging || board.classList.contains('preview') ? null : rubberTarget(state.draft, toBoard(e), e.shiftKey);
    if (!target) { rubber.setAttribute('visibility', 'hidden'); return; }
    rubber.setAttribute('d', `M${last[0]} ${last[1]} L${target[0]} ${target[1]}`);
    rubber.setAttribute('visibility', 'visible');
  });
  overlay.addEventListener('mouseleave', () => overlay.querySelector('[data-testid="draft-rubber"]')?.setAttribute('visibility', 'hidden'));
  board.replaceChildren();
  board.insertAdjacentHTML('afterbegin', renderLiverySvg(visibleFile(state.file, state.hidden), { silhouetteOpacity: state.silhouetteOpacity, detailsOpacity: state.detailsOpacity }));
  board.append(overlay);
}

/** Transform frame of the selected logo layer: body (drag = move), four corner handles (scale), one rotation handle. */
function logoFrameSvg(l: LogoLayer): string {
  const size = logoSize(l.src) ?? LOGO_PLACEHOLDER;
  const f = logoFrame(l, size);
  const pts = f.corners.map((c) => c.join(',')).join(' ');
  const top: [number, number] = [(f.corners[0][0] + f.corners[1][0]) / 2, (f.corners[0][1] + f.corners[1][1]) / 2];
  return `<polygon data-testid="logo-frame" data-logo-part="move" points="${pts}" fill="rgba(10,132,255,0.06)" stroke="#0a84ff" stroke-width="2" style="cursor:move"/>` +
    `<line x1="${top[0]}" y1="${top[1]}" x2="${f.rotateHandle[0]}" y2="${f.rotateHandle[1]}" stroke="#0a84ff" stroke-width="2" pointer-events="none"/>` +
    f.corners.map(([x, y], i) => `<rect data-testid="logo-corner-${i}" data-logo-part="corner" x="${x - 6}" y="${y - 6}" width="12" height="12" fill="#fff" stroke="#0a84ff" stroke-width="3" style="cursor:nwse-resize"/>`).join('') +
    `<circle data-testid="logo-rotate" data-logo-part="rotate" cx="${f.rotateHandle[0]}" cy="${f.rotateHandle[1]}" r="7" fill="#fff" stroke="#0a84ff" stroke-width="3" style="cursor:grab"/>`;
}

function startLogoGesture(e: MouseEvent, part: Element, toBoard: (e: MouseEvent) => [number, number]) {
  const index = state.selected!;
  const start = state.file.layers[index];
  if (start.type !== 'logo') return;
  handleGesture = true; dragging = true;
  e.preventDefault();
  const kind = part.getAttribute('data-logo-part');
  const p0 = toBoard(e);
  const size = logoSize(start.src) ?? LOGO_PLACEHOLDER;
  const edit = (ev: MouseEvent, l: LogoLayer): LogoLayer => {
    const p = toBoard(ev);
    if (kind === 'move') return { ...l, x: start.x + p[0] - p0[0], y: start.y + p[1] - p0[1] };
    if (kind === 'corner') return { ...l, scale: scaleFromCorner(start, size, p) };
    return { ...l, rotation: snapRotation(rotationFromHandle(start, p), ev.shiftKey) };
  };
  const move = (ev: MouseEvent) => {
    state.file = { ...state.file, layers: state.file.layers.map((l, k) => (k === index && l.type === 'logo' ? edit(ev, l) : l)) };
    drawBoard();
  };
  const up = () => { dragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function say(msg: string, error = false) { status.textContent = msg; status.className = error ? 'error' : ''; }

const input = (type: string, value: string, on: (v: string) => void, testid: string, extra: Record<string, string> = {}) => {
  const i = h('input', { attrs: { type, value, 'data-testid': testid, ...extra } });
  i.addEventListener('input', () => on(i.value));
  return i;
};
const row = (label: string, el: HTMLElement) => h('label', {}, h('span', { text: label }), el);

const select = h('select', { attrs: { 'data-testid': 'typklasse' } }, ...typklassen.map((t) => h('option', { text: t, attrs: { value: t } })));
select.value = state.file.typklasse;
select.addEventListener('change', () => {
  if (sightings.selected) { pick(sightings.selected.liveryId, select.value); return; }
  state.file = { ...state.file, typklasse: select.value }; state.draft = { points: [] }; drawBoard();
});

const undoBtn = h('button', { text: 'Letzten Pfad löschen' });
undoBtn.addEventListener('click', () => { if (state.file.layers.length) removeAt(state.file.layers.length - 1); state.draft = { points: [] }; drawBoard(); });

// ---- layer panel: top layer first ("oben ist oben"); layers[] itself runs bottom -> top ----
const layerList = h('div', { attrs: { 'data-testid': 'layer-list', id: 'layer-list' } });
/** Row currently in inline-rename mode (only one at a time), or null. */
let editing: number | null = null;

function removeAt(i: number) {
  state.file = removeLayer(state.file, i);
  state.hidden = removeItem(state.hidden, i);
  state.selected = state.selected === null || state.selected === i ? null : state.selected > i ? state.selected - 1 : state.selected;
  renderLayerPanel(); drawBoard();
}
function moveAt(i: number, dir: Direction) {
  const to = dir === 'up' ? i + 1 : i - 1;
  if (to < 0 || to >= state.file.layers.length) return;
  state.file = moveLayer(state.file, i, dir);
  state.hidden = moveItem(state.hidden, i, dir);
  if (state.selected === i) state.selected = to; else if (state.selected === to) state.selected = i;
  editing = null;
  renderLayerPanel(); drawBoard();
}
function selectLayer(i: number | null) { state.selected = i; renderLayerPanel(); drawBoard(); }

const ICONS = {
  edit: '✎', confirm: '✓', up: '↑', down: '↓', del: '🗑',
};
function iconBtn(glyph: string, label: string, testid: string, on: () => void, disabled = false) {
  const b = h('button', { text: glyph, attrs: { class: 'icon-btn', title: label, 'aria-label': label, 'data-testid': testid, type: 'button' } });
  b.disabled = disabled;
  b.addEventListener('click', (ev) => { ev.stopPropagation(); on(); });
  return b;
}

function renderLayerPanel() {
  const { file, selected } = state;
  const last = file.layers.length - 1;
  layerList.replaceChildren(...file.layers.map((l, i) => i).reverse().map((i) => {
    const l = file.layers[i];
    const eye = h('input', { attrs: { type: 'checkbox', 'data-testid': 'layer-visible', title: 'Sichtbar' } });
    eye.checked = !state.hidden[i];
    eye.addEventListener('change', () => { state.hidden = state.hidden.map((v, k) => (k === i ? !eye.checked : v)); drawBoard(); });
    const color = h('input', { attrs: { type: 'color', class: 'swatch', 'data-testid': `layer-color-${i}`, title: 'Farbe', 'aria-label': 'Farbe' } });
    color.value = l.type === 'path' ? l.color : '#cccccc';
    color.disabled = l.type !== 'path';
    color.addEventListener('input', () => { state.file = recolorLayer(state.file, i, color.value); drawBoard(); });
    color.addEventListener('change', () => renderLayerPanel());

    let nameEl: HTMLElement;
    let editBtn: HTMLElement;
    if (editing === i) {
      const field = h('input', { attrs: { type: 'text', class: 'layer-name-input', maxlength: String(NAME_MAX), 'data-testid': `layer-name-input-${i}`, 'aria-label': 'Name der Ebene' } });
      const auto = layerLabel({ ...file, layers: file.layers.map((x) => { const { name: _n, ...r } = x; return r as typeof x; }) }, i);
      field.value = l.name ?? auto;
      field.placeholder = auto;
      // an unnamed layer is pre-filled with its auto label; confirming it unchanged keeps the layer unnamed
      const commit = () => { state.file = renameLayer(state.file, i, !l.name && field.value === auto ? '' : field.value); editing = null; renderLayerPanel(); };
      field.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); editing = null; renderLayerPanel(); }
      });
      field.addEventListener('click', (ev) => ev.stopPropagation());
      nameEl = field;
      editBtn = iconBtn(ICONS.confirm, 'Umbenennen bestätigen', `layer-rename-confirm-${i}`, commit);
      queueMicrotask(() => { field.focus(); field.select(); });
    } else {
      nameEl = h('button', { text: layerLabel(file, i), attrs: { class: 'layer-label', 'data-testid': 'layer-select' } });
      nameEl.addEventListener('click', () => { editing = null; selectLayer(state.selected === i ? null : i); });
      editBtn = iconBtn(ICONS.edit, 'Umbenennen', `layer-rename-${i}`, () => { editing = i; renderLayerPanel(); });
    }
    const actions = h('span', { attrs: { class: 'layer-actions' } },
      editBtn,
      iconBtn(ICONS.up, 'Nach oben', `layer-up-${i}`, () => moveAt(i, 'up'), i === last),
      iconBtn(ICONS.down, 'Nach unten', `layer-down-${i}`, () => moveAt(i, 'down'), i === 0),
      iconBtn(ICONS.del, 'Löschen', `layer-delete-${i}`, () => { editing = null; removeAt(i); }));
    return h('div', { attrs: { class: 'layer-row' + (i === selected ? ' selected' : '') + (editing === i ? ' editing' : ''), 'data-testid': `layer-row-${i}`, 'data-index': String(i) } }, eye, color, nameEl, actions);
  }));
  document.getElementById('board')!.dataset.selected = selected === null ? '' : String(selected);
}

// ---- Logo: a click puts the logo on the fuselage and selects it ----
const logoList = h('div', { attrs: { 'data-testid': 'logo-list', id: 'logo-list' } });
function addLogo(src: string) {
  const size = logoSize(src);
  if (!size) return;
  // the fuselage lies a bit below the middle of the board (the fin above it)
  const [vx, vy, vw, vh] = PLANE_PARTS[state.file.typklasse].viewBox.split(/\s+/).map(Number);
  const layer = newLogoLayer(src, size, Math.round(vx + vw / 2), Math.round(vy + vh * 0.61));
  state.file = { ...state.file, layers: [...state.file.layers, layer] };
  state.hidden = [...state.hidden, false];
  state.selected = state.file.layers.length - 1;
  editing = null;
  renderLayerPanel(); drawBoard();
  say(`Logo ${src} platziert.`);
}
function addLogoRow(src: string) {
  const b = h('button', { attrs: { type: 'button', class: 'logo-row', 'data-testid': `logo-add-${src}`, title: `${src} hinzufügen` } },
    h('span', { html: LOGO_SVG[src], attrs: { class: 'logo-preview' } }), h('span', { text: src }));
  b.addEventListener('click', () => addLogo(src));
  logoList.append(b);
}
Object.keys(LOGO_SVG).forEach(addLogoRow);

// Upload: the file goes through the write plugin into svg/logos/; on 200 the logo joins the list and is placed at once
// (LOGO_SVG is patched in place, so no page reload is needed; the server-side rebuild later regenerates the same content).
const logoFile = h('input', { attrs: { type: 'file', accept: '.svg,.png', 'data-testid': 'logo-upload-file' } }) as HTMLInputElement;
const logoName = h('input', { attrs: { type: 'text', 'data-testid': 'logo-upload-name', placeholder: 'logo-name' } }) as HTMLInputElement;
logoFile.addEventListener('change', () => {
  const f = logoFile.files?.[0];
  if (f) logoName.value = f.name.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+/, '').slice(0, 32);
});
const logoUploadBtn = h('button', { text: 'Hochladen', attrs: { 'data-testid': 'logo-upload', type: 'button' } });
logoUploadBtn.addEventListener('click', async () => {
  const f = logoFile.files?.[0];
  if (!f) { say('Bitte zuerst eine SVG- oder PNG-Datei wählen.', true); return; }
  const name = logoName.value;
  const isPng = f.name.toLowerCase().endsWith('.png');
  let data: string;
  let dataUri = '';
  if (isPng) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    data = btoa(bin); dataUri = `data:image/png;base64,${data}`;
  } else data = await f.text();
  const res = await fetch('/__livery-editor/logo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, kind: isPng ? 'png' : 'svg', data }) });
  const r = (await res.json()) as { message?: string; svg?: string };
  if (!res.ok || !r.svg) { say(r.message ?? `Fehler ${res.status}`, true); return; }
  LOGO_SVG[name] = isPng ? r.svg.replace(`href="${name}.png"`, `href="${dataUri}"`) : r.svg;
  addLogoRow(name);
  logoFile.value = ''; logoName.value = '';
  addLogo(name);
  say(`${r.message} Logo platziert.`);
});

const saveBtn = h('button', { text: 'Speichern', attrs: { 'data-testid': 'save' } });
saveBtn.addEventListener('click', async () => {
  const res = await fetch('/__livery-editor/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state.file) });
  const body = (await res.json()) as { message: string };
  say(body.message, !res.ok);
});

const fieldColor = (k: 'engines' | 'wings' | 'tailplane', label: string) => row(label, input('color', state.file.fields[k]!, (v) => { state.file = { ...state.file, fields: { ...state.file.fields, [k]: v } }; drawBoard(); }, `field-${k}`));

const liveryIdInput = input('text', state.file.livery, (v) => { state.file = { ...state.file, livery: v }; liveryIdInput.setAttribute('aria-invalid', String(!LIVERY_ID.test(v))); }, 'livery-id');

// ---- Sichtungen: Abkürzung zum Setzen von Lackierungs-ID + Typklasse (ADR 0033); der Editor funktioniert auch ohne Heimserver ----
const sightings = { days: 90, onlyGaps: true, response: null as SightingsResponse | null, failed: false, selected: null as AirlineGroup | null };
const sightingList = h('div', { attrs: { 'data-testid': 'sighting-list', id: 'sighting-list' } });
function pick(liveryId: string, typklasse: string) {
  if (!(typklasse in PLANE_PARTS)) { select.value = state.file.typklasse; say(`Für ${typklasse} gibt es keine Silhouette.`); return; }
  const existing = LIVERY_FILES[`${liveryId}/${typklasse}`];
  const parsed = existing === undefined ? null : LiveryFileSchema.safeParse(existing);
  state.file = parsed?.success ? structuredClone(parsed.data) : { ...state.file, livery: liveryId, typklasse, layers: [] };
  state.hidden = state.file.layers.map(() => false);
  state.selected = null; state.draft = { points: [] }; editing = null;
  liveryIdInput.value = liveryId; liveryIdInput.setAttribute('aria-invalid', String(!LIVERY_ID.test(liveryId)));
  select.value = typklasse;
  renderLayerPanel(); drawBoard();
  void updatePhoto();
  say(parsed?.success ? `Lackierung ${liveryId}/${typklasse} geladen.` : `Neue Lackierung ${liveryId}/${typklasse}.`);
}
// ---- Fotopanel: Galerie der Referenzfotos der gewählten Kombination (ADR 0033 §2) ----
// Ein Foto je Kennzeichen (das neueste, der Server sortiert), höchstens 20. Geladen wird nacheinander: das erste sofort, das nächste im Hintergrund vorab.
const photoPanel = document.getElementById('photo')!;
type RefPhoto = { imageUrl: string; photographer: string; source: string; pageUrl: string; licenceText: string; date?: string };
type GalleryItem = { registration: string | null; photo: RefPhoto };
let photoRequest = 0;
function showPhoto(...nodes: (HTMLElement | string)[]) { photoPanel.replaceChildren(h('h2', { text: 'Referenzfoto' }), ...nodes.map((n) => (typeof n === 'string' ? h('div', { text: n, attrs: { 'data-testid': 'photo-state' } }) : n))); }
function showGallery(found: GalleryItem[], index: number, more: boolean, onGo: (delta: number) => void) {
  const it = found[index];
  const p = it.photo;
  const nav = (label: string, testid: string, delta: number, disabled: boolean) => { const b = h('button', { text: label, attrs: { type: 'button', 'data-testid': testid, ...(disabled ? { disabled: '' } : {}) } }); b.addEventListener('click', () => onGo(delta)); return b; };
  showPhoto(
    h('img', { attrs: { src: p.imageUrl, alt: 'Referenzfoto', 'data-testid': 'photo-img' } }),
    h('div', { attrs: { class: 'photo-nav' } }, nav('‹', 'photo-prev', -1, index === 0), h('span', { text: `${index + 1} / ${found.length}${more ? '+' : ''}`, attrs: { 'data-testid': 'photo-pos' } }), nav('›', 'photo-next', 1, index + 1 >= found.length)),
    h('div', { attrs: { class: 'photo-credit', 'data-testid': 'photo-credit' } },
      h('div', { text: [it.registration, p.date ? p.date.slice(0, 10) : ''].filter(Boolean).join(' · '), attrs: { 'data-testid': 'photo-caption-head' } }),
      h('span', { text: `${p.photographer} · ${p.source} · ${p.licenceText} · ` }),
      h('a', { text: 'Seite öffnen', attrs: { href: p.pageUrl, target: '_blank', rel: 'noopener noreferrer', 'data-testid': 'photo-link' } })),
  );
}
async function updatePhoto() {
  const mine = ++photoRequest;
  const g = sightings.selected;
  const row = g && sightings.response?.rows.find((r) => r.prefix === g.prefix && r.typklasse === state.file.typklasse);
  if (!row) { showPhoto('Keine Sichtung gewählt'); return; }
  showPhoto('Lade Foto …');
  const samples = (row.samples ?? []).filter((s) => s.registration);
  const found: GalleryItem[] = [];
  let next = 0; let failed = 0; let index = 0; let pumping = false;
  const render = () => {
    if (mine !== photoRequest) return;
    if (found.length > 0) showGallery(found, index, next < samples.length, (d) => { index = Math.min(Math.max(index + d, 0), found.length - 1); render(); void pump(); });
    else if (next >= samples.length) { if (samples.length > 0 && failed === samples.length) showPhoto(h('div', { text: 'Foto nicht verfügbar', attrs: { class: 'error', 'data-testid': 'photo-state' } })); else showPhoto('Kein Foto'); }
  };
  // one request at a time: until the current and the next photo are known
  const pump = async () => {
    if (pumping) return;
    pumping = true;
    while (mine === photoRequest && next < samples.length && found.length < index + 2) {
      const s = samples[next++];
      try {
        const q = new URLSearchParams({ icao24: s.icao24 });
        if (s.registration) q.set('registration', s.registration);
        const res = await fetch(`/api/photos/reference?${q}`);
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { status: string; photos?: RefPhoto[] };
        if (mine !== photoRequest) return;
        if (body.status === 'ok' && body.photos?.length) found.push({ registration: s.registration ?? null, photo: body.photos[0] });
      } catch { failed++; }
      render();
    }
    pumping = false;
  };
  render();
  await pump();
}
function renderTypeSelect() {
  const { options, preselected } = typeOptions(sightings.selected, typklassen, Object.keys(PLANE_PARTS));
  select.replaceChildren(...options.map((o) => h('option', { text: o.label, attrs: o.disabled ? { value: o.value, disabled: '' } : { value: o.value } })));
  select.value = state.file.typklasse;
  return preselected;
}
function selectAirline(g: AirlineGroup) {
  sightings.selected = g;
  const preselected = renderTypeSelect();
  renderSightings();
  if (preselected) pick(g.liveryId, preselected); else void updatePhoto();
}
function renderSightings() {
  if (sightings.failed) { sightingList.replaceChildren(h('div', { text: 'Heimserver nicht erreichbar', attrs: { 'data-testid': 'sightings-unreachable', class: 'error' } })); return; }
  if (!sightings.response) { sightingList.replaceChildren(h('div', { text: 'Lade Sichtungen …' })); return; }
  const groups = groupByAirline(sightings.response.rows, LIVERY_FILES).filter((g) => !sightings.onlyGaps || g.gaps > 0);
  sightingList.replaceChildren(...(groups.length ? groups.map((g) => {
    const b = h('button', { attrs: { type: 'button', class: 'sighting-row airline-row' + (g.gaps > 0 ? ' gap' : '') + (sightings.selected?.prefix === g.prefix ? ' selected' : ''), 'data-testid': 'airline-row', 'data-livery': g.liveryId } },
      h('span', { text: g.airline, attrs: { class: 'sighting-airline' } }), h('span', { text: g.prefix }), h('span', { text: `${g.total}×` }), h('span', { text: `${g.gaps} von ${g.seenTypes} Typen fehlen`, attrs: g.gaps > 0 ? { class: 'gap-badge' } : {} }));
    b.addEventListener('click', () => selectAirline(g));
    return b;
  }) : [h('div', { text: sightings.onlyGaps ? 'Keine Lücken in den Sichtungen.' : 'Keine Sichtungen.' })]));
}
let sightingsRequest = 0;
void updatePhoto();
async function loadSightings() {
  const mine = ++sightingsRequest;
  sightings.response = null; sightings.failed = false; renderSightings();
  try {
    const res = await fetch(`/api/stats/sightings-by-class?days=${sightings.days}`);
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as SightingsResponse;
    if (!Array.isArray(body.rows)) throw new Error('bad body');
    if (mine === sightingsRequest) { sightings.response = body; sightings.selected = null; renderTypeSelect(); void updatePhoto(); }
  } catch {
    if (mine === sightingsRequest) sightings.failed = true;
  }
  if (mine === sightingsRequest) renderSightings();
}
const daysInput = input('number', String(sightings.days), (v) => { const n = Math.floor(Number(v)); if (n >= 1) { sightings.days = n; void loadSightings(); } }, 'sightings-days', { min: '1', step: '1' });
const onlyGapsBox = input('checkbox', '', () => { sightings.onlyGaps = onlyGapsBox.checked; renderSightings(); }, 'sightings-only-gaps');
onlyGapsBox.checked = true;

panel.append(
  h('h2', { text: 'Sichtungen' }),
  row('Tage', daysInput),
  row('nur Lücken', onlyGapsBox),
  sightingList,
  h('h2', { text: 'Lackierung' }),
  row('Lackierungs-ID', liveryIdInput),
  row('Typklasse', select),
  h('h2', { text: 'Deckkraft' }),
  row('Silhouette', input('range', '1', (v) => { state.silhouetteOpacity = Number(v); drawBoard(); }, 'opacity-silhouette', { min: '0', max: '1', step: '0.05' })),
  row('Details', input('range', '1', (v) => { state.detailsOpacity = Number(v); drawBoard(); }, 'opacity-details', { min: '0', max: '1', step: '0.05' })),
  h('h2', { text: 'Pfadwerkzeug' }),
  h('div', { text: 'Klicks setzen Punkte; Klick auf den ersten Punkt schließt den Pfad, Escape verwirft den Entwurf. Griffe an den Segmenten der gewählten Ebene ziehen rundet, Doppelklick macht wieder gerade.' }),
  row('Farbe', input('color', state.pathColor, (v) => { state.pathColor = v; drawBoard(); }, 'path-color')),
  undoBtn,
  h('h2', { text: 'Ebenen (oben zuerst)' }),
  layerList,
  h('h2', { text: 'Logo' }),
  logoList,
  row('Datei (SVG/PNG)', logoFile),
  row('Logo-Name', logoName),
  logoUploadBtn,
  h('h2', { text: 'Farbfelder' }),
  fieldColor('engines', 'Triebwerke'),
  fieldColor('wings', 'Flügel'),
  fieldColor('tailplane', 'Höhenleitwerk'),
  h('h2', { text: 'Datei' }),
  saveBtn,
  status,
);
renderLayerPanel();
drawBoard();
void loadSightings();
const typing = () => {
  const a = document.activeElement as HTMLElement | null;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.draft.points.length) { state.draft = { points: [] }; drawBoard(); }
    else if (!typing() && state.selected !== null) selectLayer(null);
    return;
  }
  if (e.code === 'Space' && !e.repeat && !typing()) { e.preventDefault(); board.classList.add('preview'); }
});
document.addEventListener('keyup', (e) => { if (e.code === 'Space') board.classList.remove('preview'); });
window.addEventListener('blur', () => board.classList.remove('preview'));
