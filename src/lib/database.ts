import { supabase } from '@/lib/supabase';
import { Client, Meeting, CustomField, SalesforceConfig, Task, SavedFilter, ClientFilters, ClientNote } from '@/types';

// Type definitions for database records
interface DbClient {
  id: string;
  user_id: string | null;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  notes_history: ClientNote[] | null; // New field for notes history
  tags: string[];
  custom_fields: Record<string, any>;
  salesforce_id: string | null;
  total_meetings: number;
  last_visit: string | null;
  created_at: string;
  updated_at: string;
}

interface DbMeeting {
  id: string;
  user_id: string | null;
  client_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  notes: string | null;
  location: string | null;
  travel_time: number | null;
  priority: string;
  flexible_time: boolean;
  created_at: string;
  updated_at: string;
}


interface DbCustomField {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  options: string[];
  required: boolean;
  created_at: string;
  updated_at: string;
}

interface DbUserSettings {
  id: string;
  user_id: string | null;
  salesforce_connected: boolean;
  salesforce_instance_url: string | null;
  salesforce_last_sync: string | null;
  salesforce_sync_direction: string;
  salesforce_field_mappings: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface DbTask {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  meeting_id: string | null;
  client_id: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbSavedFilter {
  id: string;
  user_id: string | null;
  name: string;
  filters: ClientFilters;
  created_at: string;
  updated_at: string;
}

// Get current user ID helper
const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// Transform functions
const dbClientToClient = (db: DbClient): Client => ({
  id: db.id,
  name: db.name,
  company: db.company,
  email: db.email || '',
  phone: db.phone || '',
  address: db.address || '',
  city: db.city || '',
  state: db.state || '',
  zipCode: db.zip_code || '',
  latitude: db.latitude || 0,
  longitude: db.longitude || 0,
  notes: db.notes || '',
  notesHistory: db.notes_history || [],
  tags: db.tags || [],
  customFields: db.custom_fields || {},
  salesforceId: db.salesforce_id || undefined,
  totalMeetings: db.total_meetings || 0,
  lastVisit: db.last_visit || undefined,
  createdAt: db.created_at.split('T')[0],
});

const clientToDbClient = async (client: Client): Promise<Partial<DbClient>> => {
  const userId = await getCurrentUserId();
  return {
    id: client.id,
    user_id: userId,
    name: client.name,
    company: client.company,
    email: client.email || null,
    phone: client.phone || null,
    address: client.address || null,
    city: client.city || null,
    state: client.state || null,
    zip_code: client.zipCode || null,
    latitude: client.latitude || null,
    longitude: client.longitude || null,
    notes: client.notes || null,
    notes_history: client.notesHistory || [],
    tags: client.tags || [],
    custom_fields: client.customFields || {},
    salesforce_id: client.salesforceId || null,
    total_meetings: client.totalMeetings || 0,
    last_visit: client.lastVisit || null,
  };
};


const dbMeetingToMeeting = (db: DbMeeting): Meeting => {
  // Ensure date is in YYYY-MM-DD format (strip any time component)
  let dateStr = db.date;
  if (dateStr && dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  
  return {
    id: db.id,
    clientId: db.client_id,
    title: db.title,
    date: dateStr,
    startTime: db.start_time.substring(0, 5),
    endTime: db.end_time.substring(0, 5),
    status: db.status as Meeting['status'],
    type: db.type as Meeting['type'],
    notes: db.notes || '',
    location: db.location || undefined,
    travelTime: db.travel_time || undefined,
    priority: db.priority as Meeting['priority'],
    flexibleTime: db.flexible_time || false,
  };
};



const meetingToDbMeeting = async (meeting: Meeting): Promise<Partial<DbMeeting>> => {
  const userId = await getCurrentUserId();
  
  // Validate clientId - must be a valid UUID, not an empty string
  const clientId = meeting.clientId && meeting.clientId.trim() !== '' ? meeting.clientId : null;
  
  if (!clientId) {
    throw new Error('A valid client must be selected for the meeting');
  }
  
  return {
    id: meeting.id,
    user_id: userId,
    client_id: clientId,
    title: meeting.title,
    date: meeting.date,
    start_time: meeting.startTime,
    end_time: meeting.endTime,
    status: meeting.status,
    type: meeting.type,
    notes: meeting.notes || null,
    location: meeting.location || null,
    travel_time: meeting.travelTime || null,
    priority: meeting.priority,
    flexible_time: meeting.flexibleTime || false,
  };
};



const dbCustomFieldToCustomField = (db: DbCustomField): CustomField => ({
  id: db.id,
  name: db.name,
  type: db.type as CustomField['type'],
  options: db.options || undefined,
  required: db.required,
});

const customFieldToDbCustomField = async (field: CustomField): Promise<Partial<DbCustomField>> => {
  const userId = await getCurrentUserId();
  return {
    id: field.id,
    user_id: userId,
    name: field.name,
    type: field.type,
    options: field.options || [],
    required: field.required,
  };
};

const dbTaskToTask = (db: DbTask): Task => ({
  id: db.id,
  title: db.title,
  description: db.description || '',
  meetingId: db.meeting_id || undefined,
  clientId: db.client_id || undefined,
  dueDate: db.due_date || undefined,
  priority: db.priority as Task['priority'],
  status: db.status as Task['status'],
  createdAt: db.created_at,
  completedAt: db.completed_at || undefined,
});

const taskToDbTask = async (task: Task): Promise<Partial<DbTask>> => {
  const userId = await getCurrentUserId();
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description || null,
    meeting_id: task.meetingId || null,
    client_id: task.clientId || null,
    due_date: task.dueDate || null,
    priority: task.priority,
    status: task.status,
    completed_at: task.completedAt || null,
  };
};

const dbSavedFilterToSavedFilter = (db: DbSavedFilter): SavedFilter => ({
  id: db.id,
  name: db.name,
  filters: db.filters,
  createdAt: db.created_at,
});

// Client operations
export const clientsApi = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbClientToClient);
  },

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? dbClientToClient(data) : null;
  },

  async create(client: Client): Promise<Client> {
    const dbClient = await clientToDbClient(client);
    const { data, error } = await supabase
      .from('clients')
      .insert(dbClient)
      .select()
      .single();
    
    if (error) throw error;
    return dbClientToClient(data);
  },

  async update(client: Client): Promise<Client> {
    const dbClient = await clientToDbClient(client);
    const { data, error } = await supabase
      .from('clients')
      .update({ ...dbClient, updated_at: new Date().toISOString() })
      .eq('id', client.id)
      .select()
      .single();
    
    if (error) throw error;
    return dbClientToClient(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async bulkCreate(clients: Client[]): Promise<Client[]> {
    const userId = await getCurrentUserId();
    const dbClients = await Promise.all(clients.map(clientToDbClient));
    const { data, error } = await supabase
      .from('clients')
      .insert(dbClients)
      .select();
    
    if (error) throw error;
    return (data || []).map(dbClientToClient);
  },

  subscribeToChanges(callback: (clients: Client[]) => void) {
    return supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, async () => {
        const clients = await this.getAll();
        callback(clients);
      })
      .subscribe();
  },
};

// Meeting operations
export const meetingsApi = {
  async getAll(): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(dbMeetingToMeeting);
  },

  async getByDate(date: string): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('date', date)
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(dbMeetingToMeeting);
  },

  async getByClientId(clientId: string): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbMeetingToMeeting);
  },

  async create(meeting: Meeting): Promise<Meeting> {
    const dbMeeting = await meetingToDbMeeting(meeting);
    const { data, error } = await supabase
      .from('meetings')
      .insert(dbMeeting)
      .select()
      .single();
    
    if (error) throw error;
    return dbMeetingToMeeting(data);
  },

  async update(meeting: Meeting): Promise<Meeting> {
    const dbMeeting = await meetingToDbMeeting(meeting);
    const { data, error } = await supabase
      .from('meetings')
      .update({ ...dbMeeting, updated_at: new Date().toISOString() })
      .eq('id', meeting.id)
      .select()
      .single();
    
    if (error) throw error;
    return dbMeetingToMeeting(data);
  },

  async updateStatus(id: string, status: Meeting['status']): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  subscribeToChanges(callback: (meetings: Meeting[]) => void) {
    return supabase
      .channel('meetings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, async () => {
        const meetings = await this.getAll();
        callback(meetings);
      })
      .subscribe();
  },
};

// Custom fields operations
export const customFieldsApi = {
  async getAll(): Promise<CustomField[]> {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(dbCustomFieldToCustomField);
  },

  async create(field: CustomField): Promise<CustomField> {
    const dbField = await customFieldToDbCustomField(field);
    const { data, error } = await supabase
      .from('custom_fields')
      .insert(dbField)
      .select()
      .single();
    
    if (error) throw error;
    return dbCustomFieldToCustomField(data);
  },

  async update(field: CustomField): Promise<CustomField> {
    const dbField = await customFieldToDbCustomField(field);
    const { data, error } = await supabase
      .from('custom_fields')
      .update({ ...dbField, updated_at: new Date().toISOString() })
      .eq('id', field.id)
      .select()
      .single();
    
    if (error) throw error;
    return dbCustomFieldToCustomField(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  subscribeToChanges(callback: (fields: CustomField[]) => void) {
    return supabase
      .channel('custom-fields-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_fields' }, async () => {
        const fields = await this.getAll();
        callback(fields);
      })
      .subscribe();
  },
};

// Task operations
export const tasksApi = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbTaskToTask);
  },

  async getByMeetingId(meetingId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbTaskToTask);
  },

  async getByClientId(clientId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbTaskToTask);
  },

  async create(task: Task): Promise<Task> {
    const dbTask = await taskToDbTask(task);
    const { data, error } = await supabase
      .from('tasks')
      .insert(dbTask)
      .select()
      .single();
    
    if (error) throw error;
    return dbTaskToTask(data);
  },

  async update(task: Task): Promise<Task> {
    const dbTask = await taskToDbTask(task);
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...dbTask, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .select()
      .single();
    
    if (error) throw error;
    return dbTaskToTask(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  subscribeToChanges(callback: (tasks: Task[]) => void) {
    return supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const tasks = await this.getAll();
        callback(tasks);
      })
      .subscribe();
  },
};

// Saved filters operations
export const savedFiltersApi = {
  async getAll(): Promise<SavedFilter[]> {
    const { data, error } = await supabase
      .from('saved_filters')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbSavedFilterToSavedFilter);
  },

  async create(name: string, filters: ClientFilters): Promise<SavedFilter> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('saved_filters')
      .insert({
        user_id: userId,
        name,
        filters,
      })
      .select()
      .single();
    
    if (error) throw error;
    return dbSavedFilterToSavedFilter(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('saved_filters')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  subscribeToChanges(callback: (filters: SavedFilter[]) => void) {
    return supabase
      .channel('saved-filters-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_filters' }, async () => {
        const filters = await this.getAll();
        callback(filters);
      })
      .subscribe();
  },
};

// User settings operations
export const userSettingsApi = {
  async get(): Promise<SalesforceConfig | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      connected: data.salesforce_connected,
      instanceUrl: data.salesforce_instance_url || undefined,
      lastSync: data.salesforce_last_sync || undefined,
      syncDirection: data.salesforce_sync_direction as SalesforceConfig['syncDirection'],
      fieldMappings: data.salesforce_field_mappings || {},
    };
  },

  async upsert(config: SalesforceConfig): Promise<SalesforceConfig> {
    const userId = await getCurrentUserId();
    
    // First, try to get existing settings
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1)
      .single();

    const settingsData = {
      user_id: userId,
      salesforce_connected: config.connected,
      salesforce_instance_url: config.instanceUrl || null,
      salesforce_last_sync: config.lastSync || null,
      salesforce_sync_direction: config.syncDirection,
      salesforce_field_mappings: config.fieldMappings,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('user_settings')
        .update(settingsData)
        .eq('id', existing.id);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_settings')
        .insert(settingsData);
      
      if (error) throw error;
    }

    return config;
  },
};

// Helper to format date as YYYY-MM-DD
const formatDateString = (date: Date): string => date.toISOString().split('T')[0];

// Update meeting dates to be relative to today (for refreshing demo data)
export const refreshMeetingDates = async (): Promise<Meeting[]> => {
  const today = new Date();
  
  // Get all meetings
  const { data: meetings, error: fetchError } = await supabase
    .from('meetings')
    .select('*')
    .order('date', { ascending: true });
  
  if (fetchError) throw fetchError;
  if (!meetings || meetings.length === 0) return [];
  
  // Group meetings by their relative position (oldest first)
  // We'll redistribute them around today
  const updatedMeetings: Meeting[] = [];
  
  for (let i = 0; i < meetings.length; i++) {
    const meeting = meetings[i];
    // Distribute meetings: some in past, most around today and future
    const dayOffset = i < 3 ? -(3 - i) : (i - 3); // -2, -1, 0, 1, 2, 3, 4...
    const newDate = new Date(today);
    newDate.setDate(newDate.getDate() + dayOffset);
    
    const { error: updateError } = await supabase
      .from('meetings')
      .update({ 
        date: formatDateString(newDate),
        updated_at: new Date().toISOString()
      })
      .eq('id', meeting.id);
    
    if (!updateError) {
      updatedMeetings.push({
        ...dbMeetingToMeeting(meeting),
        date: formatDateString(newDate)
      });
    }
  }
  
  return updatedMeetings;
};

// Check if meetings need date refresh (all meetings are more than 7 days old)
const needsMeetingDateRefresh = (meetings: Meeting[]): boolean => {
  if (meetings.length === 0) return false;
  
  const today = new Date();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  // Check if any meeting is within the next 7 days
  const hasRecentMeetings = meetings.some(m => {
    const meetingDate = new Date(m.date);
    return meetingDate >= today && meetingDate <= sevenDaysFromNow;
  });
  
  return !hasRecentMeetings;
};

// Seed initial data if database is empty
export const seedInitialData = async (
  sampleClients: Client[],
  sampleMeetings: Meeting[],
  sampleCustomFields: CustomField[]
): Promise<{ clients: Client[]; meetings: Meeting[]; customFields: CustomField[]; tasks: Task[] }> => {
  // Check if data already exists
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id')
    .limit(1);

  if (existingClients && existingClients.length > 0) {
    // Data already exists, fetch it
    const clients = await clientsApi.getAll();
    let meetings = await meetingsApi.getAll();
    const customFields = await customFieldsApi.getAll();
    const tasks = await tasksApi.getAll();
    
    // Check if meetings need date refresh (all meetings are in the past or too far in the future)
    if (needsMeetingDateRefresh(meetings)) {
      console.log('Meetings are outdated, refreshing dates...');
      try {
        meetings = await refreshMeetingDates();
        console.log(`Refreshed ${meetings.length} meeting dates`);
      } catch (e) {
        console.error('Failed to refresh meeting dates:', e);
      }
    }
    
    return { clients, meetings, customFields, tasks };
  }

  // Seed clients - IDs are already proper UUIDs
  const createdClients = await clientsApi.bulkCreate(sampleClients);

  // Seed meetings - IDs and clientIds are already proper UUIDs
  const createdMeetings: Meeting[] = [];
  for (const meeting of sampleMeetings) {
    try {
      const created = await meetingsApi.create(meeting);
      createdMeetings.push(created);
    } catch (e) {
      console.error('Failed to create meeting:', e);
    }
  }

  // Seed custom fields - IDs are already proper UUIDs
  const createdFields: CustomField[] = [];
  for (const field of sampleCustomFields) {
    try {
      const created = await customFieldsApi.create(field);
      createdFields.push(created);
    } catch (e) {
      console.error('Failed to create custom field:', e);
    }
  }

  // Fetch tasks (will be empty initially)
  const tasks = await tasksApi.getAll();

  return {
    clients: createdClients,
    meetings: createdMeetings,
    customFields: createdFields,
    tasks,
  };
};

