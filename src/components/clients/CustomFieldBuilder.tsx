import React, { useState } from 'react';
import { CustomField } from '@/types';

interface CustomFieldBuilderProps {
  customFields: CustomField[];
  onAddField: (field: CustomField) => void;
  onRemoveField: (fieldId: string) => void;
  onUpdateField: (field: CustomField) => void;
  onClose: () => void;
}

const CustomFieldBuilder: React.FC<CustomFieldBuilderProps> = ({
  customFields,
  onAddField,
  onRemoveField,
  onUpdateField,
  onClose,
}) => {
  const [newField, setNewField] = useState<Partial<CustomField>>({
    name: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [optionInput, setOptionInput] = useState('');
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editOptionInput, setEditOptionInput] = useState('');

  const handleAddField = () => {
    if (!newField.name?.trim()) return;

    const field: CustomField = {
      id: crypto.randomUUID(),
      name: newField.name.trim(),
      type: newField.type || 'text',
      required: newField.required || false,
      options: newField.type === 'dropdown' ? newField.options : undefined,
    };


    onAddField(field);
    setNewField({ name: '', type: 'text', required: false, options: [] });
    setOptionInput('');
  };

  const handleAddOption = () => {
    if (!optionInput.trim()) return;
    setNewField(prev => ({
      ...prev,
      options: [...(prev.options || []), optionInput.trim()],
    }));
    setOptionInput('');
  };

  const handleRemoveOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index),
    }));
  };

  const handleStartEdit = (field: CustomField) => {
    setEditingField({ ...field });
    setEditOptionInput('');
  };

  const handleSaveEdit = () => {
    if (!editingField || !editingField.name.trim()) return;
    onUpdateField(editingField);
    setEditingField(null);
    setEditOptionInput('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditOptionInput('');
  };

  const handleEditAddOption = () => {
    if (!editOptionInput.trim() || !editingField) return;
    setEditingField({
      ...editingField,
      options: [...(editingField.options || []), editOptionInput.trim()],
    });
    setEditOptionInput('');
  };

  const handleEditRemoveOption = (index: number) => {
    if (!editingField) return;
    setEditingField({
      ...editingField,
      options: editingField.options?.filter((_, i) => i !== index),
    });
  };

  const fieldTypeIcons: Record<string, JSX.Element> = {
    text: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    number: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    date: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    dropdown: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    ),
    checkbox: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Custom Fields</h2>
                <p className="text-sm text-gray-600">Add and manage custom fields for client profiles</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Existing Fields */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Existing Custom Fields ({customFields.length})</h3>
            {customFields.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <p className="text-gray-500 text-sm">No custom fields yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customFields.map(field => (
                  <div key={field.id}>
                    {editingField?.id === field.id ? (
                      // Edit Mode
                      <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                        <div className="space-y-4">
                          {/* Field Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
                            <input
                              type="text"
                              value={editingField.name}
                              onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>

                          {/* Field Type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
                            <div className="grid grid-cols-5 gap-2">
                              {(['text', 'number', 'date', 'dropdown', 'checkbox'] as const).map(type => (
                                <button
                                  key={type}
                                  onClick={() => setEditingField({ 
                                    ...editingField, 
                                    type, 
                                    options: type === 'dropdown' ? (editingField.options || []) : undefined 
                                  })}
                                  className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center space-y-1 ${
                                    editingField.type === type
                                      ? 'border-purple-500 bg-purple-100 text-purple-600'
                                      : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                  }`}
                                >
                                  {fieldTypeIcons[type]}
                                  <span className="text-xs capitalize">{type}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Dropdown Options */}
                          {editingField.type === 'dropdown' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Dropdown Options</label>
                              <div className="flex space-x-2 mb-2">
                                <input
                                  type="text"
                                  value={editOptionInput}
                                  onChange={(e) => setEditOptionInput(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleEditAddOption()}
                                  placeholder="Add an option"
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                                <button
                                  onClick={handleEditAddOption}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                              {editingField.options && editingField.options.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editingField.options.map((option, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                                    >
                                      {option}
                                      <button
                                        onClick={() => handleEditRemoveOption(idx)}
                                        className="ml-2 text-purple-500 hover:text-purple-700"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Required Toggle */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">Required Field</p>
                              <p className="text-sm text-gray-500">Make this field mandatory</p>
                            </div>
                            <button
                              onClick={() => setEditingField({ ...editingField, required: !editingField.required })}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                editingField.required ? 'bg-purple-600' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                editingField.required ? 'left-7' : 'left-1'
                              }`} />
                            </button>
                          </div>

                          {/* Edit Actions */}
                          <div className="flex items-center justify-end space-x-2 pt-2">
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white rounded-lg text-gray-500">
                            {fieldTypeIcons[field.type]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{field.name}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span className="capitalize">{field.type}</span>
                              {field.required && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Required</span>
                              )}
                              {field.options && field.options.length > 0 && (
                                <span>{field.options.length} options</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleStartEdit(field)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit field"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onRemoveField(field.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete field"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Field */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Add New Field</h3>
            
            <div className="space-y-4">
              {/* Field Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
                <input
                  type="text"
                  value={newField.name}
                  onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Contract Value, Industry"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['text', 'number', 'date', 'dropdown', 'checkbox'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setNewField(prev => ({ ...prev, type, options: type === 'dropdown' ? [] : undefined }))}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center space-y-1 ${
                        newField.type === type
                          ? 'border-purple-500 bg-purple-50 text-purple-600'
                          : 'border-gray-200 hover:border-gray-300 text-gray-500'
                      }`}
                    >
                      {fieldTypeIcons[type]}
                      <span className="text-xs capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropdown Options */}
              {newField.type === 'dropdown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dropdown Options</label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                      placeholder="Add an option"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                      onClick={handleAddOption}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {newField.options && newField.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newField.options.map((option, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                        >
                          {option}
                          <button
                            onClick={() => handleRemoveOption(idx)}
                            className="ml-2 text-purple-500 hover:text-purple-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Required Field</p>
                  <p className="text-sm text-gray-500">Make this field mandatory for all clients</p>
                </div>
                <button
                  onClick={() => setNewField(prev => ({ ...prev, required: !prev.required }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    newField.required ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    newField.required ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleAddField}
            disabled={!newField.name?.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
              !newField.name?.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Field</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomFieldBuilder;
