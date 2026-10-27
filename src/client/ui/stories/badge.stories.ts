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

const meta: Meta = { title: 'Atoms/Nummern-Plakette' };
export default meta;
export const Plakette: StoryObj<{ n: number }> = {
  args: { n: 1 },
  argTypes: { n: { control: { type: 'inline-radio' }, options: [1, 2] } },
  render: (a) => h('div', { class: 'pa-screen', style: 'width:600px;container-type:inline-size;border:none;background:transparent' }, renderBadge({ n: a.n })),
};

