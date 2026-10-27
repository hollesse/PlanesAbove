import { h } from '../dom';
import { renderBadgeSlot, renderPlaneSlot } from '../organisms/scene-layer';
import { renderInfoBar, type InfoBarProps } from '../organisms/info-bar';
import { renderSceneHeader } from '../molecules/scene-header';
import { sampleTransitionData } from '../domain/transition-samples';
import { skyInk } from '../domain/catalog';
import { renderSkyLayer, renderStage, type ScreenAspect } from '../templates/screen';
import { DURATION, type Anim, type BarSpec, type Layer, type PlaneRef, type TransitionData, type TransitionSpec } from './catalog';

const planeOf = (d: TransitionData, r: PlaneRef) => d[r.side][r.index];

/** Props for a bar, or null when a referenced flight / text is missing (the layer is then skipped). */
function barProps(b: BarSpec, d: TransitionData): InfoBarProps | null {
  if (b.kind === 'single') {
    const p = planeOf(d, b.flight);
    return p ? { variant: 'single', flight: p.flight } : null;
  }
  if (b.kind === 'double') {
    const [p1, p2] = [planeOf(d, b.flights[0]), planeOf(d, b.flights[1])];
    return p1 && p2 ? { variant: 'double', flights: [p1.flight, p2.flight] } : null;
  }
  const text = d.recent[b.text];
  return text === undefined ? null : { variant: 'recent', text };
}

/** Attach a paused one-shot animation (initial frame visible until played). */
export function applyAnimation(el: HTMLElement, anim: Anim): void {
  el.dataset.animName = anim.name;
  el.dataset.animTiming = anim.timing;
  el.style.setProperty('animation', `${anim.name} ${DURATION} ${anim.timing} 1 both paused`);
}

function buildLayer(layer: Layer, data: TransitionData): HTMLElement | null {
  let el: HTMLElement;
  switch (layer.kind) {
    case 'sky': el = renderSkyLayer(layer.sky ?? data.sky); break;
    case 'header': el = renderSceneHeader({ place: data.place, clock: data.clock, ink: layer.ink ?? skyInk(data.sky), stale: data.stale }); break;
    case 'plane': {
      const p = planeOf(data, layer.plane);
      if (!p) return null;
      el = renderPlaneSlot(layer.slot, p.plane);
      el.dataset.side = layer.plane.side;
      el.dataset.index = String(layer.plane.index);
      break;
    }
    case 'badge': {
      el = renderBadgeSlot(layer.n);
      // The badge belongs to the arriving state while it still has a plane there.
      el.dataset.side = data.to[layer.n - 1] ? 'to' : 'from';
      el.dataset.index = String(layer.n - 1);
      break;
    }
    case 'bar': {
      const props = barProps(layer.bar, data);
      if (!props) return null;
      el = renderInfoBar(props);
      el.dataset.side = layer.bar.kind === 'recent' ? layer.bar.text : layer.bar.kind === 'single' ? layer.bar.flight.side : layer.bar.flights[0].side;
      break;
    }
  }
  if (layer.anim) applyAnimation(el, layer.anim);
  return el;
}

/** The screen of a transition in its start state, all animations paused. Layers whose data is missing are skipped. */
export function renderTransitionStage(spec: TransitionSpec, data: TransitionData, aspect: ScreenAspect = '4:3'): HTMLElement {
  const stage = renderStage(aspect);
  stage.dataset.transition = spec.id;
  for (const layer of spec.layers) {
    const el = buildLayer(layer, data);
    if (el) stage.append(el);
  }
  return stage;
}

/** Restart every paused animation inside a screen and let it run once. */
export function playTransition(stage: HTMLElement): void {
  stage.querySelectorAll<HTMLElement>('[data-anim-name]').forEach((el) => {
    el.style.setProperty('animation-name', 'none');
    void el.offsetWidth;
    el.style.setProperty('animation-name', el.dataset.animName!);
    el.style.setProperty('animation-play-state', 'running');
  });
}

/** Back to the start frame (paused). */
export function resetTransition(stage: HTMLElement): void {
  stage.querySelectorAll<HTMLElement>('[data-anim-name]').forEach((el) => {
    el.style.setProperty('animation-name', 'none');
    void el.offsetWidth;
    el.style.setProperty('animation-name', el.dataset.animName!);
    el.style.setProperty('animation-play-state', 'paused');
  });
}

export interface TransitionProps { spec: TransitionSpec; aspect?: ScreenAspect; autoplay?: boolean; data?: TransitionData }

/** Pages/Übergänge: a playable transition (label, "Start ▸" button, screen). */
export function renderTransition({ spec, aspect = '4:3', autoplay = false, data = sampleTransitionData(spec.id) }: TransitionProps): HTMLElement {
  const stage = renderTransitionStage(spec, data, aspect);
  const btn = h('button', { class: 'pa-play', text: 'Start ▸', attrs: { type: 'button' } });
  btn.addEventListener('click', () => playTransition(stage));
  const root = h('div', { class: 'pa-transition', data: { transition: spec.id } }, h('div', { class: 'pa-transition-head' }, h('span', { class: 'pa-eyebrow', text: `${spec.label} · 5 s` }), btn), stage);
  if (autoplay) requestAnimationFrame(() => playTransition(stage));
  return root;
}
