import { IMG } from '@/assets/images'
import type { Agent, AgentProfile } from './types'

/* PLACEHOLDER DATA — agents and BRNs are fictional. Replace with the API later. */

export const AGENTS: Agent[] = [
  { id: 'layla', name: 'Layla Haddad', role: 'Senior Sales Consultant', photo: IMG.layla, languages: ['Arabic', 'English'], communities: ['Dubai Marina', 'JBR'], brn: '48213' },
  { id: 'daniel', name: 'Daniel Moore', role: 'Off-Plan Advisor', photo: IMG.daniel, languages: ['English', 'Russian'], communities: ['Business Bay', 'Creek Harbour'], brn: '51907' },
  { id: 'omar', name: 'Omar Siddiqui', role: 'Leasing Manager', photo: IMG.omar, languages: ['English', 'Hindi', 'Urdu'], communities: ['JVC', 'Arjan'], brn: '46658' },
  { id: 'sofia', name: 'Sofia Petrova', role: 'Luxury Homes Director', photo: IMG.sofia, languages: ['Russian', 'English', 'French'], communities: ['Palm Jumeirah', 'Dubai Hills'], brn: '50342' },
]

export const agentById = (id: string) => AGENTS.find((a) => a.id === id) ?? AGENTS[0]

const EXTRA: Record<string, Omit<AgentProfile, keyof Agent>> = {
  layla: { slug: 'layla-haddad', bio: 'Layla has sold homes in Dubai Marina and JBR for nine years. She is known for honest shortlists, explaining every fee up front and handling the transfer end to end.', phone: '+971 50 000 0001', whatsapp: '971500000001', email: 'layla@apexaora.ae', yearsExperience: 9, dealsClosed: 240, specialities: ['Waterfront apartments', 'First-time buyers', 'Mortgage-backed purchases'] },
  daniel: { slug: 'daniel-moore', bio: 'Daniel advises on off-plan purchases across Business Bay and Creek Harbour, with a focus on payment plans, escrow checks and developer track records.', phone: '+971 50 000 0002', whatsapp: '971500000002', email: 'daniel@apexaora.ae', yearsExperience: 7, dealsClosed: 180, specialities: ['Off-plan launches', 'Payment plans', 'Investor portfolios'] },
  omar: { slug: 'omar-siddiqui', bio: 'Omar leads our leasing team in JVC and Arjan, matching tenants to well-managed buildings and helping landlords keep vacancy low.', phone: '+971 50 000 0003', whatsapp: '971500000003', email: 'omar@apexaora.ae', yearsExperience: 6, dealsClosed: 410, specialities: ['Leasing', 'Property management', 'Yield-focused buys'] },
  sofia: { slug: 'sofia-petrova', bio: 'Sofia heads our luxury homes desk, representing villas and penthouses on Palm Jumeirah and in Dubai Hills Estate for international buyers.', phone: '+971 50 000 0004', whatsapp: '971500000004', email: 'sofia@apexaora.ae', yearsExperience: 12, dealsClosed: 150, specialities: ['Ultra-prime villas', 'International buyers', 'Golden Visa purchases'] },
}

export const AGENT_PROFILES: AgentProfile[] = AGENTS.map((a) => ({ ...a, ...EXTRA[a.id] }))

export const agentBySlug = (slug: string) => AGENT_PROFILES.find((a) => a.slug === slug)
export const agentProfileById = (id: string) => AGENT_PROFILES.find((a) => a.id === id) ?? AGENT_PROFILES[0]
