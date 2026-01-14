import React, { useState, useMemo } from 'react';
import { Meeting, Client } from '@/types';

interface MeetingExportProps {
  meetings: Meeting[];
  clients: Client[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'pdf';
type FilterType = 'all' | 'dateRange' | 'client';

const MeetingExport: React.FC<MeetingExportProps> = ({ meetings, clients, onClose }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Get client name helper
  const getClientName = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getClientCompany = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client?.company || '';
  };

  // Filter meetings based on selected criteria
  const filteredMeetings = useMemo(() => {
    let result = [...meetings];

    if (filterType === 'dateRange') {
      result = result.filter(m => {
        const meetingDate = m.date;
        return meetingDate >= startDate && meetingDate <= endDate;
      });
    } else if (filterType === 'client' && selectedClientId) {
      result = result.filter(m => m.clientId === selectedClientId);
    }

    // Sort by date and time
    result.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return result;
  }, [meetings, filterType, startDate, endDate, selectedClientId]);

  // Format time for display
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status display text
  const getStatusDisplay = (status: Meeting['status']): string => {
    const statusMap: Record<Meeting['status'], string> = {
      'scheduled': 'Scheduled',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'in-progress': 'In Progress'
    };
    return statusMap[status] || status;
  };

  // Get meeting type display text
  const getMeetingTypeDisplay = (type: Meeting['type']): string => {
    const typeMap: Record<Meeting['type'], string> = {
      'in-person': 'In Person',
      'virtual': 'Virtual',
      'phone': 'Phone'
    };
    return typeMap[type] || type;
  };

  // Download file helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      setExportError(null);
      setExportSuccess(false);

      if (filteredMeetings.length === 0) {
        setExportError('No meetings to export. Adjust your filters and try again.');
        return;
      }

      // Build headers
      const headers = ['Date', 'Time', 'End Time', 'Client Name', 'Company', 'Meeting Title', 'Meeting Type'];
      if (includeStatus) headers.push('Status');
      if (includeNotes) headers.push('Notes');

      // Build rows
      const rows = filteredMeetings.map(meeting => {
        const row = [
          formatDate(meeting.date),
          formatTime(meeting.startTime),
          formatTime(meeting.endTime),
          getClientName(meeting.clientId),
          getClientCompany(meeting.clientId),
          meeting.title,
          getMeetingTypeDisplay(meeting.type)
        ];
        if (includeStatus) row.push(getStatusDisplay(meeting.status));
        if (includeNotes) {
          // Escape notes for CSV
          const notes = meeting.notes || '';
          const escapedNotes = notes.includes(',') || notes.includes('\n') || notes.includes('"')
            ? `"${notes.replace(/"/g, '""')}"`
            : notes;
          row.push(escapedNotes);
        }
        return row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const BOM = '\uFEFF';
      
      const filename = filterType === 'client' && selectedClientId
        ? `meetings_${getClientName(selectedClientId).replace(/\s+/g, '_')}_export.csv`
        : filterType === 'dateRange'
        ? `meetings_${startDate}_to_${endDate}_export.csv`
        : 'meetings_export.csv';

      downloadFile(BOM + csv, filename, 'text/csv;charset=utf-8');
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('CSV export error:', err);
      setExportError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Export to PDF (opens printable view)
  const exportToPDF = () => {
    try {
      setExportError(null);
      setExportSuccess(false);

      if (filteredMeetings.length === 0) {
        setExportError('No meetings to export. Adjust your filters and try again.');
        return;
      }

      // Generate title based on filter
      let title = 'Meeting History Report';
      let subtitle = '';
      if (filterType === 'client' && selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        title = `Meeting History - ${client?.name || 'Unknown Client'}`;
        subtitle = client?.company || '';
      } else if (filterType === 'dateRange') {
        subtitle = `${formatDate(startDate)} - ${formatDate(endDate)}`;
      }

      // Generate HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 700;
              color: #1a365d;
              margin-bottom: 5px;
            }
            .header .subtitle {
              font-size: 14px;
              color: #6b7280;
            }
            .header .generated {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 10px;
            }
            .summary {
              display: flex;
              justify-content: center;
              gap: 40px;
              margin-bottom: 30px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item .value {
              font-size: 24px;
              font-weight: 700;
              color: #1a365d;
            }
            .summary-item .label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #1a365d;
              color: white;
              padding: 12px 10px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            td {
              padding: 12px 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }
            tr:nth-child(even) {
              background: #f9fafb;
            }
            .status {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
            }
            .status-completed { background: #d1fae5; color: #065f46; }
            .status-scheduled { background: #dbeafe; color: #1e40af; }
            .status-cancelled { background: #fee2e2; color: #991b1b; }
            .status-in-progress { background: #fef3c7; color: #92400e; }
            .type {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              background: #f3f4f6;
              color: #374151;
            }
            .notes-cell {
              max-width: 250px;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
            <div class="generated">Generated on ${new Date().toLocaleString()}</div>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="value">${filteredMeetings.length}</div>
              <div class="label">Total Meetings</div>
            </div>
            <div class="summary-item">
              <div class="value">${filteredMeetings.filter(m => m.status === 'completed').length}</div>
              <div class="label">Completed</div>
            </div>
            <div class="summary-item">
              <div class="value">${filteredMeetings.filter(m => m.status === 'scheduled').length}</div>
              <div class="label">Scheduled</div>
            </div>
            <div class="summary-item">
              <div class="value">${filteredMeetings.filter(m => m.status === 'cancelled').length}</div>
              <div class="label">Cancelled</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Client</th>
                <th>Meeting</th>
                <th>Type</th>
                ${includeStatus ? '<th>Status</th>' : ''}
                ${includeNotes ? '<th>Notes</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filteredMeetings.map(meeting => `
                <tr>
                  <td>${formatDate(meeting.date)}</td>
                  <td>${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}</td>
                  <td>
                    <strong>${getClientName(meeting.clientId)}</strong>
                    ${getClientCompany(meeting.clientId) ? `<br><span style="color: #6b7280; font-size: 12px;">${getClientCompany(meeting.clientId)}</span>` : ''}
                  </td>
                  <td>${meeting.title}</td>
                  <td><span class="type">${getMeetingTypeDisplay(meeting.type)}</span></td>
                  ${includeStatus ? `<td><span class="status status-${meeting.status}">${getStatusDisplay(meeting.status)}</span></td>` : ''}
                  ${includeNotes ? `<td class="notes-cell">${meeting.notes || '-'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>MeetingPro - Client Meeting Management</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      } else {
        setExportError('Unable to open print window. Please check your popup blocker settings.');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      setExportError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle export
  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Export Meetings</h2>
                <p className="text-sm text-gray-600">Export meeting history and notes</p>
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
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                exportFormat === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">CSV</p>
                    <p className="text-xs text-gray-500">Excel compatible</p>
                  </div>
                </div>
              </label>
              <label className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  checked={exportFormat === 'pdf'}
                  onChange={() => setExportFormat('pdf')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">PDF</p>
                    <p className="text-xs text-gray-500">Print-ready report</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Filter Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Filter Meetings</label>
            <div className="space-y-3">
              <label className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all ${
                filterType === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  checked={filterType === 'all'}
                  onChange={() => setFilterType('all')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="font-medium text-gray-900">All Meetings</p>
                  <p className="text-xs text-gray-500">Export all {meetings.length} meetings</p>
                </div>
              </label>

              <label className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all ${
                filterType === 'dateRange' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  checked={filterType === 'dateRange'}
                  onChange={() => setFilterType('dateRange')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Date Range</p>
                  <p className="text-xs text-gray-500">Export meetings within a specific period</p>
                </div>
              </label>

              {filterType === 'dateRange' && (
                <div className="ml-7 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <label className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all ${
                filterType === 'client' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  checked={filterType === 'client'}
                  onChange={() => setFilterType('client')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">By Client</p>
                  <p className="text-xs text-gray-500">Export meetings for a specific client</p>
                </div>
              </label>

              {filterType === 'client' && (
                <div className="ml-7 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select Client</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select a client --</option>
                    {clients.sort((a, b) => a.name.localeCompare(b.name)).map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.company ? `(${client.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Include in Export</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStatus}
                  onChange={(e) => setIncludeStatus(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Meeting Status</p>
                  <p className="text-xs text-gray-500">Scheduled, Completed, Cancelled, In Progress</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Meeting Notes</p>
                  <p className="text-xs text-gray-500">Include notes taken during meetings</p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className={`rounded-xl p-4 ${
            exportError ? 'bg-red-50' : exportSuccess ? 'bg-green-50' : 'bg-blue-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                exportError ? 'bg-red-100' : exportSuccess ? 'bg-green-100' : 'bg-blue-100'
              }`}>
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
                    <p className="text-sm text-green-700">
                      {exportFormat === 'csv' ? 'Your file has been downloaded.' : 'Print dialog opened.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-blue-900">Export Preview</p>
                    <p className="text-sm text-blue-700">
                      {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''} will be exported as {exportFormat.toUpperCase()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={filteredMeetings.length === 0 || (filterType === 'client' && !selectedClientId)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
              filteredMeetings.length === 0 || (filterType === 'client' && !selectedClientId)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export {filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? 's' : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingExport;
