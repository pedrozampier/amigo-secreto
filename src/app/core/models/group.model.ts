/**
 * Contratos de `group` e `participant` — copiados VERBATIM de `docs/sdd.md` §4.
 * Não divergir destes campos sem atualizar o SDD na mesma mudança.
 */
export type GroupStatus = 'open' | 'drawing' | 'closed';

export interface Group {
  id: string;
  name: string;
  admin_id: string;
  status: GroupStatus;
  invite_token: string;
  min_participants: number;
  created_at: string;
}

export interface Participant {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  wish_list?: string;
  joined_at: string;
}

/** Retorno de `public.join_group_by_token` (migration 0004). Código estável em inglês (D-03). */
export interface JoinResult {
  code: 'OK' | 'INVALID_TOKEN' | 'GROUP_CLOSED' | 'ALREADY_MEMBER';
  group_id?: string;
}

/**
 * Retorno de `public.preview_group_by_token` (D-02).
 * SOMENTE nome e status. NUNCA acrescentar participantes nem contagem — isso
 * transformaria o invite_token num vazamento de quem está no grupo.
 */
export interface GroupPreview {
  name: string;
  status: GroupStatus;
}
