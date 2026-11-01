import { z } from 'zod';
import { PLANE_TYPE_IDS } from './catalog';

// Livery file (ADR 0031/0032): one airline on one Typklasse, only the designer's layers (uncut paths, later logos).
// Silhouette and details are NOT part of it; clipping to the silhouette happens at display time (livery-render.ts).

export const LIVERY_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** Optional display name for the editor's layer panel. */
const LayerName = z.string().max(40).optional();
const Point = z.tuple([z.number().finite(), z.number().finite()]);

export const PathLayerSchema = z.object({
  type: z.literal('path'),
  points: z.array(Point).min(3),
  /** Per segment (point i -> i+1, closing segment last) an optional point ON the curve; control point = 2*via - (a+b)/2. */
  via: z.array(Point.nullable()).optional(),
  color: Color,
  name: LayerName,
});
export const LogoLayerSchema = z.object({
  type: z.literal('logo'),
  src: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().finite(),
  rotation: z.number().finite(),
  name: LayerName,
});

export const FIELD_KEYS = ['engines', 'wings', 'tailplane'] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const LiveryFileSchema = z.object({
  version: z.literal(1),
  livery: z.string().regex(LIVERY_ID),
  typklasse: z.enum(PLANE_TYPE_IDS as [string, ...string[]]),
  fields: z.object({ engines: Color.optional(), wings: Color.optional(), tailplane: Color.optional() }).strict(),
  layers: z.array(z.discriminatedUnion('type', [PathLayerSchema, LogoLayerSchema])),
});
export type PathLayer = z.infer<typeof PathLayerSchema>;
export type LogoLayer = z.infer<typeof LogoLayerSchema>;
export type LiveryFile = z.infer<typeof LiveryFileSchema>;
