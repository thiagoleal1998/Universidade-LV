export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'member'
          active: boolean
          created_at: string
          admin_notes: string | null
          member_number: number | null
        }
        Insert: {
          id: string
          full_name?: string
          role?: 'admin' | 'member'
          active?: boolean
          created_at?: string
          admin_notes?: string | null
          member_number?: number | null
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'member'
          active?: boolean
          created_at?: string
          admin_notes?: string | null
          member_number?: number | null
        }
      }
      modules: {
        Row: {
          id: string
          title: string
          description: string
          cover_image_url: string | null
          order_index: number
          is_published: boolean
          created_at: string
          prerequisite_module_id: string | null
          course_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string
          cover_image_url?: string | null
          order_index?: number
          is_published?: boolean
          created_at?: string
          prerequisite_module_id?: string | null
          course_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          cover_image_url?: string | null
          order_index?: number
          is_published?: boolean
          created_at?: string
          prerequisite_module_id?: string | null
          course_id?: string | null
        }
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          description: string
          youtube_url: string | null
          content_text: string | null
          sheet_url: string | null
          order_index: number
          is_published: boolean
          created_at: string
          task_start_date: string | null
          task_end_date: string | null
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          description?: string
          youtube_url?: string | null
          content_text?: string | null
          sheet_url?: string | null
          order_index?: number
          is_published?: boolean
          created_at?: string
          task_start_date?: string | null
          task_end_date?: string | null
        }
        Update: {
          id?: string
          module_id?: string
          title?: string
          description?: string
          youtube_url?: string | null
          content_text?: string | null
          sheet_url?: string | null
          order_index?: number
          is_published?: boolean
          created_at?: string
          task_start_date?: string | null
          task_end_date?: string | null
        }
      }
      lesson_photos: {
        Row: {
          id: string
          lesson_id: string
          storage_path: string
          caption: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          storage_path: string
          caption?: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          storage_path?: string
          caption?: string
          order_index?: number
          created_at?: string
        }
      }
      member_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          completed_at?: string
        }
      }
    }
  }
}

export type Course = {
  id: string
  name: string
  description: string
  cover_image_url: string | null
  order_index: number
  is_published: boolean
  created_at: string
  instructor_name: string | null
  instructor_role: string | null
  instructor_photo_url: string | null
}
export type Tag = { id: string; name: string; color: string; created_at: string }
export type LessonAttachment = {
  id: string
  lesson_id: string
  name: string
  storage_path: string
  size_bytes: number
  mime_type: string
  order_index: number
  created_at: string
}
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Module = Database['public']['Tables']['modules']['Row']
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type LessonPhoto = Database['public']['Tables']['lesson_photos']['Row']
export type MemberProgress = Database['public']['Tables']['member_progress']['Row']
