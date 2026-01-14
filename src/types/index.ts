// Client Meeting Management Types

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
  options?: string[]; // For dropdown type
  required: boolean;
}

export interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isPinned: boolean;
  createdBy?: string; // User ID who created the note
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  notes: string; // Legacy single notes field
  notesHistory: ClientNote[]; // New notes history array
  tags: string[];
  customFields: Record<string, any>;
  createdAt: string;
  lastVisit?: string;
  totalMeetings: number;
  salesforceId?: string;
}

export interface Meeting {
  id: string;
  clientId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  type: 'in-person' | 'virtual' | 'phone';
  notes: string;
  location?: string;
  travelTime?: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  flexibleTime?: boolean; // If true, the meeting time can be optimized by route planner
}

export interface Task {
  id: string;
  title: string;
  description: string;
  meetingId?: string; // Optional reference to source meeting
  clientId?: string; // Optional reference to client
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface Route {
  id: string;
  date: string;
  meetings: string[]; // Meeting IDs in order
  totalDistance: number; // in miles
  totalTravelTime: number; // in minutes
  optimized: boolean;
}

export interface DaySchedule {
  date: string;
  meetings: Meeting[];
  totalTravelTime: number;
  totalMeetingTime: number;
}

export interface SalesforceConfig {
  connected: boolean;
  instanceUrl?: string;
  lastSync?: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  fieldMappings: Record<string, string>;
}

export interface AppStats {
  todayMeetings: number;
  weekMeetings: number;
  monthMeetings: number;
  totalClients: number;
  avgTravelTime: number;
  completedMeetings: number;
  upcomingMeetings: number;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: ClientFilters;
  createdAt: string;
}

export interface ClientFilters {
  tags: string[];
  cities: string[];
  statuses: string[]; // Based on meeting activity: 'active', 'inactive', 'new'
  customFields: Record<string, any>;
}

export type ViewMode = 'dashboard' | 'calendar' | 'clients' | 'routes' | 'tasks' | 'settings';
export type CalendarView = 'day' | 'week' | 'month';
