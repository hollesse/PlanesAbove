import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderBadge } from '../atoms/badge';
import { LOGO_IDS, renderLogo } from '../atoms/logo';
import { renderPlaneSilhouette } from '../atoms/plane-silhouette';
import { renderSky } from '../atoms/sky';
import { renderText, TEXT_STYLES, type TextStyle } from '../atoms/text';
import { h } from '../dom';
import { ALL_SKIES, PLANE_TYPES, SKY_TIMES, SKY_WEATHERS, skyId, type PlaneType, type SkyTime, type SkyWeather } from '../domain/catalog';
import { COLORS, FONTS } from '../domain/tokens';
import { grid, TIME_IDS, WEATHER_IDS } from './helpers';

const meta: Meta = { title: 'Atoms/Tokens' };
export default meta;

export const Farben: StoryObj = {
  render: () =>
    grid(
      Object.values(COLORS).map((c) => ({
        caption: `${c.name} ${c.value}`,
        el: h('div', { style: `height:72px;background:${c.value};border:2px solid #1F2A33` }),
      })),
      180,
    ),
};

export const Typografie: StoryObj = {
  render: () =>
    h(
      'div',
      { style: 'display:flex;flex-direction:column;gap:16px' },
      h('div', { class: 'pa-eyebrow', text: `${FONTS.display.family} ${FONTS.display.weights.join('/')} · ${FONTS.display.role}` }),
      h('div', { style: "font-family:var(--pa-font-display);font-weight:900;font-size:48px;text-transform:uppercase", text: 'Frankfurt → New York' }),
      h('div', { class: 'pa-eyebrow', text: `${FONTS.mono.family} ${FONTS.mono.weights.join('/')} · ${FONTS.mono.role}` }),
      h('div', { style: 'font-family:var(--pa-font-mono);font-weight:400;font-size:20px', text: '11 300 m hoch · 870 km/h · im Horizontalflug (400)' }),
      h('div', { style: 'font-family:var(--pa-font-mono);font-weight:500;font-size:20px', text: '11 300 m hoch · 870 km/h · im Horizontalflug (500)' }),
    ),
};

