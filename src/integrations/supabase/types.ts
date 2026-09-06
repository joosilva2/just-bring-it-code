export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_questions: {
        Row: {
          created_at: string
          id: string
          question: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      checkout_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          tiktok_ic_sent: boolean
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          tiktok_ic_sent?: boolean
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          tiktok_ic_sent?: boolean
          visitor_id?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          click_type: string
          color_chosen: string | null
          created_at: string
          id: string
          visitor_id: string
        }
        Insert: {
          click_type?: string
          color_chosen?: string | null
          created_at?: string
          id?: string
          visitor_id: string
        }
        Update: {
          click_type?: string
          color_chosen?: string | null
          created_at?: string
          id?: string
          visitor_id?: string
        }
        Relationships: []
      }
      gateway_config: {
        Row: {
          active_gateway: string
          blackcat_api_key: string | null
          buckpay_api_key: string | null
          buckpay_user_agent: string | null
          duttyfy_api_url: string | null
          id: string
          ironpay_api_key: string | null
          paradise_api_key: string | null
          redirect_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_gateway?: string
          blackcat_api_key?: string | null
          buckpay_api_key?: string | null
          buckpay_user_agent?: string | null
          duttyfy_api_url?: string | null
          id?: string
          ironpay_api_key?: string | null
          paradise_api_key?: string | null
          redirect_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_gateway?: string
          blackcat_api_key?: string | null
          buckpay_api_key?: string | null
          buckpay_user_agent?: string | null
          duttyfy_api_url?: string | null
          id?: string
          ironpay_api_key?: string | null
          paradise_api_key?: string | null
          redirect_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adset_id: string | null
          adset_name: string | null
          amount: number
          campaign_id: string | null
          campaign_name: string | null
          color: string | null
          created_at: string
          customer_document: string | null
          customer_email: string
          customer_ip: string | null
          customer_name: string
          customer_phone: string | null
          customer_user_agent: string | null
          external_ref: string
          gateway: string
          gateway_transaction_id: string | null
          id: string
          paid_at: string | null
          pix_code: string | null
          pix_qr_base64: string | null
          product_type: string
          quantity: number
          shipping_city: string | null
          shipping_complement: string | null
          shipping_neighborhood: string | null
          shipping_number: string | null
          shipping_state: string | null
          shipping_street: string | null
          shipping_zip: string | null
          status: string
          tiktok_paid_sent: boolean
          tiktok_ttp: string | null
          ttclid: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          utmify_paid_sent: boolean
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          amount: number
          campaign_id?: string | null
          campaign_name?: string | null
          color?: string | null
          created_at?: string
          customer_document?: string | null
          customer_email: string
          customer_ip?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_user_agent?: string | null
          external_ref: string
          gateway?: string
          gateway_transaction_id?: string | null
          id?: string
          paid_at?: string | null
          pix_code?: string | null
          pix_qr_base64?: string | null
          product_type?: string
          quantity?: number
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_neighborhood?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          status?: string
          tiktok_paid_sent?: boolean
          tiktok_ttp?: string | null
          ttclid?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utmify_paid_sent?: boolean
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          amount?: number
          campaign_id?: string | null
          campaign_name?: string | null
          color?: string | null
          created_at?: string
          customer_document?: string | null
          customer_email?: string
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_user_agent?: string | null
          external_ref?: string
          gateway?: string
          gateway_transaction_id?: string | null
          id?: string
          paid_at?: string | null
          pix_code?: string | null
          pix_qr_base64?: string | null
          product_type?: string
          quantity?: number
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_neighborhood?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          status?: string
          tiktok_paid_sent?: boolean
          tiktok_ttp?: string | null
          ttclid?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utmify_paid_sent?: boolean
        }
        Relationships: []
      }
      page_views: {
        Row: {
          city: string | null
          created_at: string
          id: string
          ip_address: string | null
          page: string
          region: string | null
          visitor_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page?: string
          region?: string | null
          visitor_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page?: string
          region?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      site_records: {
        Row: {
          id: string
          updated_at: string
          value: number
        }
        Insert: {
          id?: string
          updated_at?: string
          value?: number
        }
        Update: {
          id?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      tiktok_pixels: {
        Row: {
          access_token_env: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          pixel_id: string
          track_paid: boolean
          track_pending: boolean
        }
        Insert: {
          access_token_env?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pixel_id: string
          track_paid?: boolean
          track_pending?: boolean
        }
        Update: {
          access_token_env?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          pixel_id?: string
          track_paid?: boolean
          track_pending?: boolean
        }
        Relationships: []
      }
      url_slugs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      tiktok_pixels_public: {
        Row: {
          pixel_id: string | null
          track_paid: boolean | null
          track_pending: boolean | null
        }
        Insert: {
          pixel_id?: string | null
          track_paid?: boolean | null
          track_pending?: boolean | null
        }
        Update: {
          pixel_id?: string | null
          track_paid?: boolean | null
          track_pending?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
