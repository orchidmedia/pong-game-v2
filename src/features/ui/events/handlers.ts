export class EventHandlerRegistry {
  private map: Map<string, Array<(p?: unknown) => void>> = new Map()
  register(event: string, handler: (p?: unknown) => void): void {
    if (!this.map.has(event)) this.map.set(event, [])
    this.map.get(event)!.push(handler)
  }
  unregister(event: string, handler: (p?: unknown) => void): void {
    const arr = this.map.get(event) ?? []
    this.map.set(event, arr.filter(h => h !== handler))
  }
  getHandlers(event: string): Array<(p?: unknown) => void> {
    return this.map.get(event) ?? []
  }
  clear(): void { this.map.clear() }
}
