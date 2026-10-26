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

const meta: Meta = { title: 'Atoms/Himmel' };
export default meta;
export const Himmel: StoryObj<{ time: SkyTime; weather: SkyWeather }> = {
  name: 'Himmel (Tageszeit x Wetterlage)',
  args: { time: 'day', weather: 'light' },
  argTypes: { time: { control: 'select', options: TIME_IDS }, weather: { control: 'select', options: WEATHER_IDS } },
  render: (a) => h('div', { style: 'max-width:720px;border:2px solid #1F2A33' }, renderSky({ time: a.time, weather: a.weather })),
};

export const AlleHimmel: StoryObj = {
  name: 'Alle 28 Himmel',
  render: () => grid(ALL_SKIES.map((k) => ({ caption: `${skyId(k)} · ${SKY_TIMES.find((t) => t.id === k.time)!.label} / ${SKY_WEATHERS.find((w) => w.id === k.weather)!.label}`, el: h('div', { style: 'border:2px solid #1F2A33' }, renderSky(k)) })), 260),
};

