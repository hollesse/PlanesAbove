import { h } from '../dom';
import { ALL_SKIES, SKY_TIMES, SKY_WEATHERS, skyId, type SkyKey, type SkyTime, type SkyWeather } from '../domain/catalog';
import { renderSkyLayer, renderStage, type ScreenAspect } from '../templates/screen';

export const ASPECTS: ScreenAspect[] = ['4:3', '5:3'];
export const TIME_IDS = SKY_TIMES.map((t) => t.id);
export const WEATHER_IDS = SKY_WEATHERS.map((w) => w.id);

export const timeControl = { control: 'select', options: TIME_IDS, labels: undefined } as const;
export const weatherControl = { control: 'select', options: WEATHER_IDS } as const;
export const aspectControl = { control: 'inline-radio', options: ASPECTS } as const;

export const skyKey = (time: SkyTime, weather: SkyWeather): SkyKey => ({ time, weather });

/** Responsive grid of captioned items. */
export function grid(items: { caption: string; el: HTMLElement }[], minWidth = 240): HTMLElement {
  return h(
    'div',
    { style: `display:grid;grid-template-columns:repeat(auto-fill,minmax(${minWidth}px,1fr));gap:20px` },
    ...items.map(({ caption, el }) => h('div', { style: 'display:flex;flex-direction:column;gap:6px;min-width:0' }, el, h('span', { class: 'pa-eyebrow', style: 'font-size:11px', text: caption }))),
  );
}

/** A screen-sized stage with a sky behind (for organisms/molecules that live on a screen). */
export function skyStage(sky: SkyKey, aspect: ScreenAspect, ...children: HTMLElement[]): HTMLElement {
  const stage = renderStage(aspect);
  stage.append(renderSkyLayer(sky), ...children);
  return stage;
}

export { ALL_SKIES, skyId };
