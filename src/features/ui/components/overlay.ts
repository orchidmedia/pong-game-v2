export interface OverlayProps {
  children: HTMLElement[]
  transparent?: boolean
  className?: string
}

export function createOverlay(props: OverlayProps): HTMLDivElement {
  const el = document.createElement('div')
  el.className = ['ui-overlay', props.transparent ? 'ui-overlay--transparent' : '', props.className ?? ''].filter(Boolean).join(' ')
  props.children.forEach(c => el.appendChild(c))
  return el
}
