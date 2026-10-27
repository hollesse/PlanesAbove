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

const meta: Meta = { title: 'Atoms/Textstile' };
export default meta;
export const Textstile: StoryObj<{ style: TextStyle; text: string }> = {
  args: { style: 'route', text: 'Frankfurt → New York' },
  argTypes: { style: { control: 'inline-radio', options: TEXT_STYLES } },
  render: (a) => h('div', { class: 'pa-screen', style: 'container-type:inline-size;border:none;background:transparent' }, h('div', { style: 'font-size:3cqw' }, renderText({ style: a.style, text: a.text }))),
};
