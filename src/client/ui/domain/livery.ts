import { LIVERIES, type LiveryDef } from './liveries';
import { NO_LIVERY_TYPES, type PlaneType } from './catalog';

export const DEFAULT_LIVERY_ID = 'def';

export const liveryById = (id: string | undefined | null): LiveryDef | undefined => LIVERIES.find((l) => l.id === id);

export interface ResolvedLivery {
  def: LiveryDef;
  /** false for Typklassen without liveries (Light Aircraft, Glider) combined with a non-default livery. */
  available: boolean;
  /** true when the requested livery id is unknown and the Standard-Lackierung was used instead. */
  fellBack: boolean;
}

/** Apply the livery rules: unknown id falls back to the Standard-Lackierung; small types have no airline liveries. */
export function resolveLivery(type: PlaneType, liveryId: string | undefined | null): ResolvedLivery {
  const requested = liveryById(liveryId ?? DEFAULT_LIVERY_ID);
  const def = requested ?? liveryById(DEFAULT_LIVERY_ID)!;
  const available = !(NO_LIVERY_TYPES.includes(type) && def.id !== DEFAULT_LIVERY_ID);
  return { def, available, fellBack: !requested };
}

// ---- Logo placement -------------------------------------------------------------------------

export type LogoAnchor = 'logo-tail-center' | 'logo-tail-mid' | 'logo-tail-base' | 'logo-fuselage-fwd' | 'logo-tail-lead' | 'logo-tail-fit' | 'logo-tail';

/** Anchors a logo asset can declare via data-anchor, in the order the drafts try them. */
export const LOGO_ANCHORS: readonly LogoAnchor[] = ['logo-tail-center', 'logo-tail-mid', 'logo-tail-base', 'logo-fuselage-fwd', 'logo-tail-lead'];

export function anchorOf(logoSvg: string): LogoAnchor {
  for (const a of LOGO_ANCHORS) if (logoSvg.includes(`data-anchor="${a}"`)) return a;
  if (logoSvg.includes('data-anchor="logo-tail-fit"')) return 'logo-tail-fit';
  return 'logo-tail';
}

const stripXml = (s: string) => s.replace(/<\?xml[^>]*>/, '');
/** Nest a logo inside an anchor group, keeping the logo's own viewBox as its coordinate frame. */
const nestKeepViewBox = (s: string) =>
  stripXml(s).replace(/<svg [^>]*viewBox="([^"]+)"[^>]*>/, (_q, vb: string) => {
    const v = vb.split(' ');
    return `<svg x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}" viewBox="${vb}" overflow="visible">`;
  });
/** Nest a logo inside an anchor group as a 100x100 box. */
const nestSquare = (s: string) => stripXml(s).replace(/<svg [^>]*>/, '<svg width="100" height="100" viewBox="0 0 100 100" overflow="visible">');
const fill = (html: string, cls: string, inner: string) => html.replace(new RegExp(`<g class="${cls}"([^>]*)></g>`), (_m, a: string) => `<g class="${cls}"${a}>${inner}</g>`);

/** Put a logo (and its optional "-tail" companion) into the anchor groups of a plane silhouette. */
export function placeLogo(planeSvg: string, logoSvg?: string, tailLogoSvg?: string): string {
  let html = planeSvg;
  if (tailLogoSvg) html = fill(html, 'logo-tail-fit', nestKeepViewBox(tailLogoSvg));
  if (!logoSvg) return html;
  const anchor = anchorOf(logoSvg);
  if (anchor === 'logo-tail-center' || anchor === 'logo-tail-mid') return fill(html, anchor, nestSquare(logoSvg));
  if (anchor === 'logo-tail-base' || anchor === 'logo-fuselage-fwd' || anchor === 'logo-tail-lead') return fill(html, anchor, nestKeepViewBox(logoSvg));
  if (anchor === 'logo-tail-fit') return html; // the -tail variant handled above
  return fill(html, 'logo-tail', nestSquare(logoSvg));
}
