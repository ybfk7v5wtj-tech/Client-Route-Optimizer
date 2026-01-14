import React, { useState, useRef } from 'react';
import { Client, CustomField } from '@/types';

interface ExcelImportExportProps {
  clients: Client[];
  customFields: CustomField[];
  onImport: (clients: Partial<Client>[]) => void;
  onClose: () => void;
}

const ExcelImportExport: React.FC<ExcelImportExportProps> = ({ clients, customFields, onImport, onClose }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'guide'>('import');
  const [importData, setImportData] = useState<string>('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'name', 'company', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'notes'
  ]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const standardFields = [
    { key: 'name', label: 'Name', required: true },
    { key: 'company', label: 'Company', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'address', label: 'Address', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'state', label: 'State', required: false },
    { key: 'zipCode', label: 'Zip Code', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'tags', label: 'Tags', required: false },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportData(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return;

    // Handle CSV with quoted fields containing commas
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const data = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });

    setParsedData(data);

    // Auto-map fields
    const autoMappings: Record<string, string> = {};
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      standardFields.forEach(field => {
        const fieldKey = field.key.toLowerCase();
        const fieldLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerHeader.includes(fieldKey) || lowerHeader.includes(fieldLabel) || 
            lowerHeader === fieldKey || lowerHeader === fieldLabel) {
          autoMappings[header] = field.key;
        }
      });
      // Check for common variations
      if (lowerHeader.includes('zip') || lowerHeader.includes('postal')) {
        autoMappings[header] = 'zipCode';
      }
      if (lowerHeader.includes('street') || lowerHeader.includes('addr')) {
        autoMappings[header] = 'address';
      }
      if (lowerHeader.includes('account') && lowerHeader.includes('name')) {
        autoMappings[header] = 'company';
      }
    });
    setFieldMappings(autoMappings);
  };

  const handleImport = () => {
    const importedClients: Partial<Client>[] = parsedData.map(row => {
      const client: Partial<Client> = {
        id: crypto.randomUUID(),
        customFields: {},
        tags: [],
        totalMeetings: 0,
        createdAt: new Date().toISOString().split('T')[0],
        latitude: 37.7749 + (Math.random() - 0.5) * 0.5,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.5,
      };


      Object.entries(fieldMappings).forEach(([csvField, clientField]) => {
        if (row[csvField]) {
          if (clientField === 'tags') {
            client.tags = row[csvField].split(';').map((t: string) => t.trim()).filter((t: string) => t);
          } else if (standardFields.find(f => f.key === clientField)) {
            (client as any)[clientField] = row[csvField];
          } else {
            client.customFields![clientField] = row[csvField];
          }
        }
      });

      return client;
    });

    onImport(importedClients);
    onClose();
  };

  const handleExport = () => {
    try {
      setExportError(null);
      setExportSuccess(false);

      if (clients.length === 0) {
        setExportError('No clients to export. Add some clients first.');
        return;
      }

      if (exportFormat === 'csv') {
        const allFields = [...selectedFields, ...customFields.map(cf => cf.name)];
        
        // Create headers
        const headers = allFields.map(field => {
          // Find the label for standard fields
          const standardField = standardFields.find(f => f.key === field);
          return standardField ? standardField.label : field;
        }).join(',');
        
        // Create rows with proper escaping
        const rows = clients.map(client => {
          return allFields.map(field => {
            let value = '';
            
            if (field === 'tags') {
              value = (client.tags || []).join(';');
            } else if (standardFields.find(f => f.key === field)) {
              value = (client as any)[field] ?? '';
            } else {
              value = client.customFields?.[field] ?? '';
            }
            
            // Escape the value for CSV
            const stringValue = String(value);
            // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',');
        });
        
        const csv = [headers, ...rows].join('\n');
        
        // Add BOM for Excel compatibility with UTF-8
        const BOM = '\uFEFF';
        downloadFile(BOM + csv, 'clients_export.csv', 'text/csv;charset=utf-8');
      } else {
        // JSON export - clean up the data
        const cleanedClients = clients.map(client => ({
          name: client.name || '',
          company: client.company || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zipCode: client.zipCode || '',
          notes: client.notes || '',
          tags: client.tags || [],
          customFields: client.customFields || {},
        }));
        const json = JSON.stringify(cleanedClients, null, 2);
        downloadFile(json, 'clients_export.json', 'application/json');
      }
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setExportError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const downloadTemplate = () => {
    const headers = standardFields.map(f => f.label).join(',');
    const sampleRow = [
      'John Smith',
      'Acme Corporation',
      'john.smith@acme.com',
      '(555) 123-4567',
      '123 Main Street',
      'San Francisco',
      'CA',
      '94105',
      'Important client - prefers morning meetings',
      'VIP;Enterprise;West Coast'
    ].join(',');
    
    const template = `${headers}\n${sampleRow}`;
    const BOM = '\uFEFF';
    downloadFile(BOM + template, 'client_import_template.csv', 'text/csv;charset=utf-8');
  };

  const toggleFieldSelection = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Excel Import/Export</h2>
                <p className="text-sm text-gray-600">Manage your client data</p>
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

          {/* Tabs */}
          <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'import' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Import</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'export' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'guide' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Guide</span>
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'import' ? (
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-400">CSV files only (.csv)</p>
                </div>
              </div>

              {/* Download Template Button */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-700">Need a template? Download our sample CSV file to get started.</span>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Download Template
                </button>
              </div>

              {/* Field Mapping */}
              {parsedData.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Field Mapping</h3>
                  <p className="text-xs text-gray-500 mb-3">Map your CSV columns to client fields. Fields marked with * are required.</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto">
                    {Object.keys(parsedData[0]).map(csvField => (
                      <div key={csvField} className="flex items-center space-x-4">
                        <span className="w-40 text-sm text-gray-600 truncate font-medium">{csvField}</span>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <select
                          value={fieldMappings[csvField] || ''}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, [csvField]: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">-- Not Mapped --</option>
                          <optgroup label="Standard Fields">
                            {standardFields.map(field => (
                              <option key={field.key} value={field.key}>
                                {field.label}{field.required ? ' *' : ''}
                              </option>
                            ))}
                          </optgroup>
                          {customFields.length > 0 && (
                            <optgroup label="Custom Fields">
                              {customFields.map(field => (
                                <option key={field.id} value={field.name}>{field.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {parsedData.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Preview ({parsedData.length} records found)
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(parsedData[0]).slice(0, 5).map(key => (
                              <th key={key} className="px-4 py-2 text-left font-medium text-gray-600">{key}</th>
                            ))}
                            {Object.keys(parsedData[0]).length > 5 && (
                              <th className="px-4 py-2 text-left font-medium text-gray-400">+{Object.keys(parsedData[0]).length - 5} more</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.slice(0, 3).map((row, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              {Object.values(row).slice(0, 5).map((val, vIdx) => (
                                <td key={vIdx} className="px-4 py-2 text-gray-700 truncate max-w-[150px]">{val as string}</td>
                              ))}
                              {Object.keys(parsedData[0]).length > 5 && (
                                <td className="px-4 py-2 text-gray-400">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 3 && (
                      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                        ...and {parsedData.length - 3} more records
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'export' ? (
            <div className="space-y-6">
              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">CSV</span>
                      <p className="text-xs text-gray-500">Excel compatible</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">JSON</span>
                      <p className="text-xs text-gray-500">For developers</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Field Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Fields to Export</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {standardFields.map(field => (
                    <label key={field.key} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.key)}
                        onChange={() => toggleFieldSelection(field.key)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                  {customFields.map(field => (
                    <label key={field.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.name)}
                        onChange={() => toggleFieldSelection(field.name)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{field.name}</span>
                      <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Custom</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Summary */}
              <div className={`rounded-xl p-4 ${exportError ? 'bg-red-50' : exportSuccess ? 'bg-green-50' : 'bg-blue-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${exportError ? 'bg-red-100' : exportSuccess ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {exportError ? (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : exportSuccess ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    {exportError ? (
                      <>
                        <p className="font-medium text-red-900">Export Error</p>
                        <p className="text-sm text-red-700">{exportError}</p>
                      </>
                    ) : exportSuccess ? (
                      <>
                        <p className="font-medium text-green-900">Export Successful!</p>
                        <p className="text-sm text-green-700">Your file has been downloaded.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-blue-900">Export Summary</p>
                        <p className="text-sm text-blue-700">
                          {clients.length} clients with {selectedFields.length} fields will be exported as {exportFormat.toUpperCase()}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Guide Tab */
            <div className="space-y-6">
              {/* Import Guide */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-blue-50 border-b border-blue-100">
                  <h3 className="font-semibold text-blue-900 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Import Guide</span>
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">File Format Requirements</h4>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>File must be in CSV format (.csv extension)</li>
                      <li>First row must contain column headers</li>
                      <li>UTF-8 encoding is recommended for special characters</li>
                      <li>Fields containing commas should be wrapped in double quotes</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Supported Fields</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Field Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Example</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr><td className="px-3 py-2 font-medium">Name *</td><td className="px-3 py-2 text-gray-600">Client's full name</td><td className="px-3 py-2 text-gray-500">John Smith</td></tr>
                          <tr><td className="px-3 py-2 font-medium">Company</td><td className="px-3 py-2 text-gray-600">Company/Account name</td><td className="px-3 py-2 text-gray-500">Acme Corp</td></tr>
                          <tr><td className="px-3 py-2 font-medium">Email</td><td className="px-3 py-2 text-gray-600">Email address</td><td className="px-3 py-2 text-gray-500">john@acme.com</td></tr>
                          <tr><td className="px-3 py-2 font-medium">Phone</td><td className="px-3 py-2 text-gray-600">Phone number</td><td className="px-3 py-2 text-gray-500">(555) 123-4567</td></tr>
                          <tr><td className="px-3 py-2 font-medium">Address</td><td className="px-3 py-2 text-gray-600">Street address</td><td className="px-3 py-2 text-gray-500">123 Main St</td></tr>
                          <tr><td className="px-3 py-2 font-medium">City</td><td className="px-3 py-2 text-gray-600">City name</td><td className="px-3 py-2 text-gray-500">San Francisco</td></tr>
                          <tr><td className="px-3 py-2 font-medium">State</td><td className="px-3 py-2 text-gray-600">State abbreviation</td><td className="px-3 py-2 text-gray-500">CA</td></tr>
                          <tr><td className="px-3 py-2 font-medium">Zip Code</td><td className="px-3 py-2 text-gray-600">Postal code</td><td className="px-3 py-2 text-gray-500">94105</td></tr>
                          <tr><td className="px-3 py-2 font-medium">Notes</td><td className="px-3 py-2 text-gray-600">Additional notes</td><td className="px-3 py-2 text-gray-500">VIP client</td></tr>
                          <tr><td className="px-3 py-2 font-medium">Tags</td><td className="px-3 py-2 text-gray-600">Semicolon-separated tags</td><td className="px-3 py-2 text-gray-500">VIP;Enterprise</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">* Required field</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Sample CSV Content</h4>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <code className="text-sm text-green-400 whitespace-pre">
{`Name,Company,Email,Phone,Address,City,State,Zip Code,Notes,Tags
John Smith,Acme Corp,john@acme.com,(555) 123-4567,123 Main St,San Francisco,CA,94105,VIP client,VIP;Enterprise
Jane Doe,Tech Inc,jane@tech.com,(555) 987-6543,456 Oak Ave,Oakland,CA,94612,New lead,Prospect;Tech`}
                      </code>
                    </div>
                  </div>

                  <button
                    onClick={downloadTemplate}
                    className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Import Template</span>
                  </button>
                </div>
              </div>

              {/* Export Guide */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-green-50 border-b border-green-100">
                  <h3 className="font-semibold text-green-900 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Export Guide</span>
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Export Formats</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-1">CSV Format</h5>
                        <p className="text-sm text-gray-600">Best for opening in Excel, Google Sheets, or other spreadsheet applications. UTF-8 encoded with BOM for proper character display.</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-1">JSON Format</h5>
                        <p className="text-sm text-gray-600">Best for developers or importing into other applications. Includes all client data in a structured format.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tips</h4>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Select only the fields you need to keep the file size small</li>
                      <li>Custom fields are included in the export options</li>
                      <li>Tags are exported as semicolon-separated values</li>
                      <li>The exported file will download automatically</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Salesforce Export Tips */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-purple-50 border-b border-purple-100">
                  <h3 className="font-semibold text-purple-900 flex items-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    <span>Salesforce Integration Tips</span>
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-600">When exporting from Salesforce for import into this application:</p>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Export Accounts or Contacts as CSV from Salesforce Reports</li>
                    <li>Map "Account Name" to "Company" field</li>
                    <li>Map "Mailing Street" to "Address" field</li>
                    <li>Map "Mailing City", "Mailing State", "Mailing Postal Code" to respective fields</li>
                    <li>Custom fields from Salesforce can be mapped to custom fields here</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'import' ? (
            <button
              onClick={handleImport}
              disabled={parsedData.length === 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                parsedData.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import {parsedData.length} Clients</span>
            </button>
          ) : activeTab === 'export' ? (
            <button
              onClick={handleExport}
              disabled={clients.length === 0 || selectedFields.length === 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                clients.length === 0 || selectedFields.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export {clients.length} Clients</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('import')}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Importing
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImportExport;
