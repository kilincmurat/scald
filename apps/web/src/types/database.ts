export type UserRole = 'admin' | 'municipality' | 'citizen';
export type QualityLabel = 'validated' | 'estimated' | 'pilot';
export type StrategyPriority = 'high' | 'medium' | 'low';
export type StrategyStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
export type CostLevel = 'low' | 'medium' | 'high' | 'very_high';
export type TimeframeType = 'short' | 'medium' | 'long';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ReportType = 'annual' | 'quarterly' | 'strategic' | 'climate';
export type ReportStatus = 'draft' | 'generating' | 'ready';

export interface Database {
  public: {
    Tables: {
      municipalities: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          country: string;
          region: string | null;
          population: number | null;
          area_km2: number | null;
          latitude: number | null;
          longitude: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['municipalities']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['municipalities']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          municipality_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      indicators: {
        Row: {
          id: string;
          code: string;
          name_tr: string;
          name_en: string;
          layer: number;
          unit: string;
          weight: number;
          description_tr: string | null;
          description_en: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['indicators']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['indicators']['Insert']>;
      };
      sub_indicators: {
        Row: {
          id: string;
          indicator_id: string;
          code: string;
          name_tr: string;
          name_en: string;
          unit: string;
          normalization: string;
          description_tr: string | null;
          description_en: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sub_indicators']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['sub_indicators']['Insert']>;
      };
      indicator_data: {
        Row: {
          id: string;
          municipality_id: string;
          indicator_id: string;
          sub_indicator_id: string | null;
          year: number;
          value: number | null;
          quality_label: QualityLabel;
          source: string | null;
          notes: string | null;
          entered_by: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['indicator_data']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['indicator_data']['Insert']>;
      };
      ecological_scores: {
        Row: {
          id: string;
          municipality_id: string;
          year: number;
          total_score: number | null;
          energy_score: number | null;
          water_score: number | null;
          waste_score: number | null;
          transport_score: number | null;
          green_space_score: number | null;
          climate_score: number | null;
          biodiversity_score: number | null;
          air_quality_score: number | null;
          footprint_gha: number | null;
          carbon_tons_per_capita: number | null;
          calculated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ecological_scores']['Row'], 'id' | 'calculated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['ecological_scores']['Insert']>;
      };
      climate_data: {
        Row: {
          id: string;
          municipality_id: string;
          year: number;
          avg_temperature: number | null;
          max_temperature: number | null;
          min_temperature: number | null;
          total_precipitation: number | null;
          extreme_heat_days: number | null;
          extreme_cold_days: number | null;
          flood_events: number | null;
          drought_index: number | null;
          air_quality_pm25: number | null;
          air_quality_pm10: number | null;
          co2_concentration: number | null;
          source: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['climate_data']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['climate_data']['Insert']>;
      };
      strategies: {
        Row: {
          id: string;
          municipality_id: string;
          title_tr: string;
          title_en: string;
          description_tr: string | null;
          description_en: string | null;
          expected_outcome_tr: string | null;
          expected_outcome_en: string | null;
          category: string;
          priority: StrategyPriority;
          impact_score: number | null;
          feasibility_score: number | null;
          cost_level: CostLevel;
          timeframe: TimeframeType;
          risk_level: RiskLevel;
          status: StrategyStatus;
          related_indicators: string[] | null;
          ai_generated: boolean;
          ai_model: string | null;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['strategies']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['strategies']['Insert']>;
      };
      reports: {
        Row: {
          id: string;
          municipality_id: string;
          title: string;
          report_type: ReportType;
          year: number | null;
          quarter: number | null;
          language: string;
          content: Record<string, unknown> | null;
          file_url: string | null;
          file_size_bytes: number | null;
          status: ReportStatus;
          include_charts: boolean;
          include_recommendations: boolean;
          generated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          old_values: Record<string, unknown> | null;
          new_values: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_user_role: { Args: Record<string, never>; Returns: UserRole };
      auth_user_municipality: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      quality_label: QualityLabel;
      strategy_priority: StrategyPriority;
      strategy_status: StrategyStatus;
      cost_level: CostLevel;
      timeframe_type: TimeframeType;
      risk_level: RiskLevel;
      report_type: ReportType;
      report_status: ReportStatus;
    };
  };
}
