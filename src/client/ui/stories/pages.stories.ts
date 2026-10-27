import type { Meta, StoryObj } from '@storybook/html-vite';
import { EXAMPLE_PAGES } from '../pages/examples';
import { renderScreen, type ScreenAspect } from '../templates/screen';
import { aspectControl, grid } from './helpers';

const meta: Meta<{ aspect: ScreenAspect }> = { title: 'Pages/Beispielszenen', parameters: { layout: 'fullscreen' }, args: { aspect: '4:3' }, argTypes: { aspect: aspectControl } };
export default meta;

export const Alle: StoryObj<{ aspect: ScreenAspect }> = {
  name: 'Alle Beispielszenen',
  render: (a) => grid(EXAMPLE_PAGES.map((p) => ({ caption: p.label, el: renderScreen({ ...p.props, aspect: a.aspect }) })), 420),
};

export const Einzeln: StoryObj<{ aspect: ScreenAspect; page: string }> = {
  name: 'Einzelne Szene',
  args: { page: EXAMPLE_PAGES[0].id },
  argTypes: { page: { control: 'select', options: EXAMPLE_PAGES.map((p) => p.id) } },
  render: (a) => renderScreen({ ...EXAMPLE_PAGES.find((p) => p.id === a.page)!.props, aspect: a.aspect }),
};
