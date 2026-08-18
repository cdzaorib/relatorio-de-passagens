/**
 * Tipos do banco, espelhando supabase/schema.sql.
 * Mantidos à mão para não depender do CLI de geração de tipos —
 * ao mexer no schema, mexa aqui também.
 */

export type TransportType = 'onibus' | 'barca'
export type CardType = 'riocard' | 'jae'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          supervisor_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string
          supervisor_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          supervisor_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      fare_prices: {
        Row: {
          id: string
          user_id: string
          label: string
          transport: TransportType
          card: CardType
          value: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          transport: TransportType
          card: CardType
          value: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          transport?: TransportType
          card?: CardType
          value?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          user_id: string
          date: string
          origin: string
          destination: string
          client: string
          transport: TransportType
          line: string | null
          card: CardType
          value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          origin: string
          destination: string
          client: string
          transport: TransportType
          line?: string | null
          card: CardType
          value: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          origin?: string
          destination?: string
          client?: string
          transport?: TransportType
          line?: string | null
          card?: CardType
          value?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      transport_type: TransportType
      card_type: CardType
    }
    CompositeTypes: Record<string, never>
  }
}

// Atalhos usados pelo app.
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type FarePrice = Database['public']['Tables']['fare_prices']['Row']
export type FarePriceInsert = Database['public']['Tables']['fare_prices']['Insert']
export type FarePriceUpdate = Database['public']['Tables']['fare_prices']['Update']

export type Trip = Database['public']['Tables']['trips']['Row']
export type TripInsert = Database['public']['Tables']['trips']['Insert']
export type TripUpdate = Database['public']['Tables']['trips']['Update']
