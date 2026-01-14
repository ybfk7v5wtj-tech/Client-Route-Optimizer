import React, { useState, useEffect } from 'react';
import { Meeting, Client } from '@/types';

interface MeetingModalProps {
  meeting?: Meeting | null;
  clients: Client[];
  selectedDate?: Date;
  onSave: (meeting: Meeting) => void;
  onDelete?: (meetingId: string) => void;
  onClose: () => void;
}

const MeetingModal: React.FC<MeetingModalProps> = ({
  meeting,
  clients,
  selectedDate,
  onSave,
  onDelete,
  onClose,
}) => {
  const [formData, setFormData] = useState<Partial<Meeting>>({
    title: '',
    clientId: '',
    date: selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    type: 'in-person',
    status: 'scheduled',
    priority: 'medium',
    notes: '',
    location: '',
    flexibleTime: false,
  });

  useEffect(() => {
    if (meeting) {
      setFormData(meeting);
    }
  }, [meeting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that a client is selected
    if (!formData.clientId) {
      alert('Please select a client for this meeting.');
      return;
    }
    
    const selectedClient = clients.find(c => c.id === formData.clientId);
    
    const newMeeting: Meeting = {
      id: meeting?.id || crypto.randomUUID(),
      title: formData.title || '',
      clientId: formData.clientId, // Already validated above
      date: formData.date || '',
      startTime: formData.flexibleTime ? '00:00' : (formData.startTime || ''),
      endTime: formData.flexibleTime ? '23:59' : (formData.endTime || ''),
      type: formData.type || 'in-person',
      status: formData.status || 'scheduled',
      priority: formData.priority || 'medium',
      notes: formData.notes || '',
      location: formData.type === 'in-person' && selectedClient 
        ? `${selectedClient.address}, ${selectedClient.city}` 
        : formData.location,
      travelTime: formData.type === 'in-person' ? Math.floor(Math.random() * 40) + 15 : undefined,
      flexibleTime: formData.flexibleTime || false,
    };

    onSave(newMeeting);
    onClose();
  };


  const handleChange = (field: keyof Meeting, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {meeting ? 'Edit Meeting' : 'Schedule Meeting'}
                </h2>
                <p className="text-sm text-gray-600">
                  {meeting ? 'Update meeting details' : 'Create a new meeting'}
                </p>
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
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Product Demo, Contract Review"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => handleChange('clientId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.company}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Flexible Time Toggle */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Flexible Time</p>
                    <p className="text-xs text-gray-600">Let route optimizer choose the best time</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('flexibleTime', !formData.flexibleTime)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.flexibleTime ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.flexibleTime ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {formData.flexibleTime && (
                <div className="mt-3 p-3 bg-white/60 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This meeting will be scheduled around fixed-time meetings to minimize travel time.
                  </p>
                </div>
              )}
            </div>

            {/* Time Selection - Only show if not flexible */}
            {!formData.flexibleTime && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!formData.flexibleTime}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!formData.flexibleTime}
                  />
                </div>
              </div>
            )}

            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'in-person', label: 'In-Person', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
                  { value: 'virtual', label: 'Virtual', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                  { value: 'phone', label: 'Phone', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('type', type.value)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center space-y-1 ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300 text-gray-500'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                    </svg>
                    <span className="text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="flex space-x-2">
                {[
                  { value: 'low', label: 'Low', color: 'gray' },
                  { value: 'medium', label: 'Medium', color: 'yellow' },
                  { value: 'high', label: 'High', color: 'red' },
                ].map(priority => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => handleChange('priority', priority.value)}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.priority === priority.value
                        ? priority.color === 'gray' ? 'border-gray-500 bg-gray-50 text-gray-700' :
                          priority.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' :
                          'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status (only for editing) */}
            {meeting && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add meeting notes or agenda..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {meeting && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(meeting.id);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete Meeting
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{meeting ? 'Update Meeting' : 'Schedule Meeting'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingModal;
