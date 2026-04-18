export interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
}

export function createButton(props: ButtonProps): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.textContent = props.label
  btn.disabled = props.disabled ?? false
  btn.className = ['ui-btn', props.className ?? ''].filter(Boolean).join(' ')
  if (props.variant === 'secondary') btn.classList.add('ui-btn--secondary')
  if (props.variant === 'danger') btn.classList.add('ui-btn--danger')
  btn.addEventListener('click', props.onClick)
  return btn
}
