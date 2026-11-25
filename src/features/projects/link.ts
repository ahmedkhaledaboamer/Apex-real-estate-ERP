import { communityBySlug } from '@/mocks/core'
import { offplanById } from '@/mocks/domain'
import type { Project } from '@/types/projects'

/** What a project is about: its off-plan project and/or community (label + photo), or internal. */
export function projectLink(p: Pick<Project, 'offplanId' | 'communitySlug'>) {
  const op = offplanById(p.offplanId)
  const c = communityBySlug(p.communitySlug ?? op?.communitySlug)
  if (op) return { kind: 'Off-plan' as const, label: op.name, sub: c?.name, image: op.image }
  if (c) return { kind: 'Community' as const, label: c.name, sub: c.zone, image: c.image }
  return null
}
