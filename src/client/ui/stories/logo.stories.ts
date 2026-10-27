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

const meta: Meta = { title: 'Atoms/Logo' };
export default meta;
export const Logo: StoryObj<{ id: string }> = {
  args: { id: 'lufthansa' },
  argTypes: { id: { control: 'select', options: LOGO_IDS } },
  render: (a) => h('div', { style: 'width:200px;background:#C9D6E1;padding:12px' }, renderLogo({ id: a.id })),
};

export const AlleLogos: StoryObj = {
  name: 'Alle Logos',
  render: () => grid(LOGO_IDS.map((id) => ({ caption: id, el: h('div', { style: 'background:#C9D6E1;padding:12px' }, renderLogo({ id })) })), 160),
};

