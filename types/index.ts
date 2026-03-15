export interface Society {
  id: string
  name: string
  short_name: string
  description: string
  type: 'Academic' | 'Cultural' | 'Hobbies' | 'Sports' | 'Professional'
  university: string
  founded_year: number
  size: number
  logo_url?: string
  cover_url?: string
  instagram?: string
  facebook?: string
  linkedin?: string
  youtube?: string
  created_at: string
}

export interface Event {
  id: string
  society_id: string
  title: string
  description: string
  cover_url?: string
  date: string
  start_time: string
  end_time: string
  location: string
  arc_member_price: number
  non_arc_member_price: number
  capacity?: number
  registered_count: number
  ticket_sale_ends?: string
  category: 'Food' | 'Camp' | 'Academic' | 'Gaming' | 'Workshop' | 'Cultural Exchange' | 'Social' | 'Sports'
  is_featured: boolean
  created_at: string
  society?: Society
}

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  university: string
  degree: string
  stage: string
  birthday?: string
  gender?: string
  user_key: string
  role: 'student' | 'admin' | 'society_admin'
  show_events_to_friends: boolean
  created_at: string
}

export interface SocietyMembership {
  id: string
  user_id: string
  society_id: string
  created_at: string
  society?: Society
}

export interface EventRegistration {
  id: string
  user_id: string
  event_id: string
  ticket_type: 'arc' | 'non_arc'
  attendee_name?: string
  student_id?: string
  attendee_email?: string
  phone?: string
  dietary?: string
  created_at: string
  event?: Event
  profile?: Profile
}

export interface TeamMember {
  id: string
  society_id: string
  user_id?: string
  name: string
  role: string
  avatar_color: string
  profile?: Profile
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  requester?: Profile
  addressee?: Profile
}
