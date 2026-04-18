export interface InputProps {
  type?: 'text' | 'password' | 'email'
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
  maxLength?: number
  id?: string
}

export function createInput(props: InputProps): HTMLInputElement {
  const input = document.createElement('input')
  input.type = props.type ?? 'text'
  if (props.placeholder) input.placeholder = props.placeholder
  if (props.value)       input.value = props.value
  if (props.disabled)    input.disabled = true
  if (props.maxLength)   input.maxLength = props.maxLength
  if (props.id)          input.id = props.id
  input.className = ['ui-input', props.className ?? ''].filter(Boolean).join(' ')
  input.autocomplete = 'off'
  input.spellcheck = false
  if (props.onChange) input.addEventListener('input', () => props.onChange!(input.value))
  return input
}
