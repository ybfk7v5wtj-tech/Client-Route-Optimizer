import React, { useState, useRef, useEffect } from 'react';
import { NavigationLocation, NavigationApp, openNavigation } from '@/lib/navigation';

interface NavigationButtonProps {
  location: NavigationLocation;
  variant?: 'icon' | 'button' | 'compact';
  className?: string;
  showLabel?: boolean;
  defaultApp?: NavigationApp;
}

const NavigationButton: React.FC<NavigationButtonProps> = ({
  location,
  variant = 'icon',
  className = '',
  showLabel = false,
  defaultApp = 'waze'
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (app: NavigationApp) => {
    openNavigation(location, app);
    setShowDropdown(false);
  };

  const WazeIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );

  const NavigationIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );

  const apps: { id: NavigationApp; name: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'waze',
      name: 'Waze',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20.54 6.63c-.69-2.83-3.26-4.86-6.23-4.86-2.41 0-4.51 1.31-5.66 3.25-.32-.04-.64-.06-.97-.06-3.58 0-6.5 2.92-6.5 6.5 0 2.63 1.57 4.89 3.82 5.91-.02.2-.04.4-.04.6 0 2.76 2.24 5 5 5 1.77 0 3.33-.93 4.21-2.32.27.02.54.04.81.04 4.14 0 7.5-3.36 7.5-7.5 0-2.72-1.45-5.1-3.62-6.42l.68-.14zM9.5 14c-.83 0-1.5-.67-1.5-1.5S8.67 11 9.5 11s1.5.67 1.5 1.5S10.33 14 9.5 14zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5 3c-1.5 1.5-3.5 2-5 2s-3.5-.5-5-2h10z"/>
        </svg>
      ),
      color: 'text-[#33CCFF] hover:bg-[#33CCFF]/10'
    },
    {
      id: 'google',
      name: 'Google Maps',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      ),
      color: 'text-[#4285F4] hover:bg-[#4285F4]/10'
    },
    {
      id: 'apple',
      name: 'Apple Maps',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      ),
      color: 'text-gray-700 hover:bg-gray-100'
    }
  ];

  if (variant === 'icon') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`p-2 text-[#33CCFF] hover:bg-[#33CCFF]/10 rounded-lg transition-colors ${className}`}
          title="Navigate with Waze"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M20.54 6.63c-.69-2.83-3.26-4.86-6.23-4.86-2.41 0-4.51 1.31-5.66 3.25-.32-.04-.64-.06-.97-.06-3.58 0-6.5 2.92-6.5 6.5 0 2.63 1.57 4.89 3.82 5.91-.02.2-.04.4-.04.6 0 2.76 2.24 5 5 5 1.77 0 3.33-.93 4.21-2.32.27.02.54.04.81.04 4.14 0 7.5-3.36 7.5-7.5 0-2.72-1.45-5.1-3.62-6.42l.68-.14zM9.5 14c-.83 0-1.5-.67-1.5-1.5S8.67 11 9.5 11s1.5.67 1.5 1.5S10.33 14 9.5 14zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5 3c-1.5 1.5-3.5 2-5 2s-3.5-.5-5-2h10z"/>
          </svg>
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
              Navigate with
            </div>
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleNavigate(app.id)}
                className={`w-full px-3 py-2 text-left flex items-center space-x-3 ${app.color} transition-colors`}
              >
                {app.icon}
                <span className="text-sm font-medium text-gray-700">{app.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={() => handleNavigate(defaultApp)}
        className={`p-1.5 text-[#33CCFF] hover:bg-[#33CCFF]/10 rounded-lg transition-colors ${className}`}
        title="Navigate with Waze"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M20.54 6.63c-.69-2.83-3.26-4.86-6.23-4.86-2.41 0-4.51 1.31-5.66 3.25-.32-.04-.64-.06-.97-.06-3.58 0-6.5 2.92-6.5 6.5 0 2.63 1.57 4.89 3.82 5.91-.02.2-.04.4-.04.6 0 2.76 2.24 5 5 5 1.77 0 3.33-.93 4.21-2.32.27.02.54.04.81.04 4.14 0 7.5-3.36 7.5-7.5 0-2.72-1.45-5.1-3.62-6.42l.68-.14zM9.5 14c-.83 0-1.5-.67-1.5-1.5S8.67 11 9.5 11s1.5.67 1.5 1.5S10.33 14 9.5 14zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5 3c-1.5 1.5-3.5 2-5 2s-3.5-.5-5-2h10z"/>
        </svg>
      </button>
    );
  }

  // Button variant
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`px-4 py-2 bg-[#33CCFF] text-white rounded-lg hover:bg-[#00BFFF] transition-colors flex items-center space-x-2 font-medium shadow-md hover:shadow-lg ${className}`}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20.54 6.63c-.69-2.83-3.26-4.86-6.23-4.86-2.41 0-4.51 1.31-5.66 3.25-.32-.04-.64-.06-.97-.06-3.58 0-6.5 2.92-6.5 6.5 0 2.63 1.57 4.89 3.82 5.91-.02.2-.04.4-.04.6 0 2.76 2.24 5 5 5 1.77 0 3.33-.93 4.21-2.32.27.02.54.04.81.04 4.14 0 7.5-3.36 7.5-7.5 0-2.72-1.45-5.1-3.62-6.42l.68-.14zM9.5 14c-.83 0-1.5-.67-1.5-1.5S8.67 11 9.5 11s1.5.67 1.5 1.5S10.33 14 9.5 14zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5 3c-1.5 1.5-3.5 2-5 2s-3.5-.5-5-2h10z"/>
        </svg>
        {showLabel && <span>Navigate</span>}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
            Navigate with
          </div>
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleNavigate(app.id)}
              className={`w-full px-3 py-2 text-left flex items-center space-x-3 ${app.color} transition-colors`}
            >
              {app.icon}
              <span className="text-sm font-medium text-gray-700">{app.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavigationButton;
