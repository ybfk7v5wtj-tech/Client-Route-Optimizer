import React, { useState, useMemo } from 'react';
import { Client, Meeting } from '@/types';

interface MeetingHistoryTimelineProps {
  client: Client;
  meetings: Meeting[];
  onClose: () => void;
}

const MeetingHistoryTimeline: React.FC<MeetingHistoryTimelineProps> = ({
  client,
  meetings,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());

  // Filter meetings for this client
  const clientMeetings = useMemo(() => {
    let filtered = meetings.filter(m => m.clientId === client.id);
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.notes.toLowerCase().includes(query) ||
        m.location?.toLowerCase().includes(query)
      );
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
      const dateB = new Date(`${b.date}T${b.startTime}`).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  }, [meetings, client.id, statusFilter, searchQuery, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const allClientMeetings = meetings.filter(m => m.clientId === client.id);
    return {
      total: allClientMeetings.length,
      completed: allClientMeetings.filter(m => m.status === 'completed').length,
      scheduled: allClientMeetings.filter(m => m.status === 'scheduled').length,
      cancelled: allClientMeetings.filter(m => m.status === 'cancelled').length,
      inPerson: allClientMeetings.filter(m => m.type === 'in-person').length,
      virtual: allClientMeetings.filter(m => m.type === 'virtual').length,
      phone: allClientMeetings.filter(m => m.type === 'phone').length,
    };
  }, [meetings, client.id]);

  const toggleMeetingExpanded = (meetingId: string) => {
    setExpandedMeetings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId);
      } else {
        newSet.add(meetingId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedMeetings(new Set(clientMeetings.map(m => m.id)));
  };

  const collapseAll = () => {
    setExpandedMeetings(new Set());
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: Meeting['type']) => {
    switch (type) {
      case 'in-person':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'virtual':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'phone':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
    }
  };

  const getPriorityBadge = (priority: Meeting['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-600',
    };
    return colors[priority];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Title', 'Type', 'Status', 'Priority', 'Location', 'Notes'];
    const rows = clientMeetings.map(m => [
      m.date,
      `${formatTime(m.startTime)} - ${formatTime(m.endTime)}`,
      m.title,
      m.type,
      m.status,
      m.priority,
      m.location || '',
      m.notes.replace(/"/g, '""'),
    ]);
    
    const csvContent = [
      `Meeting History for ${client.name} - ${client.company}`,
      `Exported on ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meeting-history-${client.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const exportData = {
      client: {
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
      },
      exportDate: new Date().toISOString(),
      totalMeetings: clientMeetings.length,
      meetings: clientMeetings.map(m => ({
        date: m.date,
        startTime: m.startTime,
        endTime: m.endTime,
        title: m.title,
        type: m.type,
        status: m.status,
        priority: m.priority,
        location: m.location,
        notes: m.notes,
        travelTime: m.travelTime,
      })),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meeting-history-${client.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
      ) : part
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Meeting History</h2>
                <p className="text-sm text-gray-600">{client.name} - {client.company}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Meetings</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              <p className="text-xs text-gray-500">Scheduled</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <p className="text-2xl font-bold text-purple-600">{stats.inPerson}</p>
              <p className="text-xs text-gray-500">In-Person</p>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, titles, locations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sort */}
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span className="text-sm">{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            {/* Export */}
            <div className="relative group">
              <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export</span>
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                >
                  Export as CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          </div>

          {/* Expand/Collapse */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-gray-500">
              Showing {clientMeetings.length} of {stats.total} meetings
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={expandAll}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {clientMeetings.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No meetings found</h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search or filters.'
                  : 'No meetings have been recorded for this client yet.'}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {/* Timeline items */}
              <div className="space-y-6">
                {clientMeetings.map((meeting, index) => {
                  const isExpanded = expandedMeetings.has(meeting.id);
                  const isCompleted = meeting.status === 'completed';
                  const isPast = new Date(meeting.date) < new Date();
                  
                  return (
                    <div key={meeting.id} className="relative pl-14">
                      {/* Timeline dot */}
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-4 ${
                        isCompleted 
                          ? 'bg-green-500 border-green-200' 
                          : meeting.status === 'cancelled'
                            ? 'bg-red-500 border-red-200'
                            : isPast
                              ? 'bg-yellow-500 border-yellow-200'
                              : 'bg-blue-500 border-blue-200'
                      }`}></div>

                      {/* Meeting card */}
                      <div 
                        className={`bg-white rounded-xl border transition-all ${
                          isExpanded ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Card header */}
                        <button
                          onClick={() => toggleMeetingExpanded(meeting.id)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(meeting.status)}`}>
                                  {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityBadge(meeting.priority)}`}>
                                  {meeting.priority}
                                </span>
                                <span className="flex items-center text-xs text-gray-500">
                                  {getTypeIcon(meeting.type)}
                                  <span className="ml-1">{meeting.type}</span>
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900">
                                {highlightSearchTerm(meeting.title)}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {formatDate(meeting.date)} • {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                              </p>
                            </div>
                            <svg 
                              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="pt-4 space-y-4">
                              {/* Location */}
                              {meeting.location && (
                                <div className="flex items-start space-x-3">
                                  <div className="p-2 bg-gray-100 rounded-lg">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
                                    <p className="text-sm text-gray-900">{highlightSearchTerm(meeting.location)}</p>
                                    {meeting.travelTime && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Travel time: {meeting.travelTime} min
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              <div className="flex items-start space-x-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-500 uppercase">Meeting Notes</p>
                                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                                    {meeting.notes ? highlightSearchTerm(meeting.notes) : (
                                      <span className="text-gray-400 italic">No notes recorded</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Outcome indicator for completed meetings */}
                              {isCompleted && (
                                <div className="flex items-start space-x-3">
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Outcome</p>
                                    <p className="text-sm text-green-700">Meeting completed successfully</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            First meeting: {stats.total > 0 
              ? formatDate(meetings.filter(m => m.clientId === client.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date || '')
              : 'N/A'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingHistoryTimeline;
