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

/**
 * Contrato de `draw` — copiado de `docs/sdd.md` §4. `giver_id`/`receiver_id` apontam
 * para `participant.id`, NUNCA para `user_id`/`profile.id` (ver STATE.md).
 */
export interface Draw {
  id: string;
  group_id: string;
  giver_id: string;
  receiver_id: string;
  created_at: string;
}

/**
 * Formato devolvido por `DrawService.getMyResult()` — a projeção do join embedado de
 * D-07 (`draw` + `participant!draw_receiver_id_fkey`). Só os campos que a revelação
 * precisa: nome de quem foi tirado e a wishlist dessa pessoa (DRAW-08/09).
 */
export interface DrawResult {
  id: string;
  receiver: Pick<Participant, 'display_name' | 'wish_list'>;
}
