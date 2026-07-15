/**
 * Normaliza relações to-one (N→1) retornadas pelo PostgREST.
 *
 * Em runtime o Supabase retorna joins via FK (ex.: `tags(name)` a partir de
 * profile_tags) como OBJETO, mas o cliente sem tipos gerados infere ARRAY.
 * Este helper aceita as duas formas e devolve sempre o objeto (ou null),
 * evitando `as unknown as` e crashes do tipo "x.map is not a function".
 */
export function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel ?? null
}
