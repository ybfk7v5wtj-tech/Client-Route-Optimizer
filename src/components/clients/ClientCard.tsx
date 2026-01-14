import React from 'react';
import { Client } from '@/types';
import NavigationButton from '@/components/ui/NavigationButton';
import { formatAddress } from '@/lib/navigation';

interface ClientCardProps {
  client: Client;
  onSelect?: (client: Client) => void;
  onEdit?: (client: Client) => void;
  onScheduleMeeting?: (client: Client) => void;
  onViewHistory?: (client: Client) => void;
  onViewNotes?: (client: Client) => void;
  selected?: boolean;
  compact?: boolean;
}


const ClientCard: React.FC<ClientCardProps> = ({ 
  client, 
  onSelect, 
  onEdit, 
  onScheduleMeeting, 
  onViewHistory,
  onViewNotes,
  selected = false,
  compact = false 
}) => {

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const tagColors: Record<string, string> = {
    'Enterprise': 'bg-purple-100 text-purple-700',
    'Hot Lead': 'bg-red-100 text-red-700',
    'Qualified': 'bg-green-100 text-green-700',
    'Partner': 'bg-blue-100 text-blue-700',
    'Technology': 'bg-indigo-100 text-indigo-700',
    'Healthcare': 'bg-pink-100 text-pink-700',
    'Finance': 'bg-yellow-100 text-yellow-700',
    'Retail': 'bg-orange-100 text-orange-700',
    'Manufacturing': 'bg-gray-100 text-gray-700',
  };

  const navigationLocation = {
    address: formatAddress(client.address, client.city, client.state, client.zipCode),
    latitude: client.latitude,
    longitude: client.longitude,
    name: client.company
  };

  if (compact) {
    return (
      <div 
        className={`p-3 rounded-lg border cursor-pointer transition-all ${
          selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }`}
        onClick={() => onSelect?.(client)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{client.name}</p>
            <p className="text-sm text-gray-500 truncate">{client.company}</p>
          </div>
          <NavigationButton 
            location={navigationLocation}
            variant="compact"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 ${
      selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {getInitials(client.name)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{client.name}</h3>
              <p className="text-sm text-gray-600">{client.company}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <NavigationButton 
              location={navigationLocation}
              variant="icon"
            />
            {onViewNotes && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewNotes(client);
                }}
                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors relative"
                title="View Notes History"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {(client.notesHistory?.length || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                    {client.notesHistory.length}
                  </span>
                )}
              </button>
            )}
            {onViewHistory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewHistory(client);
                }}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="View Meeting History"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onEdit?.(client)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>

        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{client.email}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {client.phone}
          </div>
          <div className="flex items-center text-sm text-gray-600 group">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{client.city}, {client.state}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {client.tags.map((tag, index) => (
            <span 
              key={index}
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${tagColors[tag] || 'bg-gray-100 text-gray-700'}`}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory?.(client);
              }}
              className="hover:text-indigo-600 transition-colors"
            >
              <span className="font-medium text-gray-900">{client.totalMeetings}</span> meetings
            </button>
            {client.lastVisit && (
              <span className="ml-2">| Last: {new Date(client.lastVisit).toLocaleDateString()}</span>
            )}
          </div>
          <button
            onClick={() => onScheduleMeeting?.(client)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientCard;
