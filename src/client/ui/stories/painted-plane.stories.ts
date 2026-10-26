import type { Meta, StoryObj } from '@storybook/html-vite';
import { LOGO_IDS } from '../atoms/logo';
import { h } from '../dom';
import { PLANE_TYPES, type PlaneType } from '../domain/catalog';
import { LIVERIES } from '../domain/liveries';
import { renderPaintedPlane } from '../molecules/painted-plane';
import { grid } from './helpers';

const meta: Meta = { title: 'Molecules/Lackiertes Flugzeug' };
export default meta;

const liveryOptions = LIVERIES.map((l) => l.id);
const logoOptions = ['(Logo der Lackierung)', '(kein Logo)', ...LOGO_IDS.filter((i) => !i.endsWith('-tail'))];
const logoArg = (v: string) => (v === '(Logo der Lackierung)' ? undefined : v === '(kein Logo)' ? null : v);

interface Args { type: PlaneType; livery: string; logo: string }

export const Lackiert: StoryObj<Args> = {
  name: 'Typklasse x Lackierung x Logo',
  args: { type: 'narrowbody', livery: 'lh', logo: 'lufthansa' },
  argTypes: {
    type: { control: 'select', options: PLANE_TYPES.map((t) => t.id) },
    livery: { control: 'select', options: liveryOptions },
    logo: { control: 'select', options: logoOptions },
  },
  render: (a) => h('div', { class: 'pa-plane-backdrop', style: 'max-width:720px' }, renderPaintedPlane({ type: a.type, livery: a.livery, logo: logoArg(a.logo) })),
};

export const AlleLackierungen: StoryObj<{ type: PlaneType }> = {
  name: 'Alle Lackierungen einer Typklasse',
  args: { type: 'narrowbody' },
  argTypes: { type: { control: 'select', options: PLANE_TYPES.map((t) => t.id) } },
  render: (a) => grid(LIVERIES.map((l) => ({ caption: `${l.label} (${l.id})`, el: h('div', { class: 'pa-plane-backdrop' }, renderPaintedPlane({ type: a.type, livery: l.id })) })), 300),
};

export const AlleTypklassenEinerLackierung: StoryObj<{ livery: string }> = {
  name: 'Alle Typklassen einer Lackierung',
  args: { livery: 'condor' },
  argTypes: { livery: { control: 'select', options: liveryOptions } },
  render: (a) => grid(PLANE_TYPES.map((t) => ({ caption: `${t.label}${a.livery !== 'def' && (t.id === 'light-aircraft' || t.id === 'glider') ? ' · keine Lackierung' : ''}`, el: h('div', { class: 'pa-plane-backdrop' }, renderPaintedPlane({ type: t.id, livery: a.livery })) })), 300),
};

export const KeineLackierung: StoryObj = {
  name: 'Light Aircraft und Glider ohne Lackierung',
  render: () => grid((['light-aircraft', 'glider'] as const).flatMap((type) => [{ caption: `${type} · Default`, el: h('div', { class: 'pa-plane-backdrop' }, renderPaintedPlane({ type, livery: 'def' })) }, { caption: `${type} · mit Airline (keine Lackierung)`, el: renderPaintedPlane({ type, livery: 'lh' }) }]), 300),
};
