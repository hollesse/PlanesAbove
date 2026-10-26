import type { Meta, StoryObj } from '@storybook/html-vite';
import { TRANSITIONS, TRANSITION_GROUPS, type TransitionGroup } from '../transitions/catalog';
import { renderTransition } from '../transitions/player';
import type { ScreenAspect } from '../templates/screen';
import { aspectControl, grid } from './helpers';

interface Args { aspect: ScreenAspect; autoplay: boolean }
const meta: Meta<Args> = {
  title: 'Pages/Übergänge',
  parameters: { layout: 'fullscreen' },
  args: { aspect: '4:3', autoplay: false },
  argTypes: { aspect: aspectControl, autoplay: { control: 'boolean' } },
};
export default meta;

const group = (g: TransitionGroup): StoryObj<Args> & { name: string } => ({
  name: g,
  render: (a) => grid(TRANSITIONS.filter((t) => t.group === g).map((t) => ({ caption: '', el: renderTransition({ spec: t, aspect: a.aspect, autoplay: a.autoplay }) })), 420),
});

export const FlugzeugKommt = group(TRANSITION_GROUPS[0]);
export const FlugzeugGeht = group(TRANSITION_GROUPS[1]);
export const FlugzeugWechselt = group(TRANSITION_GROUPS[2]);
export const WetterWechselt = group(TRANSITION_GROUPS[3]);
export const TageszeitWechselt = group(TRANSITION_GROUPS[4]);

export const Einzeln: StoryObj<Args & { transition: string }> = {
  name: 'Einzelner Übergang',
  args: { transition: TRANSITIONS[0].id, autoplay: true },
  argTypes: { transition: { control: 'select', options: TRANSITIONS.map((t) => t.id) } },
  render: (a) => renderTransition({ spec: TRANSITIONS.find((t) => t.id === a.transition)!, aspect: a.aspect, autoplay: a.autoplay }),
};
