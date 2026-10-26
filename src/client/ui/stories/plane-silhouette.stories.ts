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

const meta: Meta = { title: 'Atoms/Flugzeug-Silhouette' };
export default meta;
export const Typklasse: StoryObj<{ type: PlaneType }> = {
  name: 'Typklasse (unlackiert)',
  args: { type: 'narrowbody' },
  argTypes: { type: { control: 'select', options: PLANE_TYPES.map((t) => t.id) } },
  render: (a) => h('div', { class: 'pa-plane-backdrop', style: 'max-width:720px' }, renderPlaneSilhouette({ type: a.type })),
};

export const AlleTypklassen: StoryObj = {
  name: 'Alle 10 Typklassen',
  render: () => grid(PLANE_TYPES.map((t) => ({ caption: `${t.label} · ${t.id}.svg`, el: h('div', { class: 'pa-plane-backdrop' }, renderPlaneSilhouette({ type: t.id })) })), 320),
};

