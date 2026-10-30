import type { Meta, StoryObj } from '@storybook/html-vite';
import type { PlaneType } from '../domain/catalog';
import { sampleTransitionData } from '../domain/transition-samples';
import { EQUAL_TRANSITIONS, EQUAL_TRANSITION_GROUPS } from '../transitions/catalog-equal';
import { renderTransition } from '../transitions/player';
import { equalLayoutClass, EQUAL_LAYOUTS, renderEqualBadgeSlot, renderEqualPlaneSlot, type EqualLayout } from '../organisms/scene-layer-equal';
import type { ScreenAspect } from '../templates/screen';
import { aspectControl, grid } from './helpers';
import { retypeData, typeControl } from './equal-helpers';

// Entwurf (design-system-pyheh): the plane transitions for equal-sized slots, same player and 5 s timer as Pages/Übergänge.
interface Args { aspect: ScreenAspect; autoplay: boolean; typeOne: PlaneType; typeTwo: PlaneType; layout: EqualLayout }
const meta: Meta<Args> = {
  title: 'Pages/Entwurf: Übergänge gleich groß',
  parameters: { layout: 'fullscreen' },
  args: { aspect: '4:3', autoplay: false, typeOne: 'narrowbody', typeTwo: 'widebody', layout: 'nebeneinander' },
  argTypes: {
    aspect: aspectControl, autoplay: { control: 'boolean' },
    typeOne: { ...typeControl, name: 'Typklasse Slot 1' },
    typeTwo: { ...typeControl, name: 'Typklasse Slot 2' },
    layout: { control: 'inline-radio', options: EQUAL_LAYOUTS },
  },
};
export default meta;

const slots = { plane: renderEqualPlaneSlot, badge: renderEqualBadgeSlot };

const group = (g: (typeof EQUAL_TRANSITION_GROUPS)[number]): StoryObj<Args> & { name: string } => ({
  name: g,
  render: (a) => grid(EQUAL_TRANSITIONS.filter((t) => t.group === g).map((t) => ({
    caption: '',
    el: renderTransition({ spec: t, aspect: a.aspect, autoplay: a.autoplay, slots, stageClass: equalLayoutClass(a.layout), data: retypeData(sampleTransitionData(t.id), [a.typeOne, a.typeTwo]) }),
  })), 420),
});

export const FlugzeugKommt = group(EQUAL_TRANSITION_GROUPS[0]);
export const FlugzeugGeht = group(EQUAL_TRANSITION_GROUPS[1]);
export const FlugzeugWechselt = group(EQUAL_TRANSITION_GROUPS[2]);
