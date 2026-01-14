import React, { useState, useMemo } from 'react';
import { Meeting, Client, CalendarView as CalendarViewType } from '@/types';
import MeetingCard from '@/components/meetings/MeetingCard';

interface CalendarViewProps {
  meetings: Meeting[];
  clients: Client[];
  onMeetingEdit?: (meeting: Meeting) => void;
  onMeetingStatusChange?: (meetingId: string, status: Meeting['status']) => void;
  onCreateTask?: (meeting: Meeting) => void;
  onDateSelect?: (date: Date) => void;
  onExportMeetings?: () => void;
}



const CalendarView: React.FC<CalendarViewProps> = ({ 
  meetings, 
  clients, 
  onMeetingEdit, 
  onMeetingStatusChange,
  onCreateTask,
  onDateSelect,
  onExportMeetings
}) => {


  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>('week');

  const getClientById = (clientId: string) => clients.find(c => c.id === clientId);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay, year, month };
  };

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const getMeetingsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return meetings.filter(m => m.date === dateStr);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const isToday = (date: Date) => formatDate(date) === formatDate(new Date());
  const isSelected = (date: Date) => formatDate(date) === formatDate(currentDate);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderMonthView = () => {
    const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);
    const days = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border-b border-r border-gray-200" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayMeetings = getMeetingsForDate(date);
      
      days.push(
        <div 
          key={day}
          className={`h-24 border-b border-r border-gray-200 p-1 cursor-pointer hover:bg-blue-50 transition-colors ${
            isToday(date) ? 'bg-blue-50' : 'bg-white'
          }`}
          onClick={() => {
            setCurrentDate(date);
            setView('day');
            onDateSelect?.(date);
          }}
        >
          <div className={`text-sm font-medium mb-1 ${isToday(date) ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-0.5 overflow-hidden">
            {dayMeetings.slice(0, 2).map(meeting => (
              <div 
                key={meeting.id}
                className={`text-xs px-1 py-0.5 rounded truncate ${
                  meeting.status === 'completed' ? 'bg-green-100 text-green-700' :
                  meeting.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  meeting.priority === 'high' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}
              >
                {meeting.startTime} {meeting.title}
              </div>
            ))}
            {dayMeetings.length > 2 && (
              <div className="text-xs text-gray-500 px-1">+{dayMeetings.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7">
        {dayNames.map(day => (
          <div key={day} className="h-10 bg-gray-100 border-b border-r border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderWeekView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM
    
    return (
      <div className="flex flex-col">
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="w-16 bg-gray-50" />
          {weekDays.map((day, index) => (
            <div 
              key={index}
              className={`p-2 text-center border-l border-gray-200 cursor-pointer hover:bg-blue-50 ${
                isToday(day) ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
            >
              <div className="text-xs text-gray-500">{dayNames[day.getDay()]}</div>
              <div className={`text-lg font-semibold ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto max-h-[500px]">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="w-16 py-2 px-2 text-xs text-gray-500 text-right bg-gray-50">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
              </div>
              {weekDays.map((day, dayIndex) => {
                const dayMeetings = getMeetingsForDate(day).filter(m => {
                  const meetingHour = parseInt(m.startTime.split(':')[0]);
                  return meetingHour === hour;
                });
                
                return (
                  <div key={dayIndex} className="border-l border-gray-200 min-h-[60px] p-1">
                    {dayMeetings.map(meeting => (
                      <div
                        key={meeting.id}
                        className={`text-xs p-1.5 rounded mb-1 cursor-pointer hover:opacity-80 ${
                          meeting.status === 'completed' ? 'bg-green-100 text-green-700' :
                          meeting.status === 'cancelled' ? 'bg-red-100 text-red-700 line-through' :
                          meeting.priority === 'high' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                        onClick={() => onMeetingEdit?.(meeting)}
                      >
                        <div className="font-medium truncate">{meeting.title}</div>
                        <div className="text-xs opacity-75">{meeting.startTime} - {meeting.endTime}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayMeetings = getMeetingsForDate(currentDate);
    
    return (
      <div className="p-4">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {dayNames[currentDate.getDay()]}, {monthNames[currentDate.getMonth()]} {currentDate.getDate()}
          </h3>
          <p className="text-gray-500">{dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        
        {dayMeetings.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">No meetings scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayMeetings
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  client={getClientById(meeting.clientId)}
                  onEdit={onMeetingEdit}
                  onStatusChange={onMeetingStatusChange}
                  onCreateTask={onCreateTask}
                />

              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-gray-200 bg-gray-50 gap-3">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
        </div>
        
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {onExportMeetings && (
            <button
              onClick={onExportMeetings}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
          )}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as CalendarViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendar Body */}
      <div className="overflow-hidden">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>
    </div>
  );
};

export default CalendarView;
