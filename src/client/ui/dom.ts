// Tiny DOM helper shared by all components (framework-free).
export interface HProps {
  class?: string;
  style?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
  data?: Record<string, string>;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: HProps = {}, ...children: (Node | string | null | undefined)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (props.class) e.className = props.class;
  if (props.style) e.setAttribute('style', props.style);
  if (props.text !== undefined) e.textContent = props.text;
  if (props.html !== undefined) e.innerHTML = props.html;
  for (const [k, v] of Object.entries(props.attrs ?? {})) e.setAttribute(k, v);
  for (const [k, v] of Object.entries(props.data ?? {})) e.dataset[k] = v;
  for (const c of children) if (c != null) e.append(c);
  return e;
}

/** Make an inline <svg> string scale to its container width. */
export const fluidSvg = (svg: string): string => svg.replace('<svg ', '<svg style="display:block;width:100%;height:auto" ');
