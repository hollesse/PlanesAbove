import { h } from '../../../src/client/ui/dom';
import { PLANE_PARTS } from '../../../src/client/ui/assets/generated/plane-parts';
import { FIELD_DEFAULTS, pathData, renderLiverySvg } from '../../../src/client/ui/domain/livery-render';
import type { LiveryFile, PathLayer } from '../../../src/client/ui/domain/livery-file';
import { layerLabel, moveItem, moveLayer, NAME_MAX, recolorLayer, removeItem, removeLayer, renameLayer, visibleFile, type Direction } from '../layers';
import { movePoint, segmentHandle, setVia } from '../curve';
import { addPoint, closeDraft, closesAt, snap, CLOSE_RADIUS, type Draft } from '../board';

// Walking-skeleton editor (spike): Typklasse choice, board with silhouette/details opacity, path tool, one colour, save.
const typklassen = Object.keys(PLANE_PARTS);
const state = {
  file: { version: 1, livery: 'spike', typklasse: typklassen[0], fields: { ...FIELD_DEFAULTS }, layers: [] } as unknown as LiveryFile,
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
  overlay.innerHTML = selOutline + handles + corners;
  if (pts.length) {
    overlay.innerHTML +=
      `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${state.pathColor}" stroke-width="3"/>` +
      pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="${state.pathColor}" stroke-width="2"/>`).join('') +
      `<circle data-testid="first-point-ring" cx="${pts[0][0]}" cy="${pts[0][1]}" r="${CLOSE_RADIUS}" fill="none" stroke="${state.pathColor}" stroke-width="3" visibility="hidden"/>`;
  }
  // a gesture that starts on a handle must not also add a draft point (its click bubbles to the overlay)
  overlay.addEventListener('mousedown', (e) => {
    const target = e.target as Element;
    const vertex = target.closest?.('.vertex-handle');
    const handle = vertex ?? target.closest?.('.curve-handle');
    if (!handle) { handleGesture = false; return; }
    handleGesture = true;
    e.preventDefault();
    const i = Number(handle.getAttribute(vertex ? 'data-vertex' : 'data-segment'));
    const move = (ev: MouseEvent) => {
      if (state.selected === null) return;
      const edit = vertex ? (l: PathLayer) => movePoint(l, i, toBoard(ev)) : (l: PathLayer) => setVia(l, i, toBoard(ev));
      state.file = { ...state.file, layers: state.file.layers.map((l, k) => (k === state.selected && l.type === 'path' ? edit(l) : l)) };
      drawBoard();
    };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  overlay.addEventListener('dblclick', (e) => {
    const handle = (e.target as Element).closest?.('.curve-handle');
    if (!handle || state.selected === null) return;
    const i = Number(handle.getAttribute('data-segment'));
    state.file = { ...state.file, layers: state.file.layers.map((l, k) => (k === state.selected && l.type === 'path' ? setVia(l, i, null) : l)) };
    drawBoard();
  });
  overlay.addEventListener('click', (e) => {
    if (handleGesture) { handleGesture = false; return; }
    const p = toBoard(e);
    if (closesAt(state.draft, p)) {
      state.file = closeDraft(state.file, state.draft, state.pathColor);
      state.hidden = [...state.hidden, false];
      state.selected = state.file.layers.length - 1;
      renderLayerPanel();
      state.draft = { points: [] };
      say(`Pfad geschlossen (${state.file.layers.length} Pfad/e).`);
    } else {
      state.draft = addPoint(state.draft, p);
    }
    drawBoard();
  });
  overlay.addEventListener('mousemove', (e) => {
    const ring = overlay.querySelector('[data-testid="first-point-ring"]');
    if (ring) ring.setAttribute('visibility', closesAt(state.draft, toBoard(e)) ? 'visible' : 'hidden');
  });
  board.replaceChildren();
  board.insertAdjacentHTML('afterbegin', renderLiverySvg(visibleFile(state.file, state.hidden), { silhouetteOpacity: state.silhouetteOpacity, detailsOpacity: state.detailsOpacity }));
  board.append(overlay);
}

function say(msg: string, error = false) { status.textContent = msg; status.className = error ? 'error' : ''; }

const input = (type: string, value: string, on: (v: string) => void, testid: string, extra: Record<string, string> = {}) => {
  const i = h('input', { attrs: { type, value, 'data-testid': testid, ...extra } });
  i.addEventListener('input', () => on(i.value));
  return i;
};
const row = (label: string, el: HTMLElement) => h('label', {}, h('span', { text: label }), el);

const select = h('select', { attrs: { 'data-testid': 'typklasse' } }, ...typklassen.map((t) => h('option', { text: t, attrs: { value: t } })));
select.addEventListener('change', () => { state.file = { ...state.file, typklasse: select.value }; state.draft = { points: [] }; drawBoard(); });

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
      nameEl.addEventListener('click', () => { editing = null; selectLayer(i); });
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

const saveBtn = h('button', { text: 'Speichern', attrs: { 'data-testid': 'save' } });
saveBtn.addEventListener('click', async () => {
  const res = await fetch('/__livery-editor/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state.file) });
  const body = (await res.json()) as { message: string };
  say(body.message, !res.ok);
});

const fieldColor = (k: 'engines' | 'wings' | 'tailplane', label: string) => row(label, input('color', state.file.fields[k]!, (v) => { state.file = { ...state.file, fields: { ...state.file.fields, [k]: v } }; drawBoard(); }, `field-${k}`));

panel.append(
  h('h2', { text: 'Lackierung' }),
  row('Lackierungs-ID', input('text', state.file.livery, (v) => { state.file = { ...state.file, livery: v }; }, 'livery-id')),
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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { state.draft = { points: [] }; drawBoard(); }
});
