import { NO_LIVERY_TYPES, PLANE_TYPES, PLANE_TYPE_IDS, type PlaneType } from '../domain/catalog';
import type { TransitionData } from '../transitions/catalog';
import type { ScreenPlane } from '../templates/screen';

/** The Typklasse control: one `select` with all ten classes (per slot). */
export const typeControl = { control: 'select', options: PLANE_TYPE_IDS } as const;

const label = (t: PlaneType) => PLANE_TYPES.find((x) => x.id === t)!.label;

/** A sample plane re-typed to a Typklasse; classes without own liveries (light-aircraft, glider) get the Standard-Lackierung. */
export function withType(p: ScreenPlane, type: PlaneType): ScreenPlane {
  const noLivery = NO_LIVERY_TYPES.includes(type);
  return { plane: { ...p.plane, type, livery: noLivery ? 'def' : p.plane.livery, logo: noLivery ? null : p.plane.logo }, flight: { ...p.flight, aircraft: label(type) } };
}

/**
 * Re-type the planes of transition data. A plane keeps its Typklasse across the change (identified by its flight),
 * a newly arriving plane takes the type of the slot index it arrives in.
 */
export function retypeData(data: TransitionData, types: [PlaneType, PlaneType]): TransitionData {
  const from = data.from.map((p, i) => withType(p, types[i]));
  const to = data.to.map((p, j) => {
    const i = data.from.findIndex((f) => f.flight === p.flight);
    return withType(p, types[i >= 0 ? i : j]);
  });
  return { ...data, from, to };
}
