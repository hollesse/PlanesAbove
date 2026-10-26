import { h } from '../dom';
import { renderBadgeSlot, renderPlaneSlot } from '../organisms/scene-layer';
import { renderInfoBar, type InfoBarProps } from '../organisms/info-bar';
import { renderSceneHeader } from '../molecules/scene-header';
import { SAMPLE_CLOCK, SAMPLE_FLIGHTS, SAMPLE_PLACE, SAMPLE_PLANES } from '../domain/samples';
import { renderSkyLayer, renderStage, type ScreenAspect } from '../templates/screen';
import { DURATION, type Anim, type BarSpec, type Layer, type TransitionSpec } from './catalog';

const barProps = (b: BarSpec): InfoBarProps =>
  b.kind === 'single' ? { variant: 'single', flight: SAMPLE_FLIGHTS[b.flight] }
  : b.kind === 'double' ? { variant: 'double', flights: [SAMPLE_FLIGHTS[b.flights[0]], SAMPLE_FLIGHTS[b.flights[1]]] }
  : { variant: 'recent', text: b.text };

/** Attach a paused one-shot animation (initial frame visible until played). */
export function applyAnimation(el: HTMLElement, anim: Anim): void {
  el.dataset.animName = anim.name;
  el.dataset.animTiming = anim.timing;
  el.style.setProperty('animation', `${anim.name} ${DURATION} ${anim.timing} 1 both paused`);
}

function buildLayer(layer: Layer): HTMLElement {
  let el: HTMLElement;
  switch (layer.kind) {
    case 'sky': el = renderSkyLayer(layer.sky); break;
    case 'header': el = renderSceneHeader({ place: SAMPLE_PLACE, clock: SAMPLE_CLOCK, ink: layer.ink }); break;
    case 'plane': el = renderPlaneSlot(layer.slot, SAMPLE_PLANES[layer.plane]); break;
    case 'badge': el = renderBadgeSlot(layer.n); break;
    case 'bar': el = renderInfoBar(barProps(layer.bar)); break;
  }
  if (layer.anim) applyAnimation(el, layer.anim);
  return el;
}

/** The screen of a transition in its start state, all animations paused. */
export function renderTransitionStage(spec: TransitionSpec, aspect: ScreenAspect = '4:3'): HTMLElement {
  const stage = renderStage(aspect);
  stage.dataset.transition = spec.id;
  stage.append(...spec.layers.map(buildLayer));
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

export interface TransitionProps { spec: TransitionSpec; aspect?: ScreenAspect; autoplay?: boolean }

/** Pages/Übergänge: a playable transition (label, "Start ▸" button, screen). */
export function renderTransition({ spec, aspect = '4:3', autoplay = false }: TransitionProps): HTMLElement {
  const stage = renderTransitionStage(spec, aspect);
  const btn = h('button', { class: 'pa-play', text: 'Start ▸', attrs: { type: 'button' } });
  btn.addEventListener('click', () => playTransition(stage));
  const root = h('div', { class: 'pa-transition', data: { transition: spec.id } }, h('div', { class: 'pa-transition-head' }, h('span', { class: 'pa-eyebrow', text: `${spec.label} · 5 s` }), btn), stage);
  if (autoplay) requestAnimationFrame(() => playTransition(stage));
  return root;
}
