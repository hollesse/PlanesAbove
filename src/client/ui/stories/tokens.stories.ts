import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderBadge } from '../atoms/badge';
import { LOGO_IDS, renderLogo } from '../atoms/logo';
import { renderPlaneSilhouette } from '../atoms/plane-silhouette';
import { renderSky } from '../atoms/sky';
import { renderText, TEXT_STYLES, type TextStyle } from '../atoms/text';
import { h } from '../dom';
import { ALL_SKIES, PLANE_TYPES, SKY_TIMES, SKY_WEATHERS, skyId, type PlaneType, type SkyTime, type SkyWeather } from '../domain/catalog';
import { COLORS, FONTS, GLOW_BLUR } from '../domain/tokens';
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

export const Schein: StoryObj = {
  render: () => {
    const sample = (cls: string, ink: string, bg: string, glow: { name: string; value: string }) =>
      h(
        'div',
        { style: 'container-type:inline-size;min-width:0' },
        h('div', { style: `background:${bg};color:${ink};padding:28px 16px;font-family:var(--pa-font-mono);font-size:20px` }, h('span', { class: cls, text: 'Frankfurt → New York' })),
        h('span', { class: 'pa-eyebrow', style: 'font-size:11px', text: `${glow.name} ${glow.value}` }),
      );
    return h(
      'div',
      { style: 'display:flex;flex-direction:column;gap:16px' },
      h('div', { class: 'pa-eyebrow', text: `${GLOW_BLUR.token} ${GLOW_BLUR.value} · ${GLOW_BLUR.name}` }),
      grid(
        [
          { caption: '', el: sample('pa-glow-on-light-ink', COLORS.skyInkLight.value, '#6C8CA8', COLORS.skyGlowOnLightInk) },
          { caption: '', el: sample('pa-glow-on-dark-ink', COLORS.skyInkDark.value, '#E8DFC8', COLORS.skyGlowOnDarkInk) },
        ],
        260,
      ),
    );
  },
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

