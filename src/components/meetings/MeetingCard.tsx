import React from 'react';
import { Meeting, Client } from '@/types';
import NavigationButton from '@/components/ui/NavigationButton';
import { formatAddress } from '@/lib/navigation';

interface MeetingCardProps {
  meeting: Meeting;
  client?: Client;
  onEdit?: (meeting: Meeting) => void;
  onStatusChange?: (meetingId: string, status: Meeting['status']) => void;
  onCreateTask?: (meeting: Meeting) => void;
  compact?: boolean;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, client, onEdit, onStatusChange, onCreateTask, compact = false }) => {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    'in-progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const priorityColors = {
    low: 'border-l-gray-400',
    medium: 'border-l-yellow-500',
    high: 'border-l-red-500',
  };

  const typeIcons = {
    'in-person': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    virtual: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    phone: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  };

  // Get navigation location - prefer client coordinates if available, otherwise use meeting location
  const getNavigationLocation = () => {
    if (client) {
      return {
        address: formatAddress(client.address, client.city, client.state, client.zipCode),
        latitude: client.latitude,
        longitude: client.longitude,
        name: client.company
      };
    }
    if (meeting.location) {
      return {
        address: meeting.location,
        name: meeting.title
      };
    }
    return null;
  };

  const navigationLocation = getNavigationLocation();
  const showNavigation = meeting.type === 'in-person' && navigationLocation && meeting.status !== 'completed' && meeting.status !== 'cancelled';

  if (compact) {
    return (
      <div 
        className={`p-3 bg-white rounded-lg border border-l-4 ${priorityColors[meeting.priority]} hover:shadow-md transition-all cursor-pointer`}
        onClick={() => onEdit?.(meeting)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-900 truncate">{meeting.title}</span>
          <div className="flex items-center space-x-2">
            {showNavigation && navigationLocation && (
              <NavigationButton 
                location={navigationLocation}
                variant="compact"
              />
            )}
            <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[meeting.status]}`}>
              {meeting.status}
            </span>
          </div>
        </div>
        <div className="flex items-center text-xs text-gray-500 space-x-2">
          <span>{meeting.startTime} - {meeting.endTime}</span>
          {client && <span className="truncate">| {client.company}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-l-4 ${priorityColors[meeting.priority]} shadow-sm hover:shadow-lg transition-all duration-300`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{meeting.title}</h3>
            {client && (
              <p className="text-sm text-gray-600">{client.name} - {client.company}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {showNavigation && navigationLocation && (
              <NavigationButton 
                location={navigationLocation}
                variant="icon"
              />
            )}
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[meeting.status]}`}>
              {meeting.status}
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {meeting.startTime} - {meeting.endTime}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            {typeIcons[meeting.type]}
            <span className="ml-2 capitalize">{meeting.type}</span>
            {meeting.travelTime && meeting.type === 'in-person' && (
              <span className="ml-2 text-gray-400">| {meeting.travelTime} min travel</span>
            )}
          </div>
          {meeting.location && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="truncate">{meeting.location}</span>
            </div>
          )}
        </div>

        {meeting.notes && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{meeting.notes}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-md ${
              meeting.priority === 'high' ? 'bg-red-50 text-red-600' :
              meeting.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
              'bg-gray-50 text-gray-600'
            }`}>
              {meeting.priority} priority
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {meeting.status === 'scheduled' && (
              <>
                <button
                  onClick={() => onStatusChange?.(meeting.id, 'in-progress')}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Start
                </button>
                <button
                  onClick={() => onStatusChange?.(meeting.id, 'completed')}
                  className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Complete
                </button>
              </>
            )}
            {meeting.status === 'in-progress' && (
              <button
                onClick={() => onStatusChange?.(meeting.id, 'completed')}
                className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                Complete
              </button>
            )}
            {/* Create Task Button */}
            {onCreateTask && (
              <button
                onClick={() => onCreateTask(meeting)}
                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Create task from meeting"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onEdit?.(meeting)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
