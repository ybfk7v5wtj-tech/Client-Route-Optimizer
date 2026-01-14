import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Client, Meeting, CustomField, SalesforceConfig, ViewMode, Task, User, SavedFilter, ClientFilters, ClientNote } from '@/types';
import { sampleClients, sampleMeetings, sampleCustomFields } from '@/data/sampleData';
import { clientsApi, meetingsApi, customFieldsApi, userSettingsApi, tasksApi, savedFiltersApi, seedInitialData, refreshMeetingDates } from '@/lib/database';

import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';
import CalendarView from '@/components/calendar/CalendarView';
import ClientCard from '@/components/clients/ClientCard';
import MeetingCard from '@/components/meetings/MeetingCard';
import RouteOptimizer from '@/components/routes/RouteOptimizer';
import ExcelImportExport from '@/components/excel/ExcelImportExport';
import SalesforceIntegration from '@/components/salesforce/SalesforceIntegration';
import CustomFieldBuilder from '@/components/clients/CustomFieldBuilder';
import MeetingModal from '@/components/meetings/MeetingModal';
import MeetingExport from '@/components/meetings/MeetingExport';
import ClientModal from '@/components/clients/ClientModal';
import AuthModal from '@/components/auth/AuthModal';
import TasksPanel from '@/components/tasks/TasksPanel';
import ClientFilterPanel from '@/components/clients/ClientFilterPanel';
import MeetingHistoryTimeline from '@/components/clients/MeetingHistoryTimeline';
import ClientNotesHistory from '@/components/clients/ClientNotesHistory';
import { useToast } from '@/hooks/use-toast';


const heroImage = 'https://d64gsuwffb70l.cloudfront.net/6952e0879bc3ae8aa3d981ac_1767039220070_8ceada73.jpg';

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <svg className={`animate-spin ${sizeClasses[size]} text-blue-600`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
};

// Full Page Loading Component
const FullPageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
    <LoadingSpinner size="lg" />
    <p className="mt-4 text-gray-600 font-medium">{message}</p>
  </div>
);

// Error Banner Component
const ErrorBanner: React.FC<{ message: string; onRetry?: () => void; onDismiss?: () => void }> = ({ 
  message, 
  onRetry, 
  onDismiss 
}) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-start">
      <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="ml-3 flex-1">
        <p className="text-sm text-red-700">{message}</p>
        <div className="mt-2 flex space-x-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Try Again
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Empty filters constant
const emptyFilters: ClientFilters = {
  tags: [],
  cities: [],
  statuses: [],
  customFields: {},
};

const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Loading and error states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State
  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState<ClientFilters>(emptyFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Modal states
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showSalesforceModal, setShowSalesforceModal] = useState(false);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showMeetingExportModal, setShowMeetingExportModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMeetingHistory, setShowMeetingHistory] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [showNotesHistory, setShowNotesHistory] = useState(false);
  const [notesClient, setNotesClient] = useState<Client | null>(null);

  
  // Salesforce config
  const [salesforceConfig, setSalesforceConfig] = useState<SalesforceConfig>({
    connected: false,
    syncDirection: 'bidirectional',
    fieldMappings: {},
  });

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
            avatarUrl: authUser.user_metadata?.avatar_url,
          });
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatarUrl: session.user.user_metadata?.avatar_url,
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        // Reset data on sign out
        setClients([]);
        setMeetings([]);
        setCustomFields([]);
        setTasks([]);
        setSavedFilters([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsInitialLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsInitialLoading(true);
        setError(null);

        // Try to seed or fetch data
        const { clients: loadedClients, meetings: loadedMeetings, customFields: loadedFields, tasks: loadedTasks } = 
          await seedInitialData(sampleClients, sampleMeetings, sampleCustomFields);

        setClients(loadedClients);
        setMeetings(loadedMeetings);
        setCustomFields(loadedFields);
        setTasks(loadedTasks);

        // Load saved filters
        try {
          const filters = await savedFiltersApi.getAll();
          setSavedFilters(filters);
        } catch (e) {
          console.error('Failed to load saved filters:', e);
        }

        // Load user settings
        const settings = await userSettingsApi.get();
        if (settings) {
          setSalesforceConfig(settings);
        }

        toast({
          title: 'Data loaded',
          description: 'Your data has been synced from the database.',
        });
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data from the database. Using sample data instead.');
        // Fallback to sample data
        setClients(sampleClients);
        setMeetings(sampleMeetings);
        setCustomFields(sampleCustomFields);
        setTasks([]);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [user, isAuthLoading]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (isInitialLoading || !user) return;

    const clientsSubscription = clientsApi.subscribeToChanges((updatedClients) => {
      setClients(updatedClients);
    });

    const meetingsSubscription = meetingsApi.subscribeToChanges((updatedMeetings) => {
      setMeetings(updatedMeetings);
    });

    const customFieldsSubscription = customFieldsApi.subscribeToChanges((updatedFields) => {
      setCustomFields(updatedFields);
    });

    const tasksSubscription = tasksApi.subscribeToChanges((updatedTasks) => {
      setTasks(updatedTasks);
    });

    const savedFiltersSubscription = savedFiltersApi.subscribeToChanges((updatedFilters) => {
      setSavedFilters(updatedFilters);
    });

    return () => {
      clientsSubscription.unsubscribe();
      meetingsSubscription.unsubscribe();
      customFieldsSubscription.unsubscribe();
      tasksSubscription.unsubscribe();
      savedFiltersSubscription.unsubscribe();
    };
  }, [isInitialLoading, user]);

  // Computed values
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const today = formatDate(new Date());

  const stats = useMemo(() => {
    const todayMeetings = meetings.filter(m => m.date === today && m.status !== 'cancelled');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekMeetings = meetings.filter(m => {
      const meetingDate = new Date(m.date);
      return meetingDate >= weekStart && m.status !== 'cancelled';
    });
    const completedMeetings = meetings.filter(m => m.status === 'completed');
    const avgTravelTime = meetings
      .filter(m => m.travelTime)
      .reduce((acc, m) => acc + (m.travelTime || 0), 0) / Math.max(meetings.filter(m => m.travelTime).length, 1);

    return {
      todayMeetings: todayMeetings.length,
      weekMeetings: weekMeetings.length,
      monthMeetings: meetings.filter(m => m.status !== 'cancelled').length,
      totalClients: clients.length,
      avgTravelTime: Math.round(avgTravelTime),
      completedMeetings: completedMeetings.length,
      upcomingMeetings: meetings.filter(m => m.status === 'scheduled').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
    };
  }, [meetings, clients, tasks, today]);

  // Helper function to get client status based on activity
  const getClientStatus = useCallback((client: Client): string => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const createdDate = new Date(client.createdAt);
    if (createdDate >= sevenDaysAgo) {
      return 'new';
    }
    
    if (client.lastVisit) {
      const lastVisitDate = new Date(client.lastVisit);
      if (lastVisitDate >= thirtyDaysAgo) {
        return 'active';
      }
    }
    
    return 'inactive';
  }, []);

  // Filter clients based on search and advanced filters
  const filteredClients = useMemo(() => {
    let result = clients;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.company.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Tag filter
    if (activeFilters.tags.length > 0) {
      result = result.filter(c => 
        activeFilters.tags.some(tag => c.tags.includes(tag))
      );
    }
    
    // City filter
    if (activeFilters.cities.length > 0) {
      result = result.filter(c => 
        activeFilters.cities.includes(c.city)
      );
    }
    
    // Status filter
    if (activeFilters.statuses.length > 0) {
      result = result.filter(c => 
        activeFilters.statuses.includes(getClientStatus(c))
      );
    }
    
    // Custom fields filter
    Object.entries(activeFilters.customFields).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      
      // Handle min/max for number fields
      if (key.endsWith('_min')) {
        const fieldName = key.replace('_min', '');
        result = result.filter(c => {
          const fieldValue = c.customFields[fieldName];
          return fieldValue !== undefined && Number(fieldValue) >= Number(value);
        });
      } else if (key.endsWith('_max')) {
        const fieldName = key.replace('_max', '');
        result = result.filter(c => {
          const fieldValue = c.customFields[fieldName];
          return fieldValue !== undefined && Number(fieldValue) <= Number(value);
        });
      } else if (typeof value === 'boolean') {
        result = result.filter(c => c.customFields[key] === value);
      } else {
        result = result.filter(c => {
          const fieldValue = c.customFields[key];
          if (typeof fieldValue === 'string') {
            return fieldValue.toLowerCase().includes(String(value).toLowerCase());
          }
          return fieldValue === value;
        });
      }
    });
    
    return result;
  }, [clients, searchQuery, activeFilters, getClientStatus]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return activeFilters.tags.length + 
           activeFilters.cities.length + 
           activeFilters.statuses.length + 
           Object.keys(activeFilters.customFields).length;
  }, [activeFilters]);

  const todayMeetings = useMemo(() => {
    return meetings
      .filter(m => m.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [meetings, today]);

  // Handlers
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfileMenu(false);
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
    } catch (err) {
      console.error('Sign out failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMeetingStatusChange = useCallback(async (meetingId: string, status: Meeting['status']) => {
    try {
      setIsSaving(true);
      await meetingsApi.updateStatus(meetingId, status);
      setMeetings(prev => prev.map(m => 
        m.id === meetingId ? { ...m, status } : m
      ));
      toast({
        title: 'Meeting updated',
        description: `Meeting status changed to ${status}.`,
      });
    } catch (err) {
      console.error('Failed to update meeting status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update meeting status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleSaveMeeting = useCallback(async (meeting: Meeting) => {
    try {
      setIsSaving(true);
      const exists = meetings.find(m => m.id === meeting.id);
      
      if (exists) {
        const updated = await meetingsApi.update(meeting);
        setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m));
        toast({
          title: 'Meeting updated',
          description: 'Meeting has been updated successfully.',
        });
      } else {
        const created = await meetingsApi.create(meeting);
        setMeetings(prev => [...prev, created]);
        toast({
          title: 'Meeting scheduled',
          description: 'New meeting has been scheduled successfully.',
        });
      }
    } catch (err) {
      console.error('Failed to save meeting:', err);
      toast({
        title: 'Error',
        description: 'Failed to save meeting. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [meetings, toast]);

  const handleDeleteMeeting = useCallback(async (meetingId: string) => {
    try {
      setIsSaving(true);
      await meetingsApi.delete(meetingId);
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      toast({
        title: 'Meeting deleted',
        description: 'Meeting has been deleted successfully.',
      });
    } catch (err) {
      console.error('Failed to delete meeting:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete meeting. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleSaveClient = useCallback(async (client: Client) => {
    try {
      setIsSaving(true);
      const exists = clients.find(c => c.id === client.id);
      
      if (exists) {
        const updated = await clientsApi.update(client);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast({
          title: 'Client updated',
          description: 'Client information has been updated successfully.',
        });
      } else {
        const created = await clientsApi.create(client);
        setClients(prev => [...prev, created]);
        toast({
          title: 'Client added',
          description: 'New client has been added successfully.',
        });
      }
    } catch (err) {
      console.error('Failed to save client:', err);
      toast({
        title: 'Error',
        description: 'Failed to save client. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [clients, toast]);

  const handleDeleteClient = useCallback(async (clientId: string) => {
    try {
      setIsSaving(true);
      await clientsApi.delete(clientId);
      setClients(prev => prev.filter(c => c.id !== clientId));
      toast({
        title: 'Client deleted',
        description: 'Client has been deleted successfully.',
      });
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete client. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleImportClients = useCallback(async (importedClients: Partial<Client>[]) => {
    try {
      setIsSaving(true);
      const newClients = importedClients.map(c => ({
        ...c,
        id: c.id || crypto.randomUUID(),
        name: c.name || '',
        company: c.company || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        zipCode: c.zipCode || '',
        latitude: c.latitude || 37.7749 + (Math.random() - 0.5) * 0.5,
        longitude: c.longitude || -122.4194 + (Math.random() - 0.5) * 0.5,
        notes: c.notes || '',
        tags: c.tags || [],
        customFields: c.customFields || {},
        createdAt: c.createdAt || new Date().toISOString().split('T')[0],
        totalMeetings: c.totalMeetings || 0,
      })) as Client[];

      const created = await clientsApi.bulkCreate(newClients);
      setClients(prev => [...prev, ...created]);
      toast({
        title: 'Import successful',
        description: `${created.length} clients have been imported.`,
      });
    } catch (err) {
      console.error('Failed to import clients:', err);
      toast({
        title: 'Error',
        description: 'Failed to import clients. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleAddCustomField = useCallback(async (field: CustomField) => {
    try {
      setIsSaving(true);
      const created = await customFieldsApi.create(field);
      setCustomFields(prev => [...prev, created]);
      toast({
        title: 'Field added',
        description: `Custom field "${field.name}" has been added.`,
      });
    } catch (err) {
      console.error('Failed to add custom field:', err);
      toast({
        title: 'Error',
        description: 'Failed to add custom field. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleRemoveCustomField = useCallback(async (fieldId: string) => {
    try {
      setIsSaving(true);
      await customFieldsApi.delete(fieldId);
      setCustomFields(prev => prev.filter(f => f.id !== fieldId));
      toast({
        title: 'Field removed',
        description: 'Custom field has been removed.',
      });
    } catch (err) {
      console.error('Failed to remove custom field:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove custom field. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleUpdateCustomField = useCallback(async (field: CustomField) => {
    try {
      setIsSaving(true);
      const updated = await customFieldsApi.update(field);
      setCustomFields(prev => prev.map(f => f.id === updated.id ? updated : f));
      toast({
        title: 'Field updated',
        description: `Custom field "${field.name}" has been updated.`,
      });
    } catch (err) {
      console.error('Failed to update custom field:', err);
      toast({
        title: 'Error',
        description: 'Failed to update custom field. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleSalesforceConfigUpdate = useCallback(async (config: SalesforceConfig) => {
    try {
      setIsSaving(true);
      await userSettingsApi.upsert(config);
      setSalesforceConfig(config);
      toast({
        title: 'Settings saved',
        description: 'Salesforce configuration has been updated.',
      });
    } catch (err) {
      console.error('Failed to save Salesforce config:', err);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Task handlers
  const handleAddTask = useCallback(async (task: Task) => {
    try {
      setIsSaving(true);
      const created = await tasksApi.create(task);
      setTasks(prev => [...prev, created]);
      toast({
        title: 'Task added',
        description: 'New task has been created.',
      });
    } catch (err) {
      console.error('Failed to add task:', err);
      toast({
        title: 'Error',
        description: 'Failed to add task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleUpdateTask = useCallback(async (task: Task) => {
    try {
      setIsSaving(true);
      const updated = await tasksApi.update(task);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast({
        title: 'Task updated',
        description: 'Task has been updated.',
      });
    } catch (err) {
      console.error('Failed to update task:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      setIsSaving(true);
      await tasksApi.delete(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({
        title: 'Task deleted',
        description: 'Task has been deleted.',
      });
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleCreateTaskFromMeeting = useCallback((meeting: Meeting) => {
    const client = clients.find(c => c.id === meeting.clientId);
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: `Follow up: ${meeting.title}`,
      description: meeting.notes ? `From meeting notes:\n${meeting.notes}` : '',
      meetingId: meeting.id,
      clientId: meeting.clientId,
      priority: meeting.priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    handleAddTask(newTask);
    setActiveView('tasks');
  }, [clients, handleAddTask]);


  // Handler for updating meeting times from route optimizer
  const handleUpdateMeetingTimes = useCallback(async (updates: { id: string; startTime: string; endTime: string }[]) => {
    try {
      setIsSaving(true);
      for (const update of updates) {
        const meeting = meetings.find(m => m.id === update.id);
        if (meeting) {
          const updatedMeeting = {
            ...meeting,
            startTime: update.startTime,
            endTime: update.endTime,
            flexibleTime: false, // Mark as no longer flexible since time is now set
          };
          await meetingsApi.update(updatedMeeting);
          setMeetings(prev => prev.map(m => m.id === update.id ? updatedMeeting : m));
        }
      }
      toast({
        title: 'Meeting times updated',
        description: `${updates.length} meeting${updates.length > 1 ? 's' : ''} updated with optimized times.`,
      });
    } catch (err) {
      console.error('Failed to update meeting times:', err);
      toast({
        title: 'Error',
        description: 'Failed to update meeting times. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [meetings, toast]);


  // Saved filter handlers
  const handleSaveFilter = useCallback(async (name: string, filters: ClientFilters) => {
    try {
      setIsSaving(true);
      const created = await savedFiltersApi.create(name, filters);
      setSavedFilters(prev => [created, ...prev]);
      toast({
        title: 'Filter saved',
        description: `Filter "${name}" has been saved.`,
      });
    } catch (err) {
      console.error('Failed to save filter:', err);
      toast({
        title: 'Error',
        description: 'Failed to save filter. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleDeleteSavedFilter = useCallback(async (filterId: string) => {
    try {
      setIsSaving(true);
      await savedFiltersApi.delete(filterId);
      setSavedFilters(prev => prev.filter(f => f.id !== filterId));
      toast({
        title: 'Filter deleted',
        description: 'Saved filter has been deleted.',
      });
    } catch (err) {
      console.error('Failed to delete filter:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete filter. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleApplySavedFilter = useCallback((filter: SavedFilter) => {
    setActiveFilters(filter.filters);
    toast({
      title: 'Filter applied',
      description: `Applied "${filter.name}" filter.`,
    });
  }, [toast]);

  const getClientById = (clientId: string) => clients.find(c => c.id === clientId);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'clients', label: 'Clients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'routes', label: 'Routes', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  // Show loading screen while checking auth
  if (isAuthLoading) {
    return <FullPageLoader message="Checking authentication..." />;
  }

  // Show loading screen while initial data loads (only if authenticated)
  if (user && isInitialLoading) {
    return <FullPageLoader message="Loading your data..." />;
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'G';
    if (user.fullName) {
      const parts = user.fullName.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600">Saving...</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
        sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full'
      } ${isMobile ? 'w-64' : 'w-64'}`}>
        <div className="h-full bg-[#1a365d] text-white flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-blue-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">MeetingPro</h1>
                <p className="text-xs text-blue-300">Client Scheduler</p>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          {user && (
            <div className="px-4 py-2 bg-blue-900/30">
              <div className="flex items-center space-x-2 text-xs text-blue-200">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Synced with database</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (!user && item.id !== 'dashboard') {
                    setShowAuthModal(true);
                    return;
                  }
                  setActiveView(item.id as ViewMode);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  activeView === item.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="font-medium">{item.label}</span>
                {item.id === 'tasks' && stats.pendingTasks > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {stats.pendingTasks}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Quick Actions */}
          {user && (
            <div className="p-4 border-t border-blue-800">
              <button
                onClick={() => {
                  setSelectedMeeting(null);
                  setShowMeetingModal(true);
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">New Meeting</span>
              </button>
            </div>
          )}

          {/* Integrations */}
          {user && (
            <div className="p-4 border-t border-blue-800 space-y-2">
              <button
                onClick={() => setShowExcelModal(true)}
                className="w-full flex items-center space-x-3 px-4 py-2 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">Excel Import/Export</span>
              </button>
              <button
                onClick={() => setShowSalesforceModal(true)}
                className="w-full flex items-center space-x-3 px-4 py-2 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <span className="text-sm">Salesforce</span>
                {salesforceConfig.connected && (
                  <span className="ml-auto w-2 h-2 bg-green-400 rounded-full"></span>
                )}
              </button>
            </div>
          )}

          {/* User Profile */}
          <div className="p-4 border-t border-blue-800">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {getUserInitials()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">{user.fullName || 'User'}</p>
                    <p className="text-xs text-blue-300 truncate">{user.email}</p>
                  </div>
                  <svg className={`w-4 h-4 text-blue-300 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.fullName || 'User'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white text-[#1a365d] font-medium rounded-xl hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all ${isMobile ? 'ml-0' : 'ml-64'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">{activeView}</h2>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {stats.pendingTasks > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Profile (header) */}
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {getUserInitials()}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <ErrorBanner
              message={error}
              onRetry={() => window.location.reload()}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Not Authenticated Message */}
          {!user && activeView !== 'dashboard' && (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to access this feature</h3>
              <p className="text-gray-500 mb-6">Create an account or sign in to manage your clients and meetings.</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In or Create Account
              </button>
            </div>
          )}

          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div 
                className="relative h-48 rounded-2xl overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: `url(${heroImage})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/90 to-[#1a365d]/50"></div>
                <div className="absolute inset-0 flex items-center px-8">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {user ? `Welcome back, ${user.fullName?.split(' ')[0] || 'User'}!` : 'Welcome to MeetingPro!'}
                    </h1>
                    <p className="text-blue-100 max-w-md">
                      {user 
                        ? `You have ${stats.todayMeetings} meetings scheduled for today. Let's make it productive!`
                        : 'Sign in to start managing your client meetings efficiently.'}
                    </p>
                    {user ? (
                      <button
                        onClick={() => {
                          setSelectedMeeting(null);
                          setShowMeetingModal(true);
                        }}
                        className="mt-4 px-6 py-2 bg-white text-[#1a365d] font-medium rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Schedule Meeting
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="mt-4 px-6 py-2 bg-white text-[#1a365d] font-medium rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Get Started
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {user && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Today's Meetings"
                      value={stats.todayMeetings}
                      icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                      color="blue"
                      trend={{ value: 12, isPositive: true }}
                    />
                    <StatCard
                      title="Total Clients"
                      value={stats.totalClients}
                      icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                      color="purple"
                    />
                    <StatCard
                      title="Pending Tasks"
                      value={stats.pendingTasks}
                      icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                      color="orange"
                    />
                    <StatCard
                      title="Completed"
                      value={stats.completedMeetings}
                      icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      color="green"
                    />
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Today's Schedule */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Today's Schedule</h3>
                        <button
                          onClick={() => setActiveView('calendar')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Calendar
                        </button>
                      </div>
                      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                        {todayMeetings.length === 0 ? (
                          <div className="text-center py-8">
                            <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500">No meetings scheduled for today</p>
                          </div>
                        ) : (
                          todayMeetings.map(meeting => (
                            <MeetingCard
                              key={meeting.id}
                              meeting={meeting}
                              client={getClientById(meeting.clientId)}
                              onEdit={(m) => {
                                setSelectedMeeting(m);
                                setShowMeetingModal(true);
                              }}
                              onStatusChange={handleMeetingStatusChange}
                              onCreateTask={handleCreateTaskFromMeeting}
                              compact
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Route Optimizer */}
                    {/* Route Optimizer */}
                    <div>
                      <RouteOptimizer
                        meetings={meetings}
                        clients={clients}
                        selectedDate={new Date()}
                        onUpdateMeetingTimes={handleUpdateMeetingTimes}
                      />
                    </div>

                  </div>

                  {/* Recent Clients */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Recent Clients</h3>
                      <button
                        onClick={() => setActiveView('clients')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clients.slice(0, 6).map(client => (
                        <ClientCard
                          key={client.id}
                          client={client}
                          onSelect={(c) => {
                            setSelectedClient(c);
                            setShowClientModal(true);
                          }}
                          onEdit={(c) => {
                            setSelectedClient(c);
                            setShowClientModal(true);
                          }}
                          onScheduleMeeting={(c) => {
                            setSelectedClient(c);
                            setSelectedMeeting(null);
                            setShowMeetingModal(true);
                          }}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Calendar View */}
          {activeView === 'calendar' && user && (
            <div className="space-y-6">
              {/* Calendar Actions Bar */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    {meetings.filter(m => m.status === 'scheduled').length} scheduled meetings
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowMeetingExportModal(true)}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export Meetings</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date());
                      setActiveView('routes');
                    }}
                    className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span>Plan Route</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMeeting(null);
                      setShowMeetingModal(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Meeting</span>
                  </button>
                </div>
              </div>

              <CalendarView
                meetings={meetings}
                clients={clients}
                onMeetingEdit={(m) => {
                  setSelectedMeeting(m);
                  setShowMeetingModal(true);
                }}
                onMeetingStatusChange={handleMeetingStatusChange}
                onCreateTask={handleCreateTaskFromMeeting}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                }}
                onExportMeetings={() => setShowMeetingExportModal(true)}
              />
            </div>
          )}



          {/* Clients View */}
          {activeView === 'clients' && user && (
            <div className="space-y-6">
              {/* Actions Bar */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">{filteredClients.length} clients</span>
                  {activeFilterCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-blue-600 font-medium">
                        {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                      </span>
                      <button
                        onClick={() => setActiveFilters(emptyFilters)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowFilterPanel(true)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                      activeFilterCount > 0
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowCustomFieldModal(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>Custom Fields</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      setShowClientModal(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Client</span>
                  </button>
                </div>
              </div>

              {/* Active Filter Tags */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.tags.map(tag => (
                    <span
                      key={`tag-${tag}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {tag}
                      <button
                        onClick={() => setActiveFilters(prev => ({
                          ...prev,
                          tags: prev.tags.filter(t => t !== tag)
                        }))}
                        className="ml-1 hover:text-purple-900"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {activeFilters.cities.map(city => (
                    <span
                      key={`city-${city}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {city}
                      <button
                        onClick={() => setActiveFilters(prev => ({
                          ...prev,
                          cities: prev.cities.filter(c => c !== city)
                        }))}
                        className="ml-1 hover:text-green-900"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {activeFilters.statuses.map(status => (
                    <span
                      key={`status-${status}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                      <button
                        onClick={() => setActiveFilters(prev => ({
                          ...prev,
                          statuses: prev.statuses.filter(s => s !== status)
                        }))}
                        className="ml-1 hover:text-blue-900"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Clients Grid */}
              {filteredClients.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
                  <p className="text-gray-500 mb-4">
                    {activeFilterCount > 0 
                      ? 'Try adjusting your filters to see more results.'
                      : 'Add your first client to get started.'}
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => setActiveFilters(emptyFilters)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map(client => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onSelect={(c) => {
                        setSelectedClient(c);
                      }}
                      onEdit={(c) => {
                        setSelectedClient(c);
                        setShowClientModal(true);
                      }}
                      onScheduleMeeting={(c) => {
                        setSelectedClient(c);
                        setSelectedMeeting(null);
                        setShowMeetingModal(true);
                      }}
                      onViewHistory={(c) => {
                        setHistoryClient(c);
                        setShowMeetingHistory(true);
                      }}
                      onViewNotes={(c) => {
                        setNotesClient(c);
                        setShowNotesHistory(true);
                      }}

                    />
                  ))}
                </div>
              )}
            </div>
          )}




          {/* Tasks View */}
          {activeView === 'tasks' && user && (
            <TasksPanel
              tasks={tasks}
              meetings={meetings}
              clients={clients}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {/* Routes View */}
          {activeView === 'routes' && user && (
            <div className="space-y-6">
              {/* Routes Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    {meetings.filter(m => m.date === formatDate(selectedDate) && m.type === 'in-person' && m.status !== 'cancelled').length} in-person meetings for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setActiveView('calendar')}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>View Calendar</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMeeting(null);
                      setShowMeetingModal(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Meeting</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Route Optimizer - Takes 2 columns */}
                <div className="lg:col-span-2">
                  <RouteOptimizer
                    meetings={meetings}
                    clients={clients}
                    selectedDate={selectedDate}
                    onUpdateMeetingTimes={handleUpdateMeetingTimes}
                  />
                </div>


                {/* Date Selection & Day Summary */}
                <div className="space-y-6">
                  {/* Date Picker */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Select Date
                    </h3>
                    <input
                      type="date"
                      value={formatDate(selectedDate)}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Select</h4>
                      <div className="space-y-2">
                        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                          const date = new Date();
                          date.setDate(date.getDate() + offset);
                          const dayMeetings = meetings.filter(m => m.date === formatDate(date) && m.type === 'in-person' && m.status !== 'cancelled');
                          const allMeetings = meetings.filter(m => m.date === formatDate(date) && m.status !== 'cancelled');
                          return (
                            <button
                              key={offset}
                              onClick={() => setSelectedDate(date)}
                              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                formatDate(selectedDate) === formatDate(date)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-left">
                                <span className="font-medium text-gray-900 block">
                                  {offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                {allMeetings.length > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {allMeetings.length} meeting{allMeetings.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {dayMeetings.length > 0 && (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                    {dayMeetings.length} stop{dayMeetings.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Day's All Meetings Summary */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Day Summary
                    </h3>
                    {(() => {
                      const dayMeetings = meetings.filter(m => m.date === formatDate(selectedDate) && m.status !== 'cancelled');
                      const inPerson = dayMeetings.filter(m => m.type === 'in-person');
                      const virtual = dayMeetings.filter(m => m.type === 'virtual');
                      const phone = dayMeetings.filter(m => m.type === 'phone');
                      
                      if (dayMeetings.length === 0) {
                        return (
                          <div className="text-center py-4">
                            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 text-sm">No meetings scheduled</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Total Meetings</span>
                            <span className="font-bold text-gray-900">{dayMeetings.length}</span>
                          </div>
                          {inPerson.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span className="text-green-700">In-Person</span>
                              </div>
                              <span className="font-bold text-green-700">{inPerson.length}</span>
                            </div>
                          )}
                          {virtual.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="text-blue-700">Virtual</span>
                              </div>
                              <span className="font-bold text-blue-700">{virtual.length}</span>
                            </div>
                          )}
                          {phone.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-purple-700">Phone</span>
                              </div>
                              <span className="font-bold text-purple-700">{phone.length}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Settings View */}
          {activeView === 'settings' && user && (
            <div className="max-w-3xl space-y-6">
              {/* Database Status */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Database Status</h3>
                  <p className="text-sm text-gray-500 mt-1">Your data is automatically synced to the cloud</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Connected & Synced</p>
                      <p className="text-sm text-green-700">
                        {clients.length} clients, {meetings.length} meetings, {customFields.length} custom fields, {tasks.length} tasks
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Data Management */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Demo Data</h3>
                  <p className="text-sm text-gray-500 mt-1">Refresh meeting dates to see demo data on the calendar</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-amber-100 rounded-xl">
                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-amber-900">Refresh Meeting Dates</p>
                        <p className="text-sm text-amber-700">
                          Update all meeting dates to be relative to today so they appear on the calendar
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          const updatedMeetings = await refreshMeetingDates();
                          setMeetings(updatedMeetings);
                          toast({
                            title: 'Meetings refreshed',
                            description: `${updatedMeetings.length} meeting dates have been updated to current dates.`,
                          });
                        } catch (err) {
                          console.error('Failed to refresh meeting dates:', err);
                          toast({
                            title: 'Error',
                            description: 'Failed to refresh meeting dates. Please try again.',
                            variant: 'destructive',
                          });
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                    >
                      Refresh Dates
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Note: This will redistribute all meetings around today's date, with some in the past and most in the future.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Integrations</h3>
                  <p className="text-sm text-gray-500 mt-1">Connect external services to enhance your workflow</p>
                </div>
                <div className="p-6 space-y-4">
                  {/* Excel */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Excel Import/Export</p>
                        <p className="text-sm text-gray-500">Bulk import or export client data</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowExcelModal(true)}
                      className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Open
                    </button>
                  </div>

                  {/* Salesforce */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Salesforce</p>
                        <p className="text-sm text-gray-500">
                          {salesforceConfig.connected ? 'Connected' : 'Sync your CRM data'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSalesforceModal(true)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        salesforceConfig.connected
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      {salesforceConfig.connected ? 'Manage' : 'Connect'}
                    </button>
                  </div>

                  {/* Custom Fields */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Custom Fields</p>
                        <p className="text-sm text-gray-500">{customFields.length} fields configured</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCustomFieldModal(true)}
                      className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      Manage
                    </button>
                  </div>

                  {/* Meeting Export */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-indigo-100 rounded-xl">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Meeting Export</p>
                        <p className="text-sm text-gray-500">Export meeting history to PDF or CSV</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMeetingExportModal(true)}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>


      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
      />

      {showExcelModal && (
        <ExcelImportExport
          clients={clients}
          customFields={customFields}
          onImport={handleImportClients}
          onClose={() => setShowExcelModal(false)}
        />
      )}

      {showSalesforceModal && (
        <SalesforceIntegration
          config={salesforceConfig}
          customFields={customFields}
          clients={clients}
          onConfigUpdate={handleSalesforceConfigUpdate}
          onClose={() => setShowSalesforceModal(false)}
        />
      )}

      {showCustomFieldModal && (
        <CustomFieldBuilder
          customFields={customFields}
          onAddField={handleAddCustomField}
          onRemoveField={handleRemoveCustomField}
          onUpdateField={handleUpdateCustomField}
          onClose={() => setShowCustomFieldModal(false)}
        />
      )}

      {showMeetingModal && (
        <MeetingModal
          meeting={selectedMeeting}
          clients={clients}
          selectedDate={selectedDate}
          onSave={handleSaveMeeting}
          onDelete={handleDeleteMeeting}
          onClose={() => {
            setShowMeetingModal(false);
            setSelectedMeeting(null);
          }}
        />
      )}

      {showMeetingExportModal && (
        <MeetingExport
          meetings={meetings}
          clients={clients}
          onClose={() => setShowMeetingExportModal(false)}
        />
      )}

      {showClientModal && (
        <ClientModal
          client={selectedClient}
          customFields={customFields}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
          onClose={() => {
            setShowClientModal(false);
            setSelectedClient(null);
          }}
        />
      )}

      {showFilterPanel && (
        <ClientFilterPanel
          clients={clients}
          customFields={customFields}
          savedFilters={savedFilters}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          onSaveFilter={handleSaveFilter}
          onDeleteFilter={handleDeleteSavedFilter}
          onApplySavedFilter={handleApplySavedFilter}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      {showMeetingHistory && historyClient && (
        <MeetingHistoryTimeline
          client={historyClient}
          meetings={meetings}
          onClose={() => {
            setShowMeetingHistory(false);
            setHistoryClient(null);
          }}
        />
      )}

      {showNotesHistory && notesClient && (
        <ClientNotesHistory
          client={notesClient}
          onAddNote={(note) => {
            const updatedClient = {
              ...notesClient,
              notesHistory: [...(notesClient.notesHistory || []), note],
            };
            handleSaveClient(updatedClient);
            setNotesClient(updatedClient);
          }}
          onTogglePin={(noteId) => {
            const updatedHistory = (notesClient.notesHistory || []).map(n =>
              n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
            );
            const updatedClient = { ...notesClient, notesHistory: updatedHistory };
            handleSaveClient(updatedClient);
            setNotesClient(updatedClient);
          }}
          onDeleteNote={(noteId) => {
            const updatedHistory = (notesClient.notesHistory || []).filter(n => n.id !== noteId);
            const updatedClient = { ...notesClient, notesHistory: updatedHistory };
            handleSaveClient(updatedClient);
            setNotesClient(updatedClient);
          }}
          onClose={() => {
            setShowNotesHistory(false);
            setNotesClient(null);
          }}
        />
      )}

      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default AppLayout;
