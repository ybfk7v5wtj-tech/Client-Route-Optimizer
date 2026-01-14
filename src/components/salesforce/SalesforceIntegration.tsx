import React, { useState } from 'react';
import { SalesforceConfig, CustomField, Client } from '@/types';

interface SalesforceIntegrationProps {
  config: SalesforceConfig;
  customFields: CustomField[];
  clients?: Client[];
  onConfigUpdate: (config: SalesforceConfig) => void;
  onClose: () => void;
}

const SalesforceIntegration: React.FC<SalesforceIntegrationProps> = ({ 
  config, 
  customFields, 
  clients = [],
  onConfigUpdate, 
  onClose 
}) => {
  const [localConfig, setLocalConfig] = useState<SalesforceConfig>(config);
  const [activeTab, setActiveTab] = useState<'setup' | 'quicklinks' | 'export' | 'mapping'>('setup');
  const [instanceUrl, setInstanceUrl] = useState(config.instanceUrl || '');
  const [urlError, setUrlError] = useState('');
  const [exportFormat, setExportFormat] = useState<'contact' | 'lead' | 'account'>('contact');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const salesforceFields = [
    { key: 'Name', label: 'Name' },
    { key: 'Account.Name', label: 'Account Name' },
    { key: 'Email', label: 'Email' },
    { key: 'Phone', label: 'Phone' },
    { key: 'MailingStreet', label: 'Mailing Street' },
    { key: 'MailingCity', label: 'Mailing City' },
    { key: 'MailingState', label: 'Mailing State' },
    { key: 'MailingPostalCode', label: 'Mailing Postal Code' },
    { key: 'Description', label: 'Description' },
    { key: 'LeadSource', label: 'Lead Source' },
    { key: 'Industry', label: 'Industry' },
    { key: 'AnnualRevenue', label: 'Annual Revenue' },
  ];

  const localFields = [
    { key: 'name', label: 'Name' },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zipCode', label: 'Zip Code' },
    { key: 'notes', label: 'Notes' },
    ...customFields.map(cf => ({ key: cf.name, label: cf.name })),
  ];

  const validateAndFormatUrl = (url: string): string | null => {
    if (!url.trim()) {
      setUrlError('Please enter your Salesforce instance URL');
      return null;
    }
    
    try {
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      const parsedUrl = new URL(formattedUrl);
      
      if (!parsedUrl.hostname.includes('salesforce.com') && 
          !parsedUrl.hostname.includes('force.com') && 
          !parsedUrl.hostname.includes('lightning.force.com')) {
        setUrlError('URL should be a Salesforce domain (e.g., yourcompany.salesforce.com)');
        return null;
      }
      
      // Remove trailing slash
      formattedUrl = formattedUrl.replace(/\/$/, '');
      setUrlError('');
      return formattedUrl;
    } catch {
      setUrlError('Please enter a valid URL');
      return null;
    }
  };

  const handleSaveUrl = () => {
    const formattedUrl = validateAndFormatUrl(instanceUrl);
    if (formattedUrl) {
      setLocalConfig(prev => ({
        ...prev,
        connected: true,
        instanceUrl: formattedUrl,
      }));
      setInstanceUrl(formattedUrl);
    }
  };

  const handleClearUrl = () => {
    setLocalConfig(prev => ({
      ...prev,
      connected: false,
      instanceUrl: undefined,
    }));
    setInstanceUrl('');
  };

  // Generate Salesforce deep links
  const generateSalesforceLink = (path: string): string => {
    const baseUrl = localConfig.instanceUrl || 'https://login.salesforce.com';
    return `${baseUrl}${path}`;
  };

  const quickLinks = [
    {
      id: 'new-lead',
      label: 'Create New Lead',
      description: 'Open Salesforce to create a new Standard Lead',
      path: '/lightning/o/Lead/new?count=1&nooverride=1&useRecordTypeCheck=1&navigationLocation=LIST_VIEW&backgroundContext=%2Flightning%2Fpage%2Fhome&recordTypeId=0123m000000r6g4AAA',
      icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      color: 'bg-green-500',
    },

    {
      id: 'new-contact',
      label: 'Create New Contact',
      description: 'Open Salesforce to create a new contact record',
      path: '/lightning/o/Contact/new',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      color: 'bg-blue-500',
    },
    {
      id: 'new-account',
      label: 'Create New Account',
      description: 'Open Salesforce to create a new account/company',
      path: '/lightning/o/Account/new',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      color: 'bg-purple-500',
    },
    {
      id: 'new-opportunity',
      label: 'Create New Opportunity',
      description: 'Open Salesforce to create a new opportunity',
      path: '/lightning/o/Opportunity/new',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-yellow-500',
    },
    {
      id: 'new-task',
      label: 'Create New Task',
      description: 'Open Salesforce to create a new task',
      path: '/lightning/o/Task/new',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      color: 'bg-orange-500',
    },
    {
      id: 'new-event',
      label: 'Schedule Event',
      description: 'Open Salesforce to schedule a new event',
      path: '/lightning/o/Event/new',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'bg-indigo-500',
    },
    {
      id: 'leads-list',
      label: 'View All Leads',
      description: 'Open your Salesforce leads list view',
      path: '/lightning/o/Lead/list',
      icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
      color: 'bg-gray-500',
    },
    {
      id: 'contacts-list',
      label: 'View All Contacts',
      description: 'Open your Salesforce contacts list view',
      path: '/lightning/o/Contact/list',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'bg-gray-500',
    },
  ];

  const handleOpenLink = (path: string) => {
    const url = generateSalesforceLink(path);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (linkId: string, path: string) => {
    const url = generateSalesforceLink(path);
    navigator.clipboard.writeText(url);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Export clients to Salesforce-compatible CSV
  const handleExportCSV = () => {
    if (clients.length === 0) {
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];

    if (exportFormat === 'contact') {
      headers = ['FirstName', 'LastName', 'Email', 'Phone', 'MailingStreet', 'MailingCity', 'MailingState', 'MailingPostalCode', 'Description'];
      rows = clients.map(client => {
        const nameParts = client.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
        return [
          firstName,
          lastName,
          client.email,
          client.phone,
          client.address,
          client.city,
          client.state,
          client.zipCode,
          client.notes,
        ];
      });
    } else if (exportFormat === 'lead') {
      headers = ['FirstName', 'LastName', 'Company', 'Email', 'Phone', 'Street', 'City', 'State', 'PostalCode', 'Description', 'LeadSource'];
      rows = clients.map(client => {
        const nameParts = client.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
        return [
          firstName,
          lastName,
          client.company,
          client.email,
          client.phone,
          client.address,
          client.city,
          client.state,
          client.zipCode,
          client.notes,
          'Field Sales App',
        ];
      });
    } else if (exportFormat === 'account') {
      headers = ['Name', 'Phone', 'BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'Description'];
      rows = clients.map(client => [
        client.company || client.name,
        client.phone,
        client.address,
        client.city,
        client.state,
        client.zipCode,
        client.notes,
      ]);
    }

    // Create CSV content
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `salesforce_${exportFormat}_import_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const updateFieldMapping = (localField: string, sfField: string) => {
    setLocalConfig(prev => ({
      ...prev,
      fieldMappings: {
        ...prev.fieldMappings,
        [localField]: sfField,
      },
    }));
  };

  const handleSave = () => {
    onConfigUpdate(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Salesforce Integration</h2>
                <p className="text-blue-100 text-sm">Quick links & data export for Salesforce</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6 bg-blue-800/50 rounded-lg p-1">
            {[
              { key: 'setup', label: 'Setup', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
              { key: 'quicklinks', label: 'Quick Links', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
              { key: 'export', label: 'Export Data', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
              { key: 'mapping', label: 'Field Mapping', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[55vh]">
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">One-Way Salesforce Integration</h4>
                    <p className="text-sm text-blue-700">
                      This integration provides quick links to open Salesforce pages and export your data in Salesforce-compatible formats. 
                      No API credentials required - simply enter your Salesforce URL to enable deep linking.
                    </p>
                  </div>
                </div>
              </div>

              {/* Salesforce URL Configuration */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span>Salesforce Instance URL</span>
                </h3>

                {localConfig.connected && localConfig.instanceUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <div>
                          <p className="font-medium text-green-900">Connected</p>
                          <p className="text-sm text-green-700">{localConfig.instanceUrl}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleClearUrl}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Quick links will open in your Salesforce instance. You can change the URL anytime.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="sf-url" className="block text-sm font-medium text-gray-700 mb-2">
                        Enter your Salesforce URL
                      </label>
                      <div className="flex space-x-3">
                        <div className="flex-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                            </svg>
                          </div>
                          <input
                            id="sf-url"
                            type="text"
                            value={instanceUrl}
                            onChange={(e) => {
                              setInstanceUrl(e.target.value);
                              if (urlError) setUrlError('');
                            }}
                            placeholder="yourcompany.my.salesforce.com"
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              urlError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <button
                          onClick={handleSaveUrl}
                          disabled={!instanceUrl.trim()}
                          className={`px-5 py-3 text-sm font-medium rounded-lg transition-colors ${
                            instanceUrl.trim()
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Save
                        </button>
                      </div>
                      {urlError && (
                        <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{urlError}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Example: <code className="bg-gray-100 px-2 py-0.5 rounded">acme.my.salesforce.com</code> or <code className="bg-gray-100 px-2 py-0.5 rounded">acme.lightning.force.com</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Features Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="p-2 bg-green-100 rounded-lg w-fit mb-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Quick Links</h4>
                  <p className="text-sm text-gray-600">One-click access to create records in Salesforce</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="p-2 bg-blue-100 rounded-lg w-fit mb-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Data Export</h4>
                  <p className="text-sm text-gray-600">Export clients as Salesforce-ready CSV files</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="p-2 bg-purple-100 rounded-lg w-fit mb-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Field Mapping</h4>
                  <p className="text-sm text-gray-600">Map your fields to Salesforce fields for export</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quicklinks' && (
            <div className="space-y-6">
              {!localConfig.connected ? (
                <div className="text-center py-8">
                  <div className="p-4 bg-yellow-50 rounded-full w-fit mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Setup Required</h3>
                  <p className="text-gray-600 mb-4">Please configure your Salesforce URL in the Setup tab first.</p>
                  <button
                    onClick={() => setActiveTab('setup')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Setup
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Click any link below to open Salesforce in a new tab. Links will open at: <strong>{localConfig.instanceUrl}</strong>
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickLinks.map(link => (
                      <div
                        key={link.id}
                        className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 ${link.color} rounded-lg`}>
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{link.label}</h4>
                              <p className="text-sm text-gray-500">{link.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-4">
                          <button
                            onClick={() => handleOpenLink(link.path)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>Open</span>
                          </button>
                          <button
                            onClick={() => handleCopyLink(link.id, link.path)}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {copiedLink === link.id ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Export for Salesforce Data Loader</h4>
                    <p className="text-sm text-green-700">
                      Export your {clients.length} client{clients.length !== 1 ? 's' : ''} as a CSV file formatted for Salesforce Data Loader or Data Import Wizard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Export Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'contact', label: 'Contacts', desc: 'Individual people records', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { value: 'lead', label: 'Leads', desc: 'Potential customers/prospects', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
                    { value: 'account', label: 'Accounts', desc: 'Company/organization records', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                  ].map(format => (
                    <button
                      key={format.value}
                      onClick={() => setExportFormat(format.value as any)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        exportFormat === format.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <svg className={`w-5 h-5 ${exportFormat === format.value ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={format.icon} />
                        </svg>
                        <span className="font-medium text-gray-900">{format.label}</span>
                      </div>
                      <p className="text-sm text-gray-500">{format.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Preview */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Export Preview</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {exportFormat === 'contact' && (
                          <>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">FirstName</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">LastName</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Email</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Phone</th>
                          </>
                        )}
                        {exportFormat === 'lead' && (
                          <>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">FirstName</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">LastName</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Company</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Email</th>
                          </>
                        )}
                        {exportFormat === 'account' && (
                          <>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Name</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Phone</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">BillingCity</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">BillingState</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {clients.slice(0, 3).map((client, idx) => {
                        const nameParts = client.name.split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        return (
                          <tr key={idx} className="border-b border-gray-100">
                            {exportFormat === 'contact' && (
                              <>
                                <td className="py-2 px-3 text-gray-700">{firstName}</td>
                                <td className="py-2 px-3 text-gray-700">{lastName}</td>
                                <td className="py-2 px-3 text-gray-700">{client.email}</td>
                                <td className="py-2 px-3 text-gray-700">{client.phone}</td>
                              </>
                            )}
                            {exportFormat === 'lead' && (
                              <>
                                <td className="py-2 px-3 text-gray-700">{firstName}</td>
                                <td className="py-2 px-3 text-gray-700">{lastName}</td>
                                <td className="py-2 px-3 text-gray-700">{client.company}</td>
                                <td className="py-2 px-3 text-gray-700">{client.email}</td>
                              </>
                            )}
                            {exportFormat === 'account' && (
                              <>
                                <td className="py-2 px-3 text-gray-700">{client.company || client.name}</td>
                                <td className="py-2 px-3 text-gray-700">{client.phone}</td>
                                <td className="py-2 px-3 text-gray-700">{client.city}</td>
                                <td className="py-2 px-3 text-gray-700">{client.state}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {clients.length > 3 && (
                    <p className="text-sm text-gray-500 mt-2 px-3">...and {clients.length - 3} more records</p>
                  )}
                  {clients.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">No clients to export</p>
                  )}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {clients.length} record{clients.length !== 1 ? 's' : ''} will be exported
                </p>
                <button
                  onClick={handleExportCSV}
                  disabled={clients.length === 0}
                  className={`px-6 py-3 text-sm font-medium rounded-lg flex items-center space-x-2 transition-colors ${
                    clients.length > 0
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {exportSuccess ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download CSV</span>
                    </>
                  )}
                </button>
              </div>

              {/* Import Instructions */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>How to Import into Salesforce</span>
                </h4>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">1.</span>
                    <span>Download the CSV file using the button above</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">2.</span>
                    <span>In Salesforce, go to Setup → Data Import Wizard (or use Data Loader)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">3.</span>
                    <span>Select the object type ({exportFormat === 'contact' ? 'Contacts' : exportFormat === 'lead' ? 'Leads' : 'Accounts'})</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">4.</span>
                    <span>Upload your CSV file and map the fields</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">5.</span>
                    <span>Review and start the import</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Configure how your local client fields map to Salesforce fields. This mapping is used when exporting data.
              </p>
              
              <div className="space-y-3">
                {localFields.map(localField => (
                  <div key={localField.key} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-32">
                      <span className="text-sm font-medium text-gray-700">{localField.label}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <select
                      value={localConfig.fieldMappings[localField.key] || ''}
                      onChange={(e) => updateFieldMapping(localField.key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Not Mapped --</option>
                      {salesforceFields.map(sf => (
                        <option key={sf.key} value={sf.key}>{sf.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {localConfig.connected ? (
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Connected to {localConfig.instanceUrl}</span>
              </span>
            ) : (
              <span>Configure your Salesforce URL to enable quick links</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesforceIntegration;
