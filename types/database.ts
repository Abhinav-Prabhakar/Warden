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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      automation_jobs: {
        Row: {
          attempt_count: number | null
          completed_at: string | null
          error_message: string | null
          id: string
          job_type: string
          patient_id: string | null
          payload: Json | null
          priority: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          task_id: string | null
        }
        Insert: {
          attempt_count?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          patient_id?: string | null
          payload?: Json | null
          priority?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
        }
        Update: {
          attempt_count?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          patient_id?: string | null
          payload?: Json | null
          priority?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_jobs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "automation_jobs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_jobs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      bed_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          bed_id: string
          id: string
          patient_id: string
          reason: string | null
          released_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          bed_id: string
          id?: string
          patient_id: string
          reason?: string | null
          released_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          bed_id?: string
          id?: string
          patient_id?: string
          reason?: string | null
          released_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bed_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_assignments_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_assignments_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["bed_id"]
          },
          {
            foreignKeyName: "bed_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "bed_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          bed_number: string
          bed_type: string | null
          created_at: string | null
          current_patient_id: string | null
          id: string
          isolation_capable: boolean | null
          monitor_available: boolean | null
          oxygen_available: boolean | null
          room_id: string
          status: string | null
          updated_at: string | null
          ventilator_capable: boolean | null
        }
        Insert: {
          bed_number: string
          bed_type?: string | null
          created_at?: string | null
          current_patient_id?: string | null
          id?: string
          isolation_capable?: boolean | null
          monitor_available?: boolean | null
          oxygen_available?: boolean | null
          room_id: string
          status?: string | null
          updated_at?: string | null
          ventilator_capable?: boolean | null
        }
        Update: {
          bed_number?: string
          bed_type?: string | null
          created_at?: string | null
          current_patient_id?: string | null
          id?: string
          isolation_capable?: boolean | null
          monitor_available?: boolean | null
          oxygen_available?: boolean | null
          room_id?: string
          status?: string | null
          updated_at?: string | null
          ventilator_capable?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_current_patient_id_fkey"
            columns: ["current_patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "beds_current_patient_id_fkey"
            columns: ["current_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      call_tasks: {
        Row: {
          assigned_staff_id: string | null
          attempt_count: number | null
          call_type: string
          completed_at: string | null
          contact_id: string
          id: string
          notes: string | null
          outcome: string | null
          patient_id: string
          scheduled_at: string
          status: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          attempt_count?: number | null
          call_type: string
          completed_at?: string | null
          contact_id: string
          id?: string
          notes?: string | null
          outcome?: string | null
          patient_id: string
          scheduled_at: string
          status?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          attempt_count?: number | null
          call_type?: string
          completed_at?: string | null
          contact_id?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          patient_id?: string
          scheduled_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_tasks_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "call_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_jobs: {
        Row: {
          assigned_to: string | null
          bed_id: string
          completed_at: string | null
          id: string
          priority: number | null
          requested_at: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          bed_id: string
          completed_at?: string | null
          id?: string
          priority?: number | null
          requested_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          bed_id?: string
          completed_at?: string | null
          id?: string
          priority?: number | null
          requested_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_jobs_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_jobs_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["bed_id"]
          },
        ]
      }
      communication_attempts: {
        Row: {
          answered_at: string | null
          channel: string
          contact_id: string
          ended_at: string | null
          id: string
          initiated_by: string | null
          outcome: string | null
          patient_id: string | null
          purpose: string
          started_at: string | null
          summary: string | null
          urgency: string | null
        }
        Insert: {
          answered_at?: string | null
          channel: string
          contact_id: string
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          outcome?: string | null
          patient_id?: string | null
          purpose: string
          started_at?: string | null
          summary?: string | null
          urgency?: string | null
        }
        Update: {
          answered_at?: string | null
          channel?: string
          contact_id?: string
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          outcome?: string | null
          patient_id?: string | null
          purpose?: string
          started_at?: string | null
          summary?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_attempts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "communication_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_attempts_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_attempts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "communication_attempts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_contacts: {
        Row: {
          active: boolean | null
          available_from: string | null
          available_until: string | null
          contact_type: string
          email: string | null
          id: string
          patient_contact_id: string | null
          phone: string | null
          preferred_channel: string | null
          staff_id: string | null
        }
        Insert: {
          active?: boolean | null
          available_from?: string | null
          available_until?: string | null
          contact_type: string
          email?: string | null
          id?: string
          patient_contact_id?: string | null
          phone?: string | null
          preferred_channel?: string | null
          staff_id?: string | null
        }
        Update: {
          active?: boolean | null
          available_from?: string | null
          available_until?: string | null
          contact_type?: string
          email?: string | null
          id?: string
          patient_contact_id?: string | null
          phone?: string | null
          preferred_channel?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_contacts_patient_contact_id_fkey"
            columns: ["patient_contact_id"]
            isOneToOne: false
            referencedRelation: "patient_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_contacts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          preferred_language: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          preferred_language?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          preferred_language?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          department_type: string
          floor_number: number | null
          hospital_id: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          department_type: string
          floor_number?: number | null
          hospital_id: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          department_type?: string
          floor_number?: number | null
          hospital_id?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      discharge_plans: {
        Row: {
          bed_cleaning_requested: boolean | null
          belongings_ready: boolean | null
          cleared_by: string | null
          family_notified: boolean | null
          id: string
          medically_cleared_at: string | null
          medications_ready: boolean | null
          notes: string | null
          paperwork_complete: boolean | null
          patient_id: string
          planned_discharge_at: string | null
          status: string | null
          transport_arranged: boolean | null
        }
        Insert: {
          bed_cleaning_requested?: boolean | null
          belongings_ready?: boolean | null
          cleared_by?: string | null
          family_notified?: boolean | null
          id?: string
          medically_cleared_at?: string | null
          medications_ready?: boolean | null
          notes?: string | null
          paperwork_complete?: boolean | null
          patient_id: string
          planned_discharge_at?: string | null
          status?: string | null
          transport_arranged?: boolean | null
        }
        Update: {
          bed_cleaning_requested?: boolean | null
          belongings_ready?: boolean | null
          cleared_by?: string | null
          family_notified?: boolean | null
          id?: string
          medically_cleared_at?: string | null
          medications_ready?: boolean | null
          notes?: string | null
          paperwork_complete?: boolean | null
          patient_id?: string
          planned_discharge_at?: string | null
          status?: string | null
          transport_arranged?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "discharge_plans_cleared_by_fkey"
            columns: ["cleared_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "discharge_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_queue: {
        Row: {
          attempt_count: number | null
          available_after: string | null
          candidate_staff_ids: string[] | null
          completed_at: string | null
          id: string
          last_attempt_at: string | null
          locked_at: string | null
          priority: number | null
          queued_at: string | null
          selected_staff_id: string | null
          status: string | null
          task_id: string
        }
        Insert: {
          attempt_count?: number | null
          available_after?: string | null
          candidate_staff_ids?: string[] | null
          completed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          locked_at?: string | null
          priority?: number | null
          queued_at?: string | null
          selected_staff_id?: string | null
          status?: string | null
          task_id: string
        }
        Update: {
          attempt_count?: number | null
          available_after?: string | null
          candidate_staff_ids?: string[] | null
          completed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          locked_at?: string | null
          priority?: number | null
          queued_at?: string | null
          selected_staff_id?: string | null
          status?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_queue_selected_staff_id_fkey"
            columns: ["selected_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_queue_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      elevator_events: {
        Row: {
          created_at: string | null
          elevator_id: string
          event_type: string
          from_floor: number | null
          id: string
          metadata: Json | null
          to_floor: number | null
        }
        Insert: {
          created_at?: string | null
          elevator_id: string
          event_type: string
          from_floor?: number | null
          id?: string
          metadata?: Json | null
          to_floor?: number | null
        }
        Update: {
          created_at?: string | null
          elevator_id?: string
          event_type?: string
          from_floor?: number | null
          id?: string
          metadata?: Json | null
          to_floor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elevator_events_elevator_id_fkey"
            columns: ["elevator_id"]
            isOneToOne: false
            referencedRelation: "elevators"
            referencedColumns: ["id"]
          },
        ]
      }
      elevators: {
        Row: {
          accessible: boolean | null
          capacity_kg: number | null
          current_floor: number | null
          hospital_id: string
          id: string
          name: string
          status: string | null
        }
        Insert: {
          accessible?: boolean | null
          capacity_kg?: number | null
          current_floor?: number | null
          hospital_id: string
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          accessible?: boolean | null
          capacity_kg?: number | null
          current_floor?: number | null
          hospital_id?: string
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elevators_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_steps: {
        Row: {
          contact_attempt_id: string | null
          escalation_id: string
          id: string
          level: number
          responded_at: string | null
          response_deadline: string
          staff_id: string
          status: string | null
        }
        Insert: {
          contact_attempt_id?: string | null
          escalation_id: string
          id?: string
          level: number
          responded_at?: string | null
          response_deadline: string
          staff_id: string
          status?: string | null
        }
        Update: {
          contact_attempt_id?: string | null
          escalation_id?: string
          id?: string
          level?: number
          responded_at?: string | null
          response_deadline?: string
          staff_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_steps_contact_attempt_id_fkey"
            columns: ["contact_attempt_id"]
            isOneToOne: false
            referencedRelation: "communication_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_steps_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "escalations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_steps_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          created_at: string | null
          current_level: number | null
          id: string
          patient_id: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          task_id: string | null
          trigger_type: string
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          patient_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          task_id?: string | null
          trigger_type: string
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          patient_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          task_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "escalations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_requests: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          hospital_id: string
          id: string
          location_node_id: string | null
          priority: number | null
          reported_by: string | null
          resolved_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          hospital_id: string
          id?: string
          location_node_id?: string | null
          priority?: number | null
          reported_by?: string | null
          resolved_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          hospital_id?: string
          id?: string
          location_node_id?: string | null
          priority?: number | null
          reported_by?: string | null
          resolved_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_requests_location_node_id_fkey"
            columns: ["location_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_requests_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          completed_at: string | null
          contact_id: string
          id: string
          patient_id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          trigger: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          id?: string
          patient_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          trigger: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          id?: string
          patient_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "feedback_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          feedback_request_id: string
          free_text: string | null
          id: string
          rating: number | null
          responses: Json | null
          submitted_at: string | null
        }
        Insert: {
          feedback_request_id: string
          free_text?: string | null
          id?: string
          rating?: number | null
          responses?: Json | null
          submitted_at?: string | null
        }
        Update: {
          feedback_request_id?: string
          free_text?: string | null
          id?: string
          rating?: number | null
          responses?: Json | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: Json | null
          code: string
          created_at: string | null
          id: string
          name: string
          phone: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          code: string
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string
          department_id: string
          hospital_id: string
          id: string
          item_code: string
          name: string
          quantity_on_hand: number
          reorder_quantity: number
          reorder_threshold: number
          supplier: string | null
          unit: string
        }
        Insert: {
          category: string
          department_id: string
          hospital_id: string
          id?: string
          item_code: string
          name: string
          quantity_on_hand?: number
          reorder_quantity?: number
          reorder_threshold?: number
          supplier?: string | null
          unit: string
        }
        Update: {
          category?: string
          department_id?: string
          hospital_id?: string
          id?: string
          item_code?: string
          name?: string
          quantity_on_hand?: number
          reorder_quantity?: number
          reorder_threshold?: number
          supplier?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          patient_id: string | null
          performed_by: string | null
          quantity: number
          reference_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          patient_id?: string | null
          performed_by?: string | null
          quantity: number
          reference_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          patient_id?: string | null
          performed_by?: string | null
          quantity?: number
          reference_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          department_id: string | null
          id: string
          ordered_at: string | null
          ordered_by: string | null
          patient_id: string
          priority: string | null
          scheduled_at: string | null
          status: string | null
          test_code: string
          test_name: string
        }
        Insert: {
          department_id?: string | null
          id?: string
          ordered_at?: string | null
          ordered_by?: string | null
          patient_id: string
          priority?: string | null
          scheduled_at?: string | null
          status?: string | null
          test_code: string
          test_name: string
        }
        Update: {
          department_id?: string | null
          id?: string
          ordered_at?: string | null
          ordered_by?: string | null
          patient_id?: string
          priority?: string | null
          scheduled_at?: string | null
          status?: string | null
          test_code?: string
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          abnormal_flag: string | null
          id: string
          lab_order_id: string
          numeric_value: number | null
          reference_range: string | null
          result_code: string
          result_name: string
          resulted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          unit: string | null
          value: string
        }
        Insert: {
          abnormal_flag?: string | null
          id?: string
          lab_order_id: string
          numeric_value?: number | null
          reference_range?: string | null
          result_code: string
          result_name: string
          resulted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          unit?: string | null
          value: string
        }
        Update: {
          abnormal_flag?: string | null
          id?: string
          lab_order_id?: string
          numeric_value?: number | null
          reference_range?: string | null
          result_code?: string
          result_name?: string
          resulted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          unit?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_jobs: {
        Row: {
          assigned_staff_id: string | null
          completed_at: string | null
          facility_request_id: string
          id: string
          notes: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          completed_at?: string | null
          facility_request_id: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          completed_at?: string | null
          facility_request_id?: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_jobs_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_facility_request_id_fkey"
            columns: ["facility_request_id"]
            isOneToOne: false
            referencedRelation: "facility_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_at: string | null
          administered_by: string | null
          dose_given: string | null
          id: string
          notes: string | null
          patient_medication_id: string
          scheduled_at: string
          status: string | null
        }
        Insert: {
          administered_at?: string | null
          administered_by?: string | null
          dose_given?: string | null
          id?: string
          notes?: string | null
          patient_medication_id: string
          scheduled_at: string
          status?: string | null
        }
        Update: {
          administered_at?: string | null
          administered_by?: string | null
          dose_given?: string | null
          id?: string
          notes?: string | null
          patient_medication_id?: string
          scheduled_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_administered_by_fkey"
            columns: ["administered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_patient_medication_id_fkey"
            columns: ["patient_medication_id"]
            isOneToOne: false
            referencedRelation: "patient_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          form: string | null
          generic_name: string | null
          id: string
          name: string
          strength: string | null
        }
        Insert: {
          form?: string | null
          generic_name?: string | null
          id?: string
          name: string
          strength?: string | null
        }
        Update: {
          form?: string | null
          generic_name?: string | null
          id?: string
          name?: string
          strength?: string | null
        }
        Relationships: []
      }
      nutrition_inventory: {
        Row: {
          active: boolean
          calories: string
          carbs: string
          category: string
          dietary: string[]
          height_pct: number
          id: string
          left_pct: number
          location: string
          name: string
          protein: string
          stock: string
          top_pct: number
          updated_at: string
          width_pct: number
        }
        Insert: {
          active?: boolean
          calories: string
          carbs: string
          category: string
          dietary?: string[]
          height_pct: number
          id: string
          left_pct: number
          location: string
          name: string
          protein: string
          stock: string
          top_pct: number
          updated_at?: string
          width_pct: number
        }
        Update: {
          active?: boolean
          calories?: string
          carbs?: string
          category?: string
          dietary?: string[]
          height_pct?: number
          id?: string
          left_pct?: number
          location?: string
          name?: string
          protein?: string
          stock?: string
          top_pct?: number
          updated_at?: string
          width_pct?: number
        }
        Relationships: []
      }
      navigation_edges: {
        Row: {
          accessible: boolean | null
          blocked: boolean | null
          distance_meters: number
          estimated_seconds: number
          from_node_id: string
          id: string
          to_node_id: string
        }
        Insert: {
          accessible?: boolean | null
          blocked?: boolean | null
          distance_meters?: number
          estimated_seconds?: number
          from_node_id: string
          id?: string
          to_node_id: string
        }
        Update: {
          accessible?: boolean | null
          blocked?: boolean | null
          distance_meters?: number
          estimated_seconds?: number
          from_node_id?: string
          id?: string
          to_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_nodes: {
        Row: {
          floor_number: number | null
          hospital_id: string
          id: string
          name: string | null
          node_type: string
          room_id: string | null
          x: number
          y: number
        }
        Insert: {
          floor_number?: number | null
          hospital_id: string
          id?: string
          name?: string | null
          node_type: string
          room_id?: string | null
          x: number
          y: number
        }
        Update: {
          floor_number?: number | null
          hospital_id?: string
          id?: string
          name?: string | null
          node_type?: string
          room_id?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "navigation_nodes_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_nodes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "navigation_nodes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempt_count: number | null
          channel: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          notification_id: string
          priority: number | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          attempt_count?: number | null
          channel: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_id: string
          priority?: number | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          attempt_count?: number | null
          channel?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_id?: string
          priority?: number | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          patient_id: string | null
          priority: number | null
          read_at: string | null
          recipient_contact_id: string | null
          recipient_staff_id: string | null
          sent_at: string | null
          status: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          priority?: number | null
          read_at?: string | null
          recipient_contact_id?: string | null
          recipient_staff_id?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          priority?: number | null
          read_at?: string | null
          recipient_contact_id?: string | null
          recipient_staff_id?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_contact_id_fkey"
            columns: ["recipient_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_staff_id_fkey"
            columns: ["recipient_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_allergies: {
        Row: {
          allergen: string
          id: string
          patient_id: string
          reaction: string | null
          severity: string | null
          verified: boolean | null
        }
        Insert: {
          allergen: string
          id?: string
          patient_id: string
          reaction?: string | null
          severity?: string | null
          verified?: boolean | null
        }
        Update: {
          allergen?: string
          id?: string
          patient_id?: string
          reaction?: string | null
          severity?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_conditions: {
        Row: {
          code: string
          id: string
          name: string
          onset_date: string | null
          patient_id: string
          resolved_at: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          code: string
          id?: string
          name: string
          onset_date?: string | null
          patient_id: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          code?: string
          id?: string
          name?: string
          onset_date?: string | null
          patient_id?: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_contacts: {
        Row: {
          can_receive_updates: boolean | null
          communication_notes: string | null
          contact_id: string
          id: string
          is_primary: boolean | null
          patient_id: string
          priority: number | null
          relationship: string
        }
        Insert: {
          can_receive_updates?: boolean | null
          communication_notes?: string | null
          contact_id: string
          id?: string
          is_primary?: boolean | null
          patient_id: string
          priority?: number | null
          relationship: string
        }
        Update: {
          can_receive_updates?: boolean | null
          communication_notes?: string | null
          contact_id?: string
          id?: string
          is_primary?: boolean | null
          patient_id?: string
          priority?: number | null
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          patient_id: string
          severity: string | null
          source: string | null
          timestamp: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          patient_id: string
          severity?: string | null
          source?: string | null
          timestamp?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          patient_id?: string
          severity?: string | null
          source?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medications: {
        Row: {
          dose: string
          end_at: string | null
          frequency: string
          id: string
          medication_id: string
          patient_id: string
          prescribed_by: string | null
          route: string
          scheduled_at: string
          start_at: string | null
          status: string | null
        }
        Insert: {
          dose: string
          end_at?: string | null
          frequency: string
          id?: string
          medication_id: string
          patient_id: string
          prescribed_by?: string | null
          route: string
          scheduled_at: string
          start_at?: string | null
          status?: string | null
        }
        Update: {
          dose?: string
          end_at?: string | null
          frequency?: string
          id?: string
          medication_id?: string
          patient_id?: string
          prescribed_by?: string | null
          route?: string
          scheduled_at?: string
          start_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medications_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medications_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_preferences: {
        Row: {
          communication_preferences: Json | null
          dietary_restrictions: Json | null
          food_preferences: Json | null
          id: string
          mobility_notes: string | null
          other_preferences: Json | null
          patient_id: string
        }
        Insert: {
          communication_preferences?: Json | null
          dietary_restrictions?: Json | null
          food_preferences?: Json | null
          id?: string
          mobility_notes?: string | null
          other_preferences?: Json | null
          patient_id: string
        }
        Update: {
          communication_preferences?: Json | null
          dietary_restrictions?: Json | null
          food_preferences?: Json | null
          id?: string
          mobility_notes?: string | null
          other_preferences?: Json | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_preferences_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_preferences_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_transfers: {
        Row: {
          completed_at: string | null
          from_bed_id: string | null
          from_department_id: string | null
          id: string
          patient_id: string
          reason: string | null
          requested_at: string | null
          requested_by: string | null
          started_at: string | null
          status: string | null
          to_bed_id: string | null
          to_department_id: string | null
          transport_request_id: string | null
        }
        Insert: {
          completed_at?: string | null
          from_bed_id?: string | null
          from_department_id?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: string | null
          to_bed_id?: string | null
          to_department_id?: string | null
          transport_request_id?: string | null
        }
        Update: {
          completed_at?: string | null
          from_bed_id?: string | null
          from_department_id?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: string | null
          to_bed_id?: string | null
          to_department_id?: string | null
          transport_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_transfers_from_bed_id_fkey"
            columns: ["from_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_from_bed_id_fkey"
            columns: ["from_bed_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["bed_id"]
          },
          {
            foreignKeyName: "patient_transfers_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_transfers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_to_bed_id_fkey"
            columns: ["to_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_to_bed_id_fkey"
            columns: ["to_bed_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["bed_id"]
          },
          {
            foreignKeyName: "patient_transfers_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_transport_request_id_fkey"
            columns: ["transport_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          acuity: string | null
          admission_at: string | null
          blood_type: string | null
          created_at: string | null
          date_of_birth: string
          discharge_at: string | null
          first_name: string
          hospital_id: string
          id: string
          language: string | null
          last_name: string
          medical_record_number: string
          sex: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          acuity?: string | null
          admission_at?: string | null
          blood_type?: string | null
          created_at?: string | null
          date_of_birth: string
          discharge_at?: string | null
          first_name: string
          hospital_id: string
          id?: string
          language?: string | null
          last_name: string
          medical_record_number: string
          sex?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          acuity?: string | null
          admission_at?: string | null
          blood_type?: string | null
          created_at?: string | null
          date_of_birth?: string
          discharge_at?: string | null
          first_name?: string
          hospital_id?: string
          id?: string
          language?: string | null
          last_name?: string
          medical_record_number?: string
          sex?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          attempt_count: number | null
          color: boolean | null
          completed_at: string | null
          copies: number | null
          document_title: string
          document_type: string
          duplex: boolean | null
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          patient_id: string | null
          printer_id: string
          priority: number | null
          queued_at: string | null
          requested_by: string
          started_at: string | null
          status: string | null
          storage_path: string | null
          task_id: string | null
        }
        Insert: {
          attempt_count?: number | null
          color?: boolean | null
          completed_at?: string | null
          copies?: number | null
          document_title: string
          document_type: string
          duplex?: boolean | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          printer_id: string
          priority?: number | null
          queued_at?: string | null
          requested_by: string
          started_at?: string | null
          status?: string | null
          storage_path?: string | null
          task_id?: string | null
        }
        Update: {
          attempt_count?: number | null
          color?: boolean | null
          completed_at?: string | null
          copies?: number | null
          document_title?: string
          document_type?: string
          duplex?: boolean | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          printer_id?: string
          priority?: number | null
          queued_at?: string | null
          requested_by?: string
          started_at?: string | null
          status?: string | null
          storage_path?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "print_jobs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          active: boolean | null
          department_id: string | null
          hospital_id: string
          id: string
          location_node_id: string | null
          name: string
          printer_type: string | null
          status: string | null
          supports_color: boolean | null
          supports_duplex: boolean | null
        }
        Insert: {
          active?: boolean | null
          department_id?: string | null
          hospital_id: string
          id?: string
          location_node_id?: string | null
          name: string
          printer_type?: string | null
          status?: string | null
          supports_color?: boolean | null
          supports_duplex?: boolean | null
        }
        Update: {
          active?: boolean | null
          department_id?: string | null
          hospital_id?: string
          id?: string
          location_node_id?: string | null
          name?: string
          printer_type?: string | null
          status?: string | null
          supports_color?: boolean | null
          supports_duplex?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "printers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_location_node_id_fkey"
            columns: ["location_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          assigned_staff_id: string | null
          completed_at: string | null
          department_id: string | null
          id: string
          notes: string | null
          patient_id: string
          priority: string | null
          procedure_code: string
          procedure_name: string
          scheduled_at: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          completed_at?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          priority?: string | null
          procedure_code: string
          procedure_name: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          completed_at?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: string | null
          procedure_code?: string
          procedure_name?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_assignments: {
        Row: {
          assigned_at: string | null
          id: string
          patient_id: string | null
          released_at: string | null
          resource_id: string
          staff_id: string | null
          task_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          patient_id?: string | null
          released_at?: string | null
          resource_id: string
          staff_id?: string | null
          task_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          patient_id?: string | null
          released_at?: string | null
          resource_id?: string
          staff_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "resource_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_types: {
        Row: {
          category: string
          description: string | null
          id: string
          name: string
          requires_tracking: boolean | null
        }
        Insert: {
          category: string
          description?: string | null
          id?: string
          name: string
          requires_tracking?: boolean | null
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          name?: string
          requires_tracking?: boolean | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          asset_number: string
          department_id: string | null
          hospital_id: string
          id: string
          last_maintenance_at: string | null
          location_node_id: string | null
          next_maintenance_at: string | null
          resource_type_id: string
          serial_number: string | null
          status: string | null
        }
        Insert: {
          asset_number: string
          department_id?: string | null
          hospital_id: string
          id?: string
          last_maintenance_at?: string | null
          location_node_id?: string | null
          next_maintenance_at?: string | null
          resource_type_id: string
          serial_number?: string | null
          status?: string | null
        }
        Update: {
          asset_number?: string
          department_id?: string | null
          hospital_id?: string
          id?: string
          last_maintenance_at?: string | null
          location_node_id?: string | null
          next_maintenance_at?: string | null
          resource_type_id?: string
          serial_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_location_node_id_fkey"
            columns: ["location_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean | null
          capacity: number | null
          department_id: string | null
          floor_number: number | null
          id: string
          isolation_capable: boolean | null
          latitude: number | null
          longitude: number | null
          room_number: string
          room_type: string | null
          ward_id: string | null
        }
        Insert: {
          active?: boolean | null
          capacity?: number | null
          department_id?: string | null
          floor_number?: number | null
          id?: string
          isolation_capable?: boolean | null
          latitude?: number | null
          longitude?: number | null
          room_number: string
          room_type?: string | null
          ward_id?: string | null
        }
        Update: {
          active?: boolean | null
          capacity?: number | null
          department_id?: string | null
          floor_number?: number | null
          id?: string
          isolation_capable?: boolean | null
          latitude?: number | null
          longitude?: number | null
          room_number?: string
          room_type?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["ward_id"]
          },
          {
            foreignKeyName: "rooms_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          department_id: string | null
          display_name: string
          email: string | null
          employee_number: string
          first_name: string
          hospital_id: string
          id: string
          is_on_duty: boolean | null
          last_name: string
          phone: string | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          display_name: string
          email?: string | null
          employee_number: string
          first_name: string
          hospital_id: string
          id?: string
          is_on_duty?: boolean | null
          last_name: string
          phone?: string | null
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          display_name?: string
          email?: string | null
          employee_number?: string
          first_name?: string
          hospital_id?: string
          id?: string
          is_on_duty?: boolean | null
          last_name?: string
          phone?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_current_locations: {
        Row: {
          navigation_node_id: string
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          navigation_node_id: string
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          navigation_node_id?: string
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_current_locations_navigation_node_id_fkey"
            columns: ["navigation_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_current_locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_locations: {
        Row: {
          accuracy_meters: number | null
          id: string
          navigation_node_id: string
          recorded_at: string | null
          source: string | null
          staff_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          id?: string
          navigation_node_id: string
          recorded_at?: string | null
          source?: string | null
          staff_id: string
        }
        Update: {
          accuracy_meters?: number | null
          id?: string
          navigation_node_id?: string
          recorded_at?: string | null
          source?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_locations_navigation_node_id_fkey"
            columns: ["navigation_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          department_id: string | null
          id: string
          shift_end: string
          shift_start: string
          staff_id: string
          status: string | null
          ward_id: string | null
        }
        Insert: {
          department_id?: string | null
          id?: string
          shift_end: string
          shift_start: string
          staff_id: string
          status?: string | null
          ward_id?: string | null
        }
        Update: {
          department_id?: string | null
          id?: string
          shift_end?: string
          shift_start?: string
          staff_id?: string
          status?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["ward_id"]
          },
          {
            foreignKeyName: "staff_shifts_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_skills: {
        Row: {
          certified: boolean | null
          expires_at: string | null
          id: string
          proficiency: string | null
          skill_code: string
          staff_id: string
        }
        Insert: {
          certified?: boolean | null
          expires_at?: string | null
          id?: string
          proficiency?: string | null
          skill_code: string
          staff_id: string
        }
        Update: {
          certified?: boolean | null
          expires_at?: string | null
          id?: string
          proficiency?: string | null
          skill_code?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_skills_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          description: string
          hospital_id: string
          id: string
          metadata: Json | null
          patient_id: string | null
          resolved_at: string | null
          severity: string
          source: string | null
          title: string
          triggered_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          description: string
          hospital_id: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          resolved_at?: string | null
          severity: string
          source?: string | null
          title: string
          triggered_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          description?: string
          hospital_id?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string | null
          title?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "system_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          timestamp: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          assignment_role: string | null
          completed_at: string | null
          decline_reason: string | null
          declined_at: string | null
          id: string
          staff_id: string
          started_at: string | null
          task_id: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assignment_role?: string | null
          completed_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          staff_id: string
          started_at?: string | null
          task_id: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assignment_role?: string | null
          completed_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          staff_id?: string
          started_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          dependency_type: string | null
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          dependency_type?: string | null
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          dependency_type?: string | null
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_staff_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          task_id: string
        }
        Insert: {
          actor_staff_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          task_id: string
        }
        Update: {
          actor_staff_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          hospital_id: string
          id: string
          patient_id: string | null
          priority: number | null
          source: string | null
          started_at: string | null
          status: string | null
          task_type: string
          title: string
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          hospital_id: string
          id?: string
          patient_id?: string | null
          priority?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          task_type: string
          title: string
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string | null
          priority?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          task_type?: string
          title?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_events: {
        Row: {
          actor_staff_id: string | null
          created_at: string | null
          event_type: string
          id: string
          location_node_id: string | null
          metadata: Json | null
          transport_request_id: string
        }
        Insert: {
          actor_staff_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          location_node_id?: string | null
          metadata?: Json | null
          transport_request_id: string
        }
        Update: {
          actor_staff_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          location_node_id?: string | null
          metadata?: Json | null
          transport_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_events_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_events_location_node_id_fkey"
            columns: ["location_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_events_transport_request_id_fkey"
            columns: ["transport_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_requests: {
        Row: {
          assigned_resource_id: string | null
          assigned_staff_id: string | null
          completed_at: string | null
          created_at: string | null
          destination_id: string
          id: string
          patient_id: string
          pickup_location_id: string
          priority: number | null
          requested_by: string | null
          required_at: string | null
          started_at: string | null
          status: string | null
          transport_type: string | null
        }
        Insert: {
          assigned_resource_id?: string | null
          assigned_staff_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_id: string
          id?: string
          patient_id: string
          pickup_location_id: string
          priority?: number | null
          requested_by?: string | null
          required_at?: string | null
          started_at?: string | null
          status?: string | null
          transport_type?: string | null
        }
        Update: {
          assigned_resource_id?: string | null
          assigned_staff_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_id?: string
          id?: string
          patient_id?: string
          pickup_location_id?: string
          priority?: number | null
          requested_by?: string | null
          required_at?: string | null
          started_at?: string | null
          status?: string | null
          transport_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_requests_assigned_resource_id_fkey"
            columns: ["assigned_resource_id"]
            isOneToOne: false
            referencedRelation: "transport_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "transport_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_resources: {
        Row: {
          capacity: number | null
          hospital_id: string
          id: string
          identifier: string
          location_node_id: string | null
          resource_type: string
          status: string | null
        }
        Insert: {
          capacity?: number | null
          hospital_id: string
          id?: string
          identifier: string
          location_node_id?: string | null
          resource_type: string
          status?: string | null
        }
        Update: {
          capacity?: number | null
          hospital_id?: string
          id?: string
          identifier?: string
          location_node_id?: string | null
          resource_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_resources_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_resources_location_node_id_fkey"
            columns: ["location_node_id"]
            isOneToOne: false
            referencedRelation: "navigation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals: {
        Row: {
          diastolic_bp: number | null
          heart_rate: number | null
          id: string
          pain_score: number | null
          patient_id: string
          raw_data: Json | null
          recorded_at: string | null
          recorded_by: string | null
          respiratory_rate: number | null
          spo2: number | null
          systolic_bp: number | null
          temperature: number | null
          weight_kg: number | null
        }
        Insert: {
          diastolic_bp?: number | null
          heart_rate?: number | null
          id?: string
          pain_score?: number | null
          patient_id: string
          raw_data?: Json | null
          recorded_at?: string | null
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic_bp?: number | null
          temperature?: number | null
          weight_kg?: number | null
        }
        Update: {
          diastolic_bp?: number | null
          heart_rate?: number | null
          id?: string
          pain_score?: number | null
          patient_id?: string
          raw_data?: Json | null
          recorded_at?: string | null
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic_bp?: number | null
          temperature?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_current_state"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_interactions: {
        Row: {
          confidence: number | null
          ended_at: string | null
          entities: Json | null
          id: string
          intent: Json | null
          interrupted: boolean | null
          interruption_reason: string | null
          session_id: string
          staff_id: string | null
          started_at: string | null
          transcript: string
        }
        Insert: {
          confidence?: number | null
          ended_at?: string | null
          entities?: Json | null
          id?: string
          intent?: Json | null
          interrupted?: boolean | null
          interruption_reason?: string | null
          session_id: string
          staff_id?: string | null
          started_at?: string | null
          transcript: string
        }
        Update: {
          confidence?: number | null
          ended_at?: string | null
          entities?: Json | null
          id?: string
          intent?: Json | null
          interrupted?: boolean | null
          interruption_reason?: string | null
          session_id?: string
          staff_id?: string | null
          started_at?: string | null
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "warden_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_interactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      warden_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          confirmation_required: boolean | null
          confirmed: boolean | null
          created_at: string | null
          decision_reason: string | null
          executed: boolean | null
          execution_result: Json | null
          id: string
          interpreted_intent: Json | null
          proposed_action: Json | null
          session_id: string | null
          staff_id: string | null
          target_id: string | null
          target_type: string
          user_command: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          confirmation_required?: boolean | null
          confirmed?: boolean | null
          created_at?: string | null
          decision_reason?: string | null
          executed?: boolean | null
          execution_result?: Json | null
          id?: string
          interpreted_intent?: Json | null
          proposed_action?: Json | null
          session_id?: string | null
          staff_id?: string | null
          target_id?: string | null
          target_type: string
          user_command: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          confirmation_required?: boolean | null
          confirmed?: boolean | null
          created_at?: string | null
          decision_reason?: string | null
          executed?: boolean | null
          execution_result?: Json | null
          id?: string
          interpreted_intent?: Json | null
          proposed_action?: Json | null
          session_id?: string | null
          staff_id?: string | null
          target_id?: string | null
          target_type?: string
          user_command?: string
        }
        Relationships: [
          {
            foreignKeyName: "warden_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "warden_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warden_actions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      warden_sessions: {
        Row: {
          context: Json | null
          device_id: string | null
          ended_at: string | null
          id: string
          staff_id: string
          started_at: string | null
        }
        Insert: {
          context?: Json | null
          device_id?: string | null
          ended_at?: string | null
          id?: string
          staff_id: string
          started_at?: string | null
        }
        Update: {
          context?: Json | null
          device_id?: string | null
          ended_at?: string | null
          id?: string
          staff_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warden_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          active: boolean | null
          capacity: number | null
          code: string
          created_at: string | null
          department_id: string | null
          floor_number: number | null
          hospital_id: string
          id: string
          name: string
          ward_type: string | null
        }
        Insert: {
          active?: boolean | null
          capacity?: number | null
          code: string
          created_at?: string | null
          department_id?: string | null
          floor_number?: number | null
          hospital_id: string
          id?: string
          name: string
          ward_type?: string | null
        }
        Update: {
          active?: boolean | null
          capacity?: number | null
          code?: string
          created_at?: string | null
          department_id?: string | null
          floor_number?: number | null
          hospital_id?: string
          id?: string
          name?: string
          ward_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wards_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      patient_current_state: {
        Row: {
          active_escalation_id: string | null
          active_transport_id: string | null
          acuity: string | null
          bed_id: string | null
          bed_number: string | null
          bed_status: string | null
          discharge_status: string | null
          last_event_at: string | null
          latest_vitals: Json | null
          overdue_task_count: number | null
          patient_id: string | null
          patient_status: string | null
          pending_medication_count: number | null
          pending_task_count: number | null
          room_id: string | null
          room_number: string | null
          state_updated_at: string | null
          ward_id: string | null
          ward_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance' | 'blocked';
export type PatientAcuity = 'stable' | 'needs_attention' | 'urgent' | 'critical';
export type PatientStatus = 'admitted' | 'observation' | 'discharged' | 'transferred' | 'deceased';
export type TaskType =
  | 'patient_check'
  | 'medication'
  | 'transport'
  | 'doctor_review'
  | 'lab_collection'
  | 'family_call'
  | 'discharge'
  | 'cleaning'
  | 'maintenance'
  | 'inventory'
  | 'handoff'
  | 'printing'
  | 'facility'
  | 'emergency';
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled'
  | 'overdue';
export type TaskUrgency = 'low' | 'routine' | 'urgent' | 'stat';
export type PrintJobStatus =
  | 'queued'
  | 'processing'
  | 'printing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';
export type CleaningJobStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type TransportRequestStatus =
  | 'requested'
  | 'assigned'
  | 'in_transit'
  | 'completed'
  | 'cancelled';
