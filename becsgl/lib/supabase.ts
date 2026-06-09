import { createClient } from '@supabase/supabase-js'

// Browser client — safe to use in components
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server/API client with elevated privileges — never exposed to browser
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: { id: number; short_name: string; player1: string; player2: string; phone1: string | null; phone2: string | null; token: string }
      }
      matches: {
        Row: { id: string; week: number; team_a: number; team_b: number; scores_a: number[] | null; scores_b: number[] | null; drives_a: number[] | null; drives_b: number[] | null; pts_a: number | null; pts_b: number | null; status: 'pending' | 'partial' | 'locked'; submitted_a: boolean; submitted_b: boolean; created_at: string; updated_at: string }
      }
    }
  }
}
