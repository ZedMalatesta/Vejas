import { InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * DI seam for the Supabase client so services and interceptors can be
 * unit-tested with a mock instead of the real singleton.
 */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => supabase,
});
