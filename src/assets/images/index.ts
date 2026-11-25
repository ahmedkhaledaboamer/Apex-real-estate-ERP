import logoUrl from '../logo-mark.webp'

/**
 * Self-hosted photography, pre-optimised to WebP at several widths
 * (`photos/<name>-<width>.webp`, generated from the original CDN JPGs).
 *
 * `IMG.<name>` is the ~960px variant (a sensible default `src`).
 * Pass the same value to `srcSetOf()` to get every width for `srcSet`.
 */
const files = import.meta.glob('./photos/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

type Variant = { w: number; url: string }
const variants: Record<string, Variant[]> = {}
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/\/([A-Za-z]+)-(\d+)\.webp$/)
  if (!m) continue
  ;(variants[m[1]] ??= []).push({ w: Number(m[2]), url })
}
for (const list of Object.values(variants)) list.sort((a, b) => a.w - b.w)

const srcSets = new Map<string, string>()
function pick(name: string) {
  const list = variants[name]
  if (!list?.length) throw new Error(`Missing optimised photo: ${name}`)
  const medium = [...list].reverse().find((v) => v.w <= 960) ?? list[0]
  srcSets.set(medium.url, list.map((v) => `${v.url} ${v.w}w`).join(', '))
  return medium.url
}

/** Logo mark, already cropped to the visible area of the original artwork. */
export const LOGO_URL = logoUrl

export const IMG = {
  hero: pick('hero'),
  coastBand: pick('coastBand'),

  marina: pick('marina'),
  downtown: pick('downtown'),
  palm: pick('palm'),
  businessBay: pick('businessBay'),
  jvc: pick('jvc'),
  dubaiHills: pick('dubaiHills'),
  creekHarbour: pick('creekHarbour'),
  damacLagoons: pick('damacLagoons'),

  villa: pick('villa'),
  living: pick('living'),
  kitchen: pick('kitchen'),
  bedroom: pick('bedroom'),
  pool: pick('pool'),
  balcony: pick('balcony'),

  offplanTower: pick('offplanTower'),
  offplanWaterfront: pick('offplanWaterfront'),
  offplanVillas: pick('offplanVillas'),

  layla: pick('layla'),
  daniel: pick('daniel'),
  omar: pick('omar'),
  sofia: pick('sofia'),

  report: pick('report'),
  couple: pick('couple'),
}

/** `srcSet` for an `IMG.*` value (undefined for anything else, so it is safe on any src). */
export function srcSetOf(src: string | undefined): string | undefined {
  return src ? srcSets.get(src) : undefined
}
