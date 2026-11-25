/**
 * Mock backend. Each collection is seeded from `src/mocks`, kept in memory and persisted to
 * localStorage, so anything created/edited in the UI survives a reload (Settings → "Reset demo data"
 * clears it). Every call is async with a small latency, exactly like a real API — when the backend
 * arrives, only this layer (and `createResource`) changes; screens keep using the same hooks.
 */
export interface Entity {
  id: string
}

const PREFIX = 'erp-db-v1:'
const registry = new Map<string, Collection<Entity>>()

const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180))

export class Collection<T extends Entity> {
  private rows: T[] | null = null
  constructor(
    readonly name: string,
    private readonly seed: () => T[],
  ) {
    registry.set(name, this as unknown as Collection<Entity>)
  }

  /** Synchronous access (for mock cross-references and derived reports). */
  all(): T[] {
    if (!this.rows) {
      let stored: T[] | null = null
      try {
        const raw = localStorage.getItem(PREFIX + this.name)
        if (raw) stored = JSON.parse(raw) as T[]
      } catch {
        stored = null
      }
      this.rows = stored ?? this.seed()
    }
    return this.rows
  }
  private save() {
    try {
      localStorage.setItem(PREFIX + this.name, JSON.stringify(this.rows))
    } catch {
      /* storage full / private mode: keep in memory */
    }
  }
  byId(id: string) {
    return this.all().find((r) => r.id === id)
  }

  async list(): Promise<T[]> {
    await latency()
    return [...this.all()]
  }
  async get(id: string): Promise<T> {
    await latency()
    const row = this.byId(id)
    if (!row) throw new Error(`${this.name} ${id} not found`)
    return row
  }
  async create(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    await latency()
    const row = { ...data, id: data.id ?? newId(this.name) } as T
    this.rows = [row, ...this.all()]
    this.save()
    return row
  }
  async update(id: string, patch: Partial<T>): Promise<T> {
    await latency()
    let updated: T | undefined
    this.rows = this.all().map((r) => (r.id === id ? (updated = { ...r, ...patch, id }) : r))
    if (!updated) throw new Error(`${this.name} ${id} not found`)
    this.save()
    return updated
  }
  async remove(id: string): Promise<void> {
    await latency()
    this.rows = this.all().filter((r) => r.id !== id)
    this.save()
  }
  reset() {
    this.rows = null
    localStorage.removeItem(PREFIX + this.name)
  }
}

let counter = 0
export function newId(prefix: string) {
  counter += 1
  return `${prefix.replace(/^re-/, '').slice(0, 4)}_${Date.now().toString(36)}${counter.toString(36)}`
}

/** Settings → Reset demo data. */
export function resetAllCollections() {
  for (const c of registry.values()) c.reset()
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k)
}

/**
 * Load every registered collection now (from localStorage or its seed). Called once at start-up, so seeds
 * that pick related records by position always see the original seed data — never records the user has
 * created since (which would shift the picks and attach seeded deals/invoices to a new client).
 */
export function materializeAll() {
  for (const c of registry.values()) c.all()
}
