// Navigation utilities for Waze and other map applications

export interface NavigationLocation {
  address?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
}

export type NavigationApp = 'waze' | 'google' | 'apple';

/**
 * Generate a Waze navigation URL
 * Waze supports both address-based and coordinate-based navigation
 */
export const getWazeUrl = (location: NavigationLocation): string => {
  const baseUrl = 'https://waze.com/ul';
  const params = new URLSearchParams();
  
  // Prefer coordinates for more accurate navigation
  if (location.latitude && location.longitude) {
    params.set('ll', `${location.latitude},${location.longitude}`);
  } else if (location.address) {
    params.set('q', location.address);
  }
  
  // Enable turn-by-turn navigation
  params.set('navigate', 'yes');
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Generate a Google Maps navigation URL
 */
export const getGoogleMapsUrl = (location: NavigationLocation): string => {
  const baseUrl = 'https://www.google.com/maps/dir/?api=1';
  const params = new URLSearchParams();
  
  if (location.latitude && location.longitude) {
    params.set('destination', `${location.latitude},${location.longitude}`);
  } else if (location.address) {
    params.set('destination', location.address);
  }
  
  params.set('travelmode', 'driving');
  
  return `${baseUrl}&${params.toString()}`;
};

/**
 * Generate an Apple Maps navigation URL
 */
export const getAppleMapsUrl = (location: NavigationLocation): string => {
  const baseUrl = 'https://maps.apple.com/';
  const params = new URLSearchParams();
  
  if (location.latitude && location.longitude) {
    params.set('daddr', `${location.latitude},${location.longitude}`);
  } else if (location.address) {
    params.set('daddr', location.address);
  }
  
  params.set('dirflg', 'd'); // driving directions
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Get navigation URL for the specified app
 */
export const getNavigationUrl = (location: NavigationLocation, app: NavigationApp = 'waze'): string => {
  switch (app) {
    case 'waze':
      return getWazeUrl(location);
    case 'google':
      return getGoogleMapsUrl(location);
    case 'apple':
      return getAppleMapsUrl(location);
    default:
      return getWazeUrl(location);
  }
};

/**
 * Open navigation in the specified app
 */
export const openNavigation = (location: NavigationLocation, app: NavigationApp = 'waze'): void => {
  const url = getNavigationUrl(location, app);
  window.open(url, '_blank');
};

/**
 * Generate a multi-stop route URL for Waze
 * Note: Waze doesn't support multi-stop routes directly via URL,
 * so this opens navigation to the first stop
 */
export const getWazeMultiStopUrl = (locations: NavigationLocation[]): string => {
  if (locations.length === 0) return '';
  return getWazeUrl(locations[0]);
};

/**
 * Generate a multi-stop route URL for Google Maps
 * Google Maps supports waypoints in the URL
 */
export const getGoogleMapsMultiStopUrl = (locations: NavigationLocation[]): string => {
  if (locations.length === 0) return '';
  
  const baseUrl = 'https://www.google.com/maps/dir/';
  
  const locationStrings = locations.map(loc => {
    if (loc.latitude && loc.longitude) {
      return `${loc.latitude},${loc.longitude}`;
    }
    return encodeURIComponent(loc.address || '');
  });
  
  return `${baseUrl}${locationStrings.join('/')}`;
};

/**
 * Format a full address from components
 */
export const formatAddress = (
  address: string,
  city: string,
  state: string,
  zipCode?: string
): string => {
  const parts = [address, city, state];
  if (zipCode) parts.push(zipCode);
  return parts.filter(Boolean).join(', ');
};
