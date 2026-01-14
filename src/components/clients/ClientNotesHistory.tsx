import React, { useState, useMemo } from 'react';
import { Client, ClientNote } from '@/types';

interface ClientNotesHistoryProps {
  client: Client;
  onAddNote: (note: ClientNote) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onClose: () => void;
}

const ClientNotesHistory: React.FC<ClientNotesHistoryProps> = ({
  client,
  onAddNote,
  onTogglePin,
  onDeleteNote,
  onClose,
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let notes = [...(client.notesHistory || [])];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      notes = notes.filter(note => 
        note.content.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      notes = notes.filter(note => new Date(note.createdAt) >= startDate);
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      notes = notes.filter(note => new Date(note.createdAt) <= endDate);
    }

    // Pinned filter
    if (showPinnedOnly) {
      notes = notes.filter(note => note.isPinned);
    }

    // Sort: pinned first, then by date (newest first)
    notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return notes;
  }, [client.notesHistory, searchQuery, dateFilter, showPinnedOnly]);

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    const newNote: ClientNote = {
      id: crypto.randomUUID(),
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
      isPinned: false,
    };

    onAddNote(newNote);
    setNewNoteContent('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const pinnedCount = (client.notesHistory || []).filter(n => n.isPinned).length;
  const totalCount = (client.notesHistory || []).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notes History</h2>
              <p className="text-sm text-gray-500 mt-1">
                {client.name} - {client.company}
              </p>
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
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{totalCount} notes</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-amber-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>{pinnedCount} pinned</span>
            </div>
          </div>
        </div>

        {/* Add New Note */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add a new note..."
              rows={2}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Date Range & Pinned Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showPinnedOnly
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill={showPinnedOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>Pinned Only</span>
            </button>
            {(searchQuery || dateFilter.start || dateFilter.end || showPinnedOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter({ start: '', end: '' });
                  setShowPinnedOnly(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Notes Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">
                {totalCount === 0 
                  ? 'No notes yet. Add your first note above!'
                  : 'No notes match your filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note, index) => (
                <div
                  key={note.id}
                  className={`relative pl-8 ${index !== filteredNotes.length - 1 ? 'pb-4' : ''}`}
                >
                  {/* Timeline line */}
                  {index !== filteredNotes.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200"></div>
                  )}
                  
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ${
                    note.isPinned ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    {note.isPinned ? (
                      <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>

                  {/* Note Card */}
                  <div className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
                    note.isPinned ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200'
                  }`}>
                    {/* Note Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {getRelativeTime(note.createdAt)}
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onTogglePin(note.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            note.isPinned 
                              ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' 
                              : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={note.isPinned ? 'Unpin note' : 'Pin note'}
                        >
                          <svg className="w-4 h-4" fill={note.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete note"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>

                    {/* Pinned Badge */}
                    {note.isPinned && (
                      <div className="mt-3 flex items-center space-x-1 text-xs text-amber-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <span>Pinned</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredNotes.length} of {totalCount} notes
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
    </div>
  );
};

export default ClientNotesHistory;
