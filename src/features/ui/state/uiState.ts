import type { UIStateShape } from './types'

class UIStateManager {
  private state: UIStateShape = { loading: false, error: null, success: null }
  private loadingEl: HTMLDivElement | null = null

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading }
    if (loading) {
      if (!this.loadingEl) {
        this.loadingEl = document.createElement('div')
        this.loadingEl.className = 'ui-loading-overlay'
        this.loadingEl.innerHTML = '<div class="ui-spinner"></div>'
        document.body.appendChild(this.loadingEl)
      }
    } else {
      this.loadingEl?.remove(); this.loadingEl = null
    }
  }

  setError(message: string, code = 'UNKNOWN'): void {
    this.state = { ...this.state, error: { message, code } }
    this._showToast(message, 'error')
  }

  showSuccess(message: string): void {
    this.state = { ...this.state, success: { message } }
    this._showToast(message, 'success')
    setTimeout(() => { this.state = { ...this.state, success: null } }, 3000)
  }

  clearError(): void { this.state = { ...this.state, error: null } }
  clearSuccess(): void { this.state = { ...this.state, success: null } }
  getState(): UIStateShape { return { ...this.state } }

  private _showToast(message: string, type: 'success' | 'error'): void {
    const el = document.createElement('div')
    el.className = `ui-toast ui-toast--${type}`
    el.textContent = message
    if (type === 'error') {
      const btn = document.createElement('button')
      btn.textContent = '×'; btn.style.cssText = 'margin-left:8px;background:none;border:none;color:inherit;cursor:pointer;font-size:16px;'
      btn.onclick = () => el.remove()
      el.appendChild(btn)
    }
    document.body.appendChild(el)
    if (type === 'success') setTimeout(() => el.remove(), 3000)
  }
}

export const uiState = new UIStateManager()
