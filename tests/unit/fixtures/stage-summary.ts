import { createHash } from 'node:crypto';

/** Per layer: slot classes, animation name/timing and a hash of the full markup (visual identity of the stage). */
export function stageSummary(stage: HTMLElement) {
  return {
    stageClass: stage.className,
    transition: stage.dataset.transition,
    layers: Array.from(stage.children).map((el) => {
      const c = el.cloneNode(true) as HTMLElement;
      c.removeAttribute('data-side');
      c.removeAttribute('data-index');
      c.querySelectorAll('[data-side],[data-index]').forEach((n) => { n.removeAttribute('data-side'); n.removeAttribute('data-index'); });
      return {
        cls: el.className,
        anim: (el as HTMLElement).dataset.animName ?? null,
        timing: (el as HTMLElement).dataset.animTiming ?? null,
        hash: createHash('sha1').update(c.outerHTML).digest('hex').slice(0, 12),
      };
    }),
  };
}
