import React, { useState, useMemo, useCallback } from 'react';
import { Meeting, Client } from '@/types';
import NavigationButton from '@/components/ui/NavigationButton';
import { getWazeUrl, getGoogleMapsMultiStopUrl, formatAddress, NavigationApp, NavigationLocation } from '@/lib/navigation';

interface RouteOptimizerProps {
  meetings: Meeting[];
  clients: Client[];
  selectedDate: Date;
  onOptimize?: (optimizedOrder: string[]) => void;
  onUpdateMeetingTimes?: (updates: { id: string; startTime: string; endTime: string }[]) => void;
}

interface OptimizedMeeting extends Meeting {
  optimizedStartTime?: string;
  optimizedEndTime?: string;
  isFlexible?: boolean;
}

const RouteOptimizer: React.FC<RouteOptimizerProps> = ({ 
  meetings, 
  clients, 
  selectedDate, 
  onOptimize,
  onUpdateMeetingTimes 
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedMeeting[]>([]);
  const [preferredNavApp, setPreferredNavApp] = useState<NavigationApp>('waze');
  const [showMapView, setShowMapView] = useState(false);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Get all meetings for the selected date (not just in-person for display purposes)
  const allDayMeetings = useMemo(() => {
    return meetings
      .filter(m => m.date === formatDate(selectedDate) && m.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [meetings, selectedDate]);

  // Get only in-person meetings for route optimization
  const dayMeetings = useMemo(() => {
    return meetings
      .filter(m => m.date === formatDate(selectedDate) && m.type === 'in-person' && m.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [meetings, selectedDate]);

  // Separate fixed and flexible meetings
  const { fixedMeetings, flexibleMeetings } = useMemo(() => {
    const fixed = dayMeetings.filter(m => !m.flexibleTime);
    const flexible = dayMeetings.filter(m => m.flexibleTime);
    return { fixedMeetings: fixed, flexibleMeetings: flexible };
  }, [dayMeetings]);

  const getClientById = (clientId: string) => clients.find(c => c.id === clientId);

  // Simple distance calculation (Haversine formula approximation)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Calculate travel time in minutes (assuming 30 mph average)
  const calculateTravelTime = useCallback((dist: number) => {
    return Math.round(dist / 30 * 60);
  }, []);

  // Parse time string to minutes from midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes from midnight to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Advanced route optimization considering fixed and flexible meetings
  const optimizeRoute = useCallback(() => {
    setIsOptimizing(true);
    
    setTimeout(() => {
      const meetingClients = dayMeetings.map(m => ({
        meeting: m,
        client: getClientById(m.clientId)
      })).filter(mc => mc.client);

      if (meetingClients.length <= 1) {
        const result = dayMeetings.map(m => ({
          ...m,
          isFlexible: m.flexibleTime
        }));
        setOptimizedRoute(result);
        setIsOptimizing(false);
        return;
      }

      // Separate fixed and flexible meetings with their clients
      const fixedWithClients = meetingClients.filter(mc => !mc.meeting.flexibleTime);
      const flexibleWithClients = meetingClients.filter(mc => mc.meeting.flexibleTime);

      // Sort fixed meetings by time
      fixedWithClients.sort((a, b) => a.meeting.startTime.localeCompare(b.meeting.startTime));

      // If no fixed meetings, optimize all flexible meetings by nearest neighbor
      if (fixedWithClients.length === 0) {
        const optimized = optimizeFlexibleOnly(flexibleWithClients);
        setOptimizedRoute(optimized);
        onOptimize?.(optimized.map(m => m.id));
        setIsOptimizing(false);
        return;
      }

      // Build optimized route by inserting flexible meetings between fixed ones
      const result: OptimizedMeeting[] = [];
      let currentTime = 8 * 60; // Start at 8 AM (480 minutes)
      let currentLocation: { lat: number; lon: number } | null = null;
      const remainingFlexible = [...flexibleWithClients];

      for (let i = 0; i < fixedWithClients.length; i++) {
        const fixedMeeting = fixedWithClients[i];
        const fixedStartMinutes = timeToMinutes(fixedMeeting.meeting.startTime);
        const fixedEndMinutes = timeToMinutes(fixedMeeting.meeting.endTime);

        // Find flexible meetings that can fit before this fixed meeting
        const availableTime = fixedStartMinutes - currentTime;
        
        if (availableTime > 30 && remainingFlexible.length > 0) { // At least 30 min buffer
          // Find the best flexible meeting to insert
          const insertions = findBestFlexibleInsertions(
            currentLocation,
            fixedMeeting.client!,
            remainingFlexible,
            currentTime,
            fixedStartMinutes - 15 // Leave 15 min buffer before fixed meeting
          );

          for (const insertion of insertions) {
            const idx = remainingFlexible.findIndex(f => f.meeting.id === insertion.meeting.id);
            if (idx !== -1) {
              remainingFlexible.splice(idx, 1);
              result.push({
                ...insertion.meeting,
                optimizedStartTime: minutesToTime(insertion.startTime),
                optimizedEndTime: minutesToTime(insertion.endTime),
                isFlexible: true
              });
              currentTime = insertion.endTime;
              currentLocation = { lat: insertion.client!.latitude, lon: insertion.client!.longitude };
            }
          }
        }

        // Add the fixed meeting
        result.push({
          ...fixedMeeting.meeting,
          isFlexible: false
        });
        currentTime = fixedEndMinutes;
        currentLocation = { lat: fixedMeeting.client!.latitude, lon: fixedMeeting.client!.longitude };
      }

      // Add remaining flexible meetings after the last fixed meeting
      if (remainingFlexible.length > 0) {
        const afterFixed = optimizeRemainingFlexible(
          currentLocation,
          remainingFlexible,
          currentTime
        );
        result.push(...afterFixed);
      }

      setOptimizedRoute(result);
      onOptimize?.(result.map(m => m.id));
      setIsOptimizing(false);
    }, 1000);
  }, [dayMeetings, getClientById, calculateDistance, calculateTravelTime, onOptimize]);

  // Optimize flexible meetings only (no fixed meetings)
  const optimizeFlexibleOnly = (flexibleWithClients: { meeting: Meeting; client: Client | undefined }[]): OptimizedMeeting[] => {
    if (flexibleWithClients.length === 0) return [];

    const result: OptimizedMeeting[] = [];
    const visited: string[] = [];
    const unvisited = [...flexibleWithClients];
    let currentTime = 8 * 60; // Start at 8 AM

    // Start with the first meeting
    let current = unvisited.shift()!;
    const meetingDuration = 60; // Assume 1 hour meetings

    result.push({
      ...current.meeting,
      optimizedStartTime: minutesToTime(currentTime),
      optimizedEndTime: minutesToTime(currentTime + meetingDuration),
      isFlexible: true
    });
    visited.push(current.meeting.id);
    currentTime += meetingDuration;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      unvisited.forEach((mc, idx) => {
        if (current.client && mc.client) {
          const dist = calculateDistance(
            current.client.latitude,
            current.client.longitude,
            mc.client.latitude,
            mc.client.longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = idx;
          }
        }
      });

      const travelTime = calculateTravelTime(nearestDist);
      currentTime += travelTime;

      current = unvisited[nearestIdx];
      result.push({
        ...current.meeting,
        optimizedStartTime: minutesToTime(currentTime),
        optimizedEndTime: minutesToTime(currentTime + meetingDuration),
        isFlexible: true
      });
      visited.push(current.meeting.id);
      currentTime += meetingDuration;
      unvisited.splice(nearestIdx, 1);
    }

    return result;
  };

  // Find best flexible meetings to insert between fixed meetings
  const findBestFlexibleInsertions = (
    currentLocation: { lat: number; lon: number } | null,
    nextFixedClient: Client,
    flexibleMeetings: { meeting: Meeting; client: Client | undefined }[],
    startTime: number,
    endTime: number
  ): { meeting: Meeting; client: Client; startTime: number; endTime: number }[] => {
    const insertions: { meeting: Meeting; client: Client; startTime: number; endTime: number }[] = [];
    const meetingDuration = 60; // 1 hour per meeting
    let currentTime = startTime;
    let currentLoc = currentLocation;

    const remaining = [...flexibleMeetings];

    while (remaining.length > 0 && currentTime + meetingDuration + 15 <= endTime) {
      let bestIdx = -1;
      let bestScore = Infinity;

      remaining.forEach((mc, idx) => {
        if (!mc.client) return;

        // Calculate distance from current location
        let distFromCurrent = 0;
        if (currentLoc) {
          distFromCurrent = calculateDistance(
            currentLoc.lat,
            currentLoc.lon,
            mc.client.latitude,
            mc.client.longitude
          );
        }

        // Calculate distance to next fixed meeting
        const distToNext = calculateDistance(
          mc.client.latitude,
          mc.client.longitude,
          nextFixedClient.latitude,
          nextFixedClient.longitude
        );

        // Score: prefer meetings that are close to current and don't add much to reach next
        const score = distFromCurrent + distToNext * 0.5;

        // Check if we have time
        const travelTime = calculateTravelTime(distFromCurrent);
        const travelToNext = calculateTravelTime(distToNext);
        const totalTime = currentTime + travelTime + meetingDuration + travelToNext;

        if (totalTime <= endTime && score < bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      });

      if (bestIdx === -1) break;

      const selected = remaining[bestIdx];
      const travelTime = currentLoc 
        ? calculateTravelTime(calculateDistance(
            currentLoc.lat, currentLoc.lon,
            selected.client!.latitude, selected.client!.longitude
          ))
        : 0;

      currentTime += travelTime;
      insertions.push({
        meeting: selected.meeting,
        client: selected.client!,
        startTime: currentTime,
        endTime: currentTime + meetingDuration
      });
      currentTime += meetingDuration;
      currentLoc = { lat: selected.client!.latitude, lon: selected.client!.longitude };
      remaining.splice(bestIdx, 1);
    }

    return insertions;
  };

  // Optimize remaining flexible meetings after all fixed meetings
  const optimizeRemainingFlexible = (
    currentLocation: { lat: number; lon: number } | null,
    flexibleMeetings: { meeting: Meeting; client: Client | undefined }[],
    startTime: number
  ): OptimizedMeeting[] => {
    const result: OptimizedMeeting[] = [];
    const meetingDuration = 60;
    let currentTime = startTime + 15; // 15 min buffer after last fixed meeting
    let currentLoc = currentLocation;
    const remaining = [...flexibleMeetings];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      remaining.forEach((mc, idx) => {
        if (currentLoc && mc.client) {
          const dist = calculateDistance(
            currentLoc.lat, currentLoc.lon,
            mc.client.latitude, mc.client.longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = idx;
          }
        } else if (!currentLoc && mc.client) {
          nearestDist = 0;
          nearestIdx = idx;
        }
      });

      const selected = remaining[nearestIdx];
      const travelTime = nearestDist > 0 ? calculateTravelTime(nearestDist) : 0;
      currentTime += travelTime;

      result.push({
        ...selected.meeting,
        optimizedStartTime: minutesToTime(currentTime),
        optimizedEndTime: minutesToTime(currentTime + meetingDuration),
        isFlexible: true
      });

      currentTime += meetingDuration;
      if (selected.client) {
        currentLoc = { lat: selected.client.latitude, lon: selected.client.longitude };
      }
      remaining.splice(nearestIdx, 1);
    }

    return result;
  };

  const totalDistance = useMemo(() => {
    const displayMeetings = optimizedRoute.length > 0 ? optimizedRoute : dayMeetings;
    if (displayMeetings.length < 2) return 0;
    
    let total = 0;
    for (let i = 0; i < displayMeetings.length - 1; i++) {
      const client1 = getClientById(displayMeetings[i].clientId);
      const client2 = getClientById(displayMeetings[i + 1].clientId);
      if (client1 && client2) {
        total += calculateDistance(client1.latitude, client1.longitude, client2.latitude, client2.longitude);
      }
    }
    return total;
  }, [optimizedRoute, dayMeetings, calculateDistance]);

  const totalTravelTime = useMemo(() => {
    return Math.round(totalDistance / 30 * 60);
  }, [totalDistance]);

  const displayMeetings = optimizedRoute.length > 0 ? optimizedRoute : dayMeetings;

  // Get all route locations for multi-stop navigation
  const getRouteLocations = (): NavigationLocation[] => {
    return displayMeetings.map(meeting => {
      const client = getClientById(meeting.clientId);
      if (client) {
        return {
          address: formatAddress(client.address, client.city, client.state, client.zipCode),
          latitude: client.latitude,
          longitude: client.longitude,
          name: client.company
        };
      }
      return {
        address: meeting.location || '',
        name: meeting.title
      };
    }).filter(loc => loc.address || (loc.latitude && loc.longitude));
  };

  // Open full route in navigation app
  const openFullRoute = (app: NavigationApp) => {
    const locations = getRouteLocations();
    if (locations.length === 0) return;

    if (app === 'google') {
      const url = getGoogleMapsMultiStopUrl(locations);
      window.open(url, '_blank');
    } else {
      const url = getWazeUrl(locations[0]);
      window.open(url, '_blank');
    }
  };

  // Get location for a specific meeting
  const getMeetingLocation = (meeting: Meeting): NavigationLocation | null => {
    const client = getClientById(meeting.clientId);
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

  // Print route
  const handlePrintRoute = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Route Plan - ${selectedDate.toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1a365d; }
          .stop { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
          .stop-number { display: inline-block; width: 30px; height: 30px; background: #3b82f6; color: white; border-radius: 50%; text-align: center; line-height: 30px; font-weight: bold; margin-right: 10px; }
          .stop-title { font-weight: bold; font-size: 16px; }
          .stop-details { color: #666; margin-top: 5px; }
          .summary { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .flexible { background: #fffbeb; border-color: #fbbf24; }
          .flexible .stop-number { background: #f59e0b; }
        </style>
      </head>
      <body>
        <h1>Route Plan</h1>
        <p>${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <div class="summary">
          <strong>Summary:</strong> ${displayMeetings.length} stops | ${totalDistance.toFixed(1)} miles | ~${totalTravelTime} min travel time
          <br><small>${flexibleMeetings.length} flexible time meeting${flexibleMeetings.length !== 1 ? 's' : ''} | ${fixedMeetings.length} fixed time meeting${fixedMeetings.length !== 1 ? 's' : ''}</small>
        </div>
        ${displayMeetings.map((meeting, idx) => {
          const client = getClientById(meeting.clientId);
          const isFlexible = 'isFlexible' in meeting ? meeting.isFlexible : meeting.flexibleTime;
          const displayTime = 'optimizedStartTime' in meeting && meeting.optimizedStartTime
            ? `${meeting.optimizedStartTime} - ${meeting.optimizedEndTime}`
            : `${meeting.startTime} - ${meeting.endTime}`;
          return `
            <div class="stop ${isFlexible ? 'flexible' : ''}">
              <span class="stop-number">${idx + 1}</span>
              <span class="stop-title">${meeting.title} ${isFlexible ? '(Flexible)' : ''}</span>
              <div class="stop-details">
                <div><strong>Time:</strong> ${displayTime}</div>
                ${client ? `<div><strong>Client:</strong> ${client.name} - ${client.company}</div>` : ''}
                ${meeting.location ? `<div><strong>Location:</strong> ${meeting.location}</div>` : ''}
                ${client ? `<div><strong>Address:</strong> ${formatAddress(client.address, client.city, client.state, client.zipCode)}</div>` : ''}
                ${meeting.notes ? `<div><strong>Notes:</strong> ${meeting.notes}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Apply optimized times to meetings
  const handleApplyOptimizedTimes = () => {
    const updates = optimizedRoute
      .filter(m => m.optimizedStartTime && m.optimizedEndTime)
      .map(m => ({
        id: m.id,
        startTime: m.optimizedStartTime!,
        endTime: m.optimizedEndTime!
      }));
    
    if (updates.length > 0 && onUpdateMeetingTimes) {
      onUpdateMeetingTimes(updates);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Route Optimizer
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMapView(!showMapView)}
              className={`p-2 rounded-lg transition-colors ${
                showMapView ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              title={showMapView ? 'Hide Map' : 'Show Map'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
            <button
              onClick={optimizeRoute}
              disabled={isOptimizing || dayMeetings.length < 2}
              className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all ${
                isOptimizing || dayMeetings.length < 2
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
              }`}
            >
              {isOptimizing ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Optimizing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Optimize Route</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Meeting Type Summary */}
      <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2 p-2 bg-white rounded-lg">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-gray-600">{fixedMeetings.length} Fixed Time</span>
        </div>
        <div className="flex items-center space-x-2 p-2 bg-white rounded-lg">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-sm text-gray-600">{flexibleMeetings.length} Flexible Time</span>
        </div>
      </div>

      {/* Stats */}
      {optimizedRoute.length > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 border-b border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{displayMeetings.length}</p>
            <p className="text-xs text-gray-500">Stops</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalDistance.toFixed(1)} mi</p>
            <p className="text-xs text-gray-500">Total Distance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalTravelTime} min</p>
            <p className="text-xs text-gray-500">Est. Travel Time</p>
          </div>
        </div>
      )}

      {/* Map View */}
      {showMapView && displayMeetings.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="h-64 bg-gradient-to-br from-blue-100 to-green-100 relative overflow-hidden">
            <div className="absolute inset-0 p-4">
              <div className="h-full w-full bg-white/80 rounded-lg shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                  {displayMeetings.length > 1 && (
                    <path
                      d={`M ${displayMeetings.map((_, idx) => {
                        const x = 40 + (idx * (320 / Math.max(displayMeetings.length - 1, 1)));
                        const y = 100 + Math.sin(idx * 0.8) * 40;
                        return `${x},${y}`;
                      }).join(' L ')}`}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-md"
                    />
                  )}
                  
                  {displayMeetings.length > 1 && displayMeetings.slice(0, -1).map((_, idx) => {
                    const x1 = 40 + (idx * (320 / Math.max(displayMeetings.length - 1, 1)));
                    const x2 = 40 + ((idx + 1) * (320 / Math.max(displayMeetings.length - 1, 1)));
                    const y1 = 100 + Math.sin(idx * 0.8) * 40;
                    const y2 = 100 + Math.sin((idx + 1) * 0.8) * 40;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                    
                    return (
                      <g key={`arrow-${idx}`} transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                        <polygon points="0,-4 8,0 0,4" fill="#3B82F6" />
                      </g>
                    );
                  })}
                  
                  {displayMeetings.map((meeting, idx) => {
                    const x = 40 + (idx * (320 / Math.max(displayMeetings.length - 1, 1)));
                    const y = 100 + Math.sin(idx * 0.8) * 40;
                    const client = getClientById(meeting.clientId);
                    const isFlexible = 'isFlexible' in meeting ? meeting.isFlexible : meeting.flexibleTime;
                    
                    return (
                      <g key={meeting.id}>
                        <circle cx={x} cy={y + 2} r="16" fill="rgba(0,0,0,0.2)" />
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="16" 
                          fill={
                            idx === 0 ? '#22C55E' : 
                            idx === displayMeetings.length - 1 ? '#EF4444' : 
                            isFlexible ? '#F59E0B' : '#3B82F6'
                          } 
                        />
                        <text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                          {idx + 1}
                        </text>
                        <text x={x} y={y - 22} textAnchor="middle" fill="#374151" fontSize="9" fontWeight="500">
                          {client?.company?.substring(0, 15) || meeting.title.substring(0, 15)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                
                <div className="absolute bottom-2 left-2 flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Start</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Fixed</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-gray-600">Flexible</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">End</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Summary - All meetings */}
      {allDayMeetings.length > dayMeetings.length && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center space-x-2 text-amber-700 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {allDayMeetings.length - dayMeetings.length} virtual/phone meeting{allDayMeetings.length - dayMeetings.length > 1 ? 's' : ''} not shown in route
            </span>
          </div>
        </div>
      )}

      {/* Route List */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          {optimizedRoute.length > 0 ? 'Optimized Route' : 'Scheduled In-Person Meetings'}
        </h4>
        
        {dayMeetings.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <p className="text-gray-500 text-sm">No in-person meetings scheduled</p>
            <p className="text-gray-400 text-xs mt-1">
              {allDayMeetings.length > 0 
                ? `${allDayMeetings.length} virtual/phone meeting${allDayMeetings.length > 1 ? 's' : ''} scheduled`
                : 'Schedule an in-person meeting to plan your route'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayMeetings.map((meeting, idx) => {
              const client = getClientById(meeting.clientId);
              const location = getMeetingLocation(meeting);
              const isFlexible = 'isFlexible' in meeting ? meeting.isFlexible : meeting.flexibleTime;
              const displayTime = 'optimizedStartTime' in meeting && meeting.optimizedStartTime
                ? `${meeting.optimizedStartTime} - ${meeting.optimizedEndTime}`
                : `${meeting.startTime} - ${meeting.endTime}`;
              
              return (
                <div 
                  key={meeting.id} 
                  className={`flex items-start space-x-3 group p-3 rounded-lg ${
                    isFlexible ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                    idx === 0 ? 'bg-green-500' : 
                    idx === displayMeetings.length - 1 ? 'bg-red-500' : 
                    isFlexible ? 'bg-amber-500' : 'bg-blue-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 truncate">{meeting.title}</p>
                        {isFlexible && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            Flexible
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {location && (
                          <NavigationButton 
                            location={location}
                            variant="compact"
                          />
                        )}
                        <span className={`text-sm ${isFlexible && 'optimizedStartTime' in meeting ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                          {displayTime}
                        </span>
                      </div>
                    </div>
                    {client && (
                      <p className="text-sm text-gray-600 truncate">{client.company}</p>
                    )}
                    {meeting.location && (
                      <p className="text-xs text-gray-400 truncate">{meeting.location}</p>
                    )}
                    {client && (
                      <p className="text-xs text-gray-400 truncate">
                        {formatAddress(client.address, client.city, client.state, client.zipCode)}
                      </p>
                    )}
                  </div>
                  {idx < displayMeetings.length - 1 && (
                    <div className="flex-shrink-0 text-xs text-gray-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      {meeting.travelTime || '~20'} min
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply Optimized Times Button */}
      {optimizedRoute.length > 0 && optimizedRoute.some(m => m.optimizedStartTime) && onUpdateMeetingTimes && (
        <div className="px-4 pb-4">
          <button
            onClick={handleApplyOptimizedTimes}
            className="w-full py-2 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Apply Optimized Times to Flexible Meetings</span>
          </button>
        </div>
      )}

      {/* Navigation Actions */}
      {dayMeetings.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col space-y-3">
            {/* Navigation App Selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Navigation App:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPreferredNavApp('waze')}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center space-x-1.5 transition-colors ${
                    preferredNavApp === 'waze' 
                      ? 'bg-[#33CCFF] text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M20.54 6.63c-.69-2.83-3.26-4.86-6.23-4.86-2.41 0-4.51 1.31-5.66 3.25-.32-.04-.64-.06-.97-.06-3.58 0-6.5 2.92-6.5 6.5 0 2.63 1.57 4.89 3.82 5.91-.02.2-.04.4-.04.6 0 2.76 2.24 5 5 5 1.77 0 3.33-.93 4.21-2.32.27.02.54.04.81.04 4.14 0 7.5-3.36 7.5-7.5 0-2.72-1.45-5.1-3.62-6.42l.68-.14zM9.5 14c-.83 0-1.5-.67-1.5-1.5S8.67 11 9.5 11s1.5.67 1.5 1.5S10.33 14 9.5 14zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5 3c-1.5 1.5-3.5 2-5 2s-3.5-.5-5-2h10z"/>
                  </svg>
                  <span>Waze</span>
                </button>
                <button
                  onClick={() => setPreferredNavApp('google')}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center space-x-1.5 transition-colors ${
                    preferredNavApp === 'google' 
                      ? 'bg-[#4285F4] text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  onClick={() => setPreferredNavApp('apple')}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center space-x-1.5 transition-colors ${
                    preferredNavApp === 'apple' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span>Apple</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button 
                onClick={handlePrintRoute}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Route</span>
              </button>
              
              <button 
                onClick={() => openFullRoute(preferredNavApp)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center space-x-2 shadow-md hover:shadow-lg ${
                  preferredNavApp === 'waze' ? 'bg-[#33CCFF] hover:bg-[#00BFFF]' :
                  preferredNavApp === 'google' ? 'bg-[#4285F4] hover:bg-[#3367D6]' :
                  'bg-gray-800 hover:bg-gray-900'
                }`}
              >
                {preferredNavApp === 'waze' && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M20.54 6.63c-.69-2.83-3.26-4.86-6.23-4.86-2.41 0-4.51 1.31-5.66 3.25-.32-.04-.64-.06-.97-.06-3.58 0-6.5 2.92-6.5 6.5 0 2.63 1.57 4.89 3.82 5.91-.02.2-.04.4-.04.6 0 2.76 2.24 5 5 5 1.77 0 3.33-.93 4.21-2.32.27.02.54.04.81.04 4.14 0 7.5-3.36 7.5-7.5 0-2.72-1.45-5.1-3.62-6.42l.68-.14zM9.5 14c-.83 0-1.5-.67-1.5-1.5S8.67 11 9.5 11s1.5.67 1.5 1.5S10.33 14 9.5 14zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5 3c-1.5 1.5-3.5 2-5 2s-3.5-.5-5-2h10z"/>
                  </svg>
                )}
                {preferredNavApp === 'google' && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                )}
                {preferredNavApp === 'apple' && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                )}
                <span>Start Navigation</span>
              </button>
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-500 text-center">
              {preferredNavApp === 'google' 
                ? 'Google Maps will show the full multi-stop route' 
                : `${preferredNavApp === 'waze' ? 'Waze' : 'Apple Maps'} will navigate to the first stop`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizer;
