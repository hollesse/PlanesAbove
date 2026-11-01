import { h } from '../../../src/client/ui/dom';
import { PLANE_PARTS } from '../../../src/client/ui/assets/generated/plane-parts';
import { FIELD_DEFAULTS, renderLiverySvg } from '../../../src/client/ui/domain/livery-render';
import type { LiveryFile } from '../../../src/client/ui/domain/livery-file';
import { addPoint, closeDraft, closesAt, snap, CLOSE_RADIUS, type Draft } from '../board';

// Walking-skeleton editor (spike): Typklasse choice, board with silhouette/details opacity, path tool, one colour, save.
const typklassen = Object.keys(PLANE_PARTS);
const state = {
  file: { version: 1, livery: 'spike', typklasse: typklassen[0], fields: { ...FIELD_DEFAULTS }, layers: [] } as unknown as LiveryFile,
  draft: { points: [] } as Draft,
  pathColor: '#d6001c',
  silhouetteOpacity: 1,
  detailsOpacity: 1,
};
// the defaults are upper case in the renderer; the colour inputs and files use lower case
for (const k of Object.keys(state.file.fields) as (keyof LiveryFile['fields'])[]) state.file.fields[k] = state.file.fields[k]!.toLowerCase();

const board = document.getElementById('board')!;
const panel = document.getElementById('panel')!;
const status = h('div', { attrs: { id: 'status', 'data-testid': 'status' } });

function drawBoard() {
  const vb = PLANE_PARTS[state.file.typklasse].viewBox;
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.setAttribute('class', 'overlay');
  overlay.setAttribute('viewBox', vb);
  overlay.dataset.testid = 'overlay';
  const pts = state.draft.points;
  const toBoard = (e: MouseEvent) => {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(overlay.getScreenCTM()!.inverse());
    return snap(pt.x, pt.y);
  };
  if (pts.length) {
    overlay.innerHTML =
      `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${state.pathColor}" stroke-width="3"/>` +
      pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="${state.pathColor}" stroke-width="2"/>`).join('') +
      `<circle data-testid="first-point-ring" cx="${pts[0][0]}" cy="${pts[0][1]}" r="${CLOSE_RADIUS}" fill="none" stroke="${state.pathColor}" stroke-width="3" visibility="hidden"/>`;
  }
  overlay.addEventListener('click', (e) => {
    const p = toBoard(e);
    if (closesAt(state.draft, p)) {
      state.file = closeDraft(state.file, state.draft, state.pathColor);
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
  board.insertAdjacentHTML('afterbegin', renderLiverySvg(state.file, { silhouetteOpacity: state.silhouetteOpacity, detailsOpacity: state.detailsOpacity }));
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
undoBtn.addEventListener('click', () => { state.file = { ...state.file, layers: state.file.layers.slice(0, -1) }; state.draft = { points: [] }; drawBoard(); });

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
  h('div', { text: 'Klicks setzen Punkte; Klick auf den ersten Punkt schließt den Pfad, Escape verwirft den Entwurf.' }),
  row('Farbe', input('color', state.pathColor, (v) => { state.pathColor = v; drawBoard(); }, 'path-color')),
  undoBtn,
  h('h2', { text: 'Farbfelder' }),
  fieldColor('engines', 'Triebwerke'),
  fieldColor('wings', 'Flügel'),
  fieldColor('tailplane', 'Höhenleitwerk'),
  h('h2', { text: 'Datei' }),
  saveBtn,
  status,
);
drawBoard();
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { state.draft = { points: [] }; drawBoard(); }
});
