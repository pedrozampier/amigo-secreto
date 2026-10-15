import { Injectable, computed, inject, signal } from '@angular/core';
import { GENERIC_JOIN_ERROR, translateJoinError } from '../join-error-messages';
import type { Group, GroupPreview, JoinResult, Participant } from '../models/group.model';
import { AuthService } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Único service que concentra todo o acesso a `group`/`participant` (D-05, D-06).
 *
 * `joinByToken`/`previewByToken` passam por RPC (migration 0004) em vez de um INSERT
 * direto porque as policies da 0003 não permitem: a policy de INSERT em `participant`
 * exige `group_id in (select g.id from public.group g where g.status = 'open')`, e esse
 * subquery é ele mesmo filtrado por RLS — devolve zero linhas para quem ainda não é
 * participante. Um convidado novo também não consegue `SELECT` o grupo para resolver o
 * token (policies de `group` só cobrem admin ou membro). Os dois RPCs são
 * `SECURITY DEFINER` e revalidam token/status/membership no próprio corpo.
 */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly auth = inject(AuthService);

  private readonly _administered = signal<Group[]>([]);
  private readonly _participated = signal<Group[]>([]);
  private readonly _participants = signal<Participant[]>([]);
  private readonly _currentGroup = signal<Group | null>(null);

  readonly administered = this._administered.asReadonly();
  readonly participated = this._participated.asReadonly();
  readonly participants = this._participants.asReadonly();
  readonly currentGroup = this._currentGroup.asReadonly();

  /** A linha de `participant` do usuário logado — usada pelas telas de wishlist (WISH-01/02). */
  readonly meuParticipante = computed<Participant | null>(() => {
    const uid = this.auth.user()?.id;
    if (!uid) {
      return null;
    }
    return this._participants().find((p) => p.user_id === uid) ?? null;
  });

  /**
   * GRP-09. Uma query só: as duas policies de SELECT em `group` são ORed pela RLS,
   * então `select('*')` sem filtro devolve a união. A separação admin/participante
   * é feita aqui no cliente.
   */
  async refreshDashboard(): Promise<{ error: string | null }> {
    const uid = this.auth.user()?.id ?? null;
    const { data, error } = await this.supabase
      .from('group')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return { error: 'Não foi possível carregar seus grupos.' };
    }
    const grupos = (data ?? []) as Group[];
    this._administered.set(grupos.filter((g) => g.admin_id === uid));
    this._participated.set(grupos.filter((g) => g.admin_id !== uid));
    return { error: null };
  }

  /**
   * GRP-01 + GRP-02. `admin_id` é OBRIGATÓRIO no payload: a policy de INSERT é
   * `with check (admin_id = auth.uid())` — omitir faz o insert ser recusado.
   * `invite_token` NÃO é enviado: o default do schema
   * `encode(gen_random_bytes(16),'hex')` já o gera (GRP-02 sem código novo).
   * `.select().single()` no fim traz a linha criada já com o token.
   */
  async createGroup(name: string): Promise<{ group: Group | null; error: string | null }> {
    const uid = this.auth.user()?.id;
    if (!uid) {
      return { group: null, error: 'Você precisa estar autenticado para criar um grupo.' };
    }
    const { data, error } = await this.supabase
      .from('group')
      .insert({ name, admin_id: uid })
      .select()
      .single();
    if (error) {
      return { group: null, error: 'Não foi possível criar o grupo.' };
    }
    await this.refreshDashboard();
    return { group: data as Group, error: null };
  }

  /** GRP-04. */
  async loadGroup(groupId: string): Promise<{ group: Group | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('group')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();
    if (error) {
      return { group: null, error: 'Não foi possível carregar o grupo.' };
    }
    const group = (data ?? null) as Group | null;
    this._currentGroup.set(group);
    return { group, error: null };
  }

  async refreshParticipants(groupId: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase
      .from('participant')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });
    if (error) {
      return { error: 'Não foi possível carregar os participantes.' };
    }
    this._participants.set((data ?? []) as Participant[]);
    return { error: null };
  }

  /** GRP-05. Depois do delete, chama refreshParticipants(groupId) — D-05. */
  async removeParticipant(
    participantId: string,
    groupId: string,
  ): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('participant').delete().eq('id', participantId);
    if (error) {
      return { error: 'Não foi possível remover o participante.' };
    }
    await this.refreshParticipants(groupId);
    return { error: null };
  }

  /**
   * WISH-01/02. D-17 — HARDCODED a `{ wish_list: ... }`. A policy de UPDATE permitiria
   * a linha inteira (inclusive group_id e display_name); a restrição vive AQUI porque
   * nesta fase não há trigger. NUNCA transformar isto num `.update(partialGenerico)`.
   * O `.eq('id', participantId)` é redundante com a policy (`user_id = auth.uid()`),
   * que é o que de fato garante WISH-03 — mas mantém a intenção explícita.
   */
  async updateWishList(
    participantId: string,
    wishList: string,
    groupId: string,
  ): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('participant')
      .update({ wish_list: wishList })
      .eq('id', participantId);
    if (error) {
      return { error: 'Não foi possível salvar sua lista de desejos.' };
    }
    await this.refreshParticipants(groupId);
    return { error: null };
  }

  /** D-02. Chama o RPC preview. Devolve null se o token não existir. */
  async previewByToken(
    token: string,
  ): Promise<{ preview: GroupPreview | null; error: string | null }> {
    const { data, error } = await this.supabase.rpc('preview_group_by_token', {
      p_token: token,
    });
    if (error) {
      return { preview: null, error: GENERIC_JOIN_ERROR };
    }
    const linha = (data as GroupPreview[] | null)?.[0] ?? null;
    if (!linha) {
      return { preview: null, error: translateJoinError('INVALID_TOKEN') };
    }
    return { preview: linha, error: null };
  }

  /** GRP-06/07/08. Chama o RPC de join e traduz o código com translateJoinError. */
  async joinByToken(token: string): Promise<{ groupId: string | null; error: string | null }> {
    const { data, error } = await this.supabase.rpc('join_group_by_token', {
      p_token: token,
    });
    if (error) {
      return { groupId: null, error: GENERIC_JOIN_ERROR };
    }
    const resultado = data as JoinResult;
    if (resultado.code !== 'OK') {
      return { groupId: null, error: translateJoinError(resultado.code) };
    }
    await this.refreshDashboard(); // D-05
    return { groupId: resultado.group_id ?? null, error: null };
  }
}
