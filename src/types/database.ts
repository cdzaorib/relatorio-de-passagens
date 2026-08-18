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
        Relationships: []
      }
      fare_prices: {
        Row: {
          id: string
          user_id: string
          group_id: string
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
          group_id?: string
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
          group_id?: string
          label?: string
          transport?: TransportType
          card?: CardType
          value?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      places: {
        Row: {
          id: string
          user_id: string
          name: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      place_legs: {
        Row: {
          id: string
          place_id: string
          user_id: string
          position: number
          origin: string
          destination: string
          client: string | null
          transport: TransportType
          line: string | null
          card: CardType
          fare_group_id: string | null
          value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          place_id: string
          user_id: string
          position: number
          origin: string
          destination: string
          client?: string | null
          transport: TransportType
          line?: string | null
          card: CardType
          fare_group_id?: string | null
          value: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          place_id?: string
          user_id?: string
          position?: number
          origin?: string
          destination?: string
          client?: string | null
          transport?: TransportType
          line?: string | null
          card?: CardType
          fare_group_id?: string | null
          value?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      transport_type: TransportType
      card_type: CardType
    }
    CompositeTypes: { [_ in never]: never }
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

export type Place = Database['public']['Tables']['places']['Row']
export type PlaceInsert = Database['public']['Tables']['places']['Insert']
export type PlaceUpdate = Database['public']['Tables']['places']['Update']

export type PlaceLeg = Database['public']['Tables']['place_legs']['Row']
export type PlaceLegInsert = Database['public']['Tables']['place_legs']['Insert']
export type PlaceLegUpdate = Database['public']['Tables']['place_legs']['Update']

/** Local com os trechos da ida já carregados, na ordem. */
export type PlaceWithLegs = Place & { legs: PlaceLeg[] }
