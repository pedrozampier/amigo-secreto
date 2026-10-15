import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Dono único do cliente Supabase (D-05).
 * Injetável via `inject()` (RA4-ID14) e mockável no Vitest — por isso não é
 * um `export const supabase = createClient(...)` global.
 *
 * A chave é a PUBLICÁVEL (publishable). A privacidade real vem do RLS no banco,
 * não de esconder a chave. A secret key jamais entra no bundle (DB-11).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );
}
