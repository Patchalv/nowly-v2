export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null;
          created_at: string | null;
          icon: string | null;
          id: string;
          name: string;
          position: number | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          position?: number | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          position?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      recurring_tasks: {
        Row: {
          category_id: string | null;
          created_at: string | null;
          day_of_month: number | null;
          days_of_week: number[] | null;
          description: string | null;
          end_date: string | null;
          id: string;
          interval_days: number | null;
          interval_months: number | null;
          interval_weeks: number | null;
          is_active: boolean | null;
          is_paused: boolean | null;
          month_of_year: number | null;
          next_due_date: string;
          occurrences_generated: number | null;
          priority: number | null;
          recurrence_type: string;
          start_date: string;
          title: string;
          updated_at: string | null;
          user_id: string;
          week_of_month: number | null;
          workspace_id: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string | null;
          day_of_month?: number | null;
          days_of_week?: number[] | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          interval_days?: number | null;
          interval_months?: number | null;
          interval_weeks?: number | null;
          is_active?: boolean | null;
          is_paused?: boolean | null;
          month_of_year?: number | null;
          next_due_date: string;
          occurrences_generated?: number | null;
          priority?: number | null;
          recurrence_type: string;
          start_date: string;
          title: string;
          updated_at?: string | null;
          user_id: string;
          week_of_month?: number | null;
          workspace_id: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string | null;
          day_of_month?: number | null;
          days_of_week?: number[] | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          interval_days?: number | null;
          interval_months?: number | null;
          interval_weeks?: number | null;
          is_active?: boolean | null;
          is_paused?: boolean | null;
          month_of_year?: number | null;
          next_due_date?: string;
          occurrences_generated?: number | null;
          priority?: number | null;
          recurrence_type?: string;
          start_date?: string;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          week_of_month?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_tasks_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_tasks_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          category_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          is_completed: boolean | null;
          is_detached: boolean | null;
          parent_task_id: string | null;
          position: number | null;
          priority: number | null;
          recurring_task_id: string | null;
          scheduled_date: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          category_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_completed?: boolean | null;
          is_detached?: boolean | null;
          parent_task_id?: string | null;
          position?: number | null;
          priority?: number | null;
          recurring_task_id?: string | null;
          scheduled_date?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          category_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_completed?: boolean | null;
          is_detached?: boolean | null;
          parent_task_id?: string | null;
          position?: number | null;
          priority?: number | null;
          recurring_task_id?: string | null;
          scheduled_date?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_parent_task_id_fkey';
            columns: ['parent_task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_recurring_task_id_fkey';
            columns: ['recurring_task_id'];
            isOneToOne: false;
            referencedRelation: 'recurring_tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      user_onboarding: {
        Row: {
          created_at: string | null;
          dismissed_tooltips: string[] | null;
          id: string;
          initial_tour_completed: boolean | null;
          initial_tour_completed_at: string | null;
          initial_tour_step_reached: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          dismissed_tooltips?: string[] | null;
          id?: string;
          initial_tour_completed?: boolean | null;
          initial_tour_completed_at?: string | null;
          initial_tour_step_reached?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          dismissed_tooltips?: string[] | null;
          id?: string;
          initial_tour_completed?: boolean | null;
          initial_tour_completed_at?: string | null;
          initial_tour_step_reached?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          color: string | null;
          created_at: string | null;
          icon: string | null;
          id: string;
          name: string;
          position: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          position?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          position?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
