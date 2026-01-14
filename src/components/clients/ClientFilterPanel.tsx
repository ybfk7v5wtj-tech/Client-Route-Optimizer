import React, { useState, useMemo } from 'react';
import { Client, CustomField, SavedFilter, ClientFilters } from '@/types';

interface ClientFilterPanelProps {
  clients: Client[];
  customFields: CustomField[];
  savedFilters: SavedFilter[];
  activeFilters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  onSaveFilter: (name: string, filters: ClientFilters) => void;
  onDeleteFilter: (filterId: string) => void;
  onApplySavedFilter: (filter: SavedFilter) => void;
  onClose: () => void;
}

const emptyFilters: ClientFilters = {
  tags: [],
  cities: [],
  statuses: [],
  customFields: {},
};

const ClientFilterPanel: React.FC<ClientFilterPanelProps> = ({
  clients,
  customFields,
  savedFilters,
  activeFilters,
  onFiltersChange,
  onSaveFilter,
  onDeleteFilter,
  onApplySavedFilter,
  onClose,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tags: true,
    cities: true,
    status: true,
    customFields: true,
    saved: true,
  });

  // Extract unique values from clients
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    clients.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [clients]);

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    clients.forEach(c => {
      if (c.city) cities.add(c.city);
    });
    return Array.from(cities).sort();
  }, [clients]);

  // Client status based on activity
  const clientStatuses = [
    { value: 'active', label: 'Active', description: 'Met in last 30 days' },
    { value: 'inactive', label: 'Inactive', description: 'No meetings in 30+ days' },
    { value: 'new', label: 'New', description: 'Added in last 7 days' },
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTag = (tag: string) => {
    const newTags = activeFilters.tags.includes(tag)
      ? activeFilters.tags.filter(t => t !== tag)
      : [...activeFilters.tags, tag];
    onFiltersChange({ ...activeFilters, tags: newTags });
  };

  const toggleCity = (city: string) => {
    const newCities = activeFilters.cities.includes(city)
      ? activeFilters.cities.filter(c => c !== city)
      : [...activeFilters.cities, city];
    onFiltersChange({ ...activeFilters, cities: newCities });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = activeFilters.statuses.includes(status)
      ? activeFilters.statuses.filter(s => s !== status)
      : [...activeFilters.statuses, status];
    onFiltersChange({ ...activeFilters, statuses: newStatuses });
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    const newCustomFields = { ...activeFilters.customFields };
    if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete newCustomFields[fieldName];
    } else {
      newCustomFields[fieldName] = value;
    }
    onFiltersChange({ ...activeFilters, customFields: newCustomFields });
  };

  const clearAllFilters = () => {
    onFiltersChange(emptyFilters);
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter(filterName.trim(), activeFilters);
      setFilterName('');
      setShowSaveModal(false);
    }
  };

  const activeFilterCount = 
    activeFilters.tags.length + 
    activeFilters.cities.length + 
    activeFilters.statuses.length + 
    Object.keys(activeFilters.customFields).length;

  const tagColors: Record<string, string> = {
    'Enterprise': 'bg-purple-100 text-purple-700 border-purple-200',
    'Hot Lead': 'bg-red-100 text-red-700 border-red-200',
    'Qualified': 'bg-green-100 text-green-700 border-green-200',
    'Partner': 'bg-blue-100 text-blue-700 border-blue-200',
    'Technology': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Healthcare': 'bg-pink-100 text-pink-700 border-pink-200',
    'Finance': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Retail': 'bg-orange-100 text-orange-700 border-orange-200',
    'Manufacturing': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-lg font-bold text-white">Advanced Filters</h2>
            <p className="text-sm text-blue-100">
              {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : 'No filters applied'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
          <button
            onClick={clearAllFilters}
            disabled={activeFilterCount === 0}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear All</span>
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={activeFilterCount === 0}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>Save Filter</span>
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Saved Filters Section */}
          {savedFilters.length > 0 && (
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('saved')}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-semibold text-gray-900">Saved Filters</span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{savedFilters.length}</span>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.saved ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.saved && (
                <div className="px-6 pb-4 space-y-2">
                  {savedFilters.map(filter => (
                    <div
                      key={filter.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group"
                    >
                      <button
                        onClick={() => onApplySavedFilter(filter)}
                        className="flex-1 text-left"
                      >
                        <p className="font-medium text-gray-900">{filter.name}</p>
                        <p className="text-xs text-gray-500">
                          {filter.filters.tags.length > 0 && `${filter.filters.tags.length} tags`}
                          {filter.filters.cities.length > 0 && ` • ${filter.filters.cities.length} cities`}
                          {filter.filters.statuses.length > 0 && ` • ${filter.filters.statuses.length} statuses`}
                        </p>
                      </button>
                      <button
                        onClick={() => onDeleteFilter(filter.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tags Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('tags')}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="font-semibold text-gray-900">Tags</span>
                {activeFilters.tags.length > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{activeFilters.tags.length}</span>
                )}
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.tags ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.tags && (
              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => {
                    const isSelected = activeFilters.tags.includes(tag);
                    const colorClass = tagColors[tag] || 'bg-gray-100 text-gray-700 border-gray-200';
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                          isSelected
                            ? `${colorClass} ring-2 ring-offset-1 ring-blue-400`
                            : `${colorClass} opacity-60 hover:opacity-100`
                        }`}
                      >
                        {tag}
                        {isSelected && (
                          <svg className="inline-block w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cities Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('cities')}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold text-gray-900">City</span>
                {activeFilters.cities.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{activeFilters.cities.length}</span>
                )}
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.cities ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.cities && (
              <div className="px-6 pb-4">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {availableCities.map(city => {
                    const isSelected = activeFilters.cities.includes(city);
                    const clientCount = clients.filter(c => c.city === city).length;
                    return (
                      <button
                        key={city}
                        onClick={() => toggleCity(city)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium">{city}</span>
                        </div>
                        <span className="text-xs text-gray-500">{clientCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('status')}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-gray-900">Status</span>
                {activeFilters.statuses.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{activeFilters.statuses.length}</span>
                )}
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.status ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.status && (
              <div className="px-6 pb-4 space-y-2">
                {clientStatuses.map(status => {
                  const isSelected = activeFilters.statuses.includes(status.value);
                  return (
                    <button
                      key={status.value}
                      onClick={() => toggleStatus(status.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium">{status.label}</p>
                        <p className="text-xs text-gray-500">{status.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Fields Section */}
          {customFields.length > 0 && (
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('customFields')}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="font-semibold text-gray-900">Custom Fields</span>
                  {Object.keys(activeFilters.customFields).length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      {Object.keys(activeFilters.customFields).length}
                    </span>
                  )}
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.customFields ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.customFields && (
                <div className="px-6 pb-4 space-y-4">
                  {customFields.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.name}</label>
                      {field.type === 'dropdown' && field.options ? (
                        <select
                          value={activeFilters.customFields[field.name] || ''}
                          onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All</option>
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleCustomFieldChange(field.name, activeFilters.customFields[field.name] === true ? null : true)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              activeFilters.customFields[field.name] === true
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => handleCustomFieldChange(field.name, activeFilters.customFields[field.name] === false ? null : false)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              activeFilters.customFields[field.name] === false
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      ) : field.type === 'number' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={activeFilters.customFields[`${field.name}_min`] || ''}
                            onChange={(e) => handleCustomFieldChange(`${field.name}_min`, e.target.value ? Number(e.target.value) : null)}
                            className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={activeFilters.customFields[`${field.name}_max`] || ''}
                            onChange={(e) => handleCustomFieldChange(`${field.name}_max`, e.target.value ? Number(e.target.value) : null)}
                            className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder={`Filter by ${field.name}...`}
                          value={activeFilters.customFields[field.name] || ''}
                          onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Save Filter</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Enter filter name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientFilterPanel;
