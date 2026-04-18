export function createLoadingSpinner(className?: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = ['ui-spinner', className ?? ''].filter(Boolean).join(' ')
  return el
}

export function createErrorMessage(message: string, onDismiss?: () => void): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'ui-error-msg'
  el.textContent = message
  if (onDismiss) {
    const btn = document.createElement('button')
    btn.textContent = 'Retry'; btn.className = 'ui-btn ui-btn--secondary'
    btn.style.marginTop = '8px'
    btn.addEventListener('click', onDismiss)
    el.appendChild(btn)
  }
  return el
}

export function createSuccessMessage(message: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'ui-success-msg'
  el.textContent = message
  return el
}
