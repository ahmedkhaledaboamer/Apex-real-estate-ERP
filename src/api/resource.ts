import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/Toast'
import { Collection, type Entity } from './db'

/**
 * One call gives a module its data layer: the collection (mock "table") plus React Query hooks.
 *
 *   export const bookings = createResource<Booking>('bookings', seedBookings, { label: 'Booking' })
 *   const { data, isLoading } = bookings.useList()
 *   const create = bookings.useCreate();  create.mutate({...})
 *
 * Mutations invalidate the list, show a toast, and keep the cache in sync.
 */
export function createResource<T extends Entity>(name: string, seed: () => T[], opts: { label?: string } = {}) {
  const collection = new Collection<T>(name, seed)
  const label = opts.label ?? name
  const keys = {
    all: [name] as const,
    list: [name, 'list'] as const,
    item: (id: string) => [name, 'item', id] as const,
  }

  function useList() {
    return useQuery({ queryKey: keys.list, queryFn: () => collection.list() })
  }
  function useItem(id: string | undefined) {
    return useQuery({ queryKey: keys.item(id ?? ''), queryFn: () => collection.get(id!), enabled: !!id })
  }
  function useCreate() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (data: Omit<T, 'id'> & { id?: string }) => collection.create(data),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: keys.all })
        toast.success(`${label} created`)
      },
      onError: (e) => toast.error(String((e as Error).message)),
    })
  }
  function useUpdate(opts: { silent?: boolean } = {}) {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<T> }) => collection.update(id, patch),
      // Optimistic: lists (kanban drags, status toggles) update instantly.
      onMutate: async ({ id, patch }) => {
        await qc.cancelQueries({ queryKey: keys.list })
        const prev = qc.getQueryData<T[]>(keys.list)
        if (prev) qc.setQueryData<T[]>(keys.list, prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
        return { prev }
      },
      onError: (e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(keys.list, ctx.prev)
        toast.error(String((e as Error).message))
      },
      onSuccess: () => {
        if (!opts.silent) toast.success(`${label} updated`)
      },
      onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }
  function useRemove() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (id: string) => collection.remove(id),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: keys.all })
        toast.success(`${label} deleted`)
      },
    })
  }

  return { name, collection, keys, useList, useItem, useCreate, useUpdate, useRemove }
}
