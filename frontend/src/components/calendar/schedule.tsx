'use client';

import React, { useState } from 'react';

import { Calendar, momentLocalizer, ViewStatic } from 'react-big-calendar';

import { groupEventsByRange, inCurrentMonth, sortGroupedEvents } from './../../utils/calendar';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../services/strapi';

import moment from 'moment';

import 'moment/locale/pl';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import './assets/style.scss';
import WeekSimple from '../../ui/schedule/week-simple';
import MonthDateHeader from '../../ui/schedule/month-date-header';
import MonthPanel from '../../ui/schedule/month-panel';
import Sidebar from '../sidebar';

moment.locale('pl');

const localizer = momentLocalizer(moment);

const BLOCKED_MARKER = '[[BLOCKED_TERM]]';
const RESERVATION_MARKER = '[[RESERVATION]]';

const defaultEvents = [
  {
    title: 'EXPO Warszawa',
    start: '2025-10-26',
    end: '2026-05-02',
    color: '#f87171',
    description: '',
  },
  {
    title: 'EXPO Łódź',
    start: '2026-05-01',
    end: '2026-05-07',
    color: '#60a5fa',
    description: '',
  },
];

const isBlockedEvent = (event: any) => {
  const description = String(event?.description || '');
  const title = String(event?.title || '');

  return (
    description.includes(BLOCKED_MARKER) ||
    title.toLowerCase().includes('zablokowany termin')
  );
};

const isReservationEvent = (event: any) => {
  const description = String(event?.description || '');

  return description.includes(RESERVATION_MARKER);
};

const cleanDescription = (description?: string) => {
  return String(description || '')
    .replace(BLOCKED_MARKER, '')
    .replace(RESERVATION_MARKER, '')
    .trim();
};

const toInputDate = (value?: string) => {
  if (!value) return '';

  const date = moment(value);

  if (!date.isValid()) return '';

  return date.format('YYYY-MM-DD');
};

const toStartIso = (dateValue: string) => {
  return moment(dateValue, 'YYYY-MM-DD').startOf('day').toISOString();
};

const toEndIso = (dateValue: string) => {
  return moment(dateValue, 'YYYY-MM-DD').endOf('day').toISOString();
};

const formatDisplayDate = (value?: string) => {
  if (!value) return '';

  const date = moment(value);

  if (!date.isValid()) return String(value);

  return date.format('DD.MM.YYYY');
};

const rangesOverlap = (
  startA?: string,
  endA?: string,
  startB?: string,
  endB?: string
) => {
  if (!startA || !startB) return false;

  const aStart = moment(startA).startOf('day').valueOf();
  const aEnd = moment(endA || startA).endOf('day').valueOf();

  const bStart = moment(startB).startOf('day').valueOf();
  const bEnd = moment(endB || startB).endOf('day').valueOf();

  return aStart <= bEnd && bStart <= aEnd;
};

const normalizeEventFromStrapi = (record: any) => {
  const attrs = record?.attributes || record || {};

  return {
    id: record?.id || record?._id || attrs.id || undefined,
    documentId: record?.documentId || attrs.documentId || undefined,
    title: attrs.title || attrs.name || 'Wydarzenie',
    start: attrs.start || attrs.dateStart || '',
    end: attrs.end || attrs.dateEnd || attrs.start || attrs.dateStart || '',
    color: attrs.color || '#60a5fa',
    description: attrs.description || '',
  };
};

export const Schedule = () => {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>(defaultEvents);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);

  const [topForm, setTopForm] = useState<any>({
    mode: 'event',
    title: '',
    start: '',
    end: '',
    color: '#60a5fa',
    description: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  React.useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoadingEvents(true);

    try {
      const res = await getEvents();

      const out =
        res && res.data
          ? res.data.map(normalizeEventFromStrapi)
          : Array.isArray(res)
            ? res.map(normalizeEventFromStrapi)
            : [];

      if (out && out.length) {
        setEvents(out);
      }
    } catch (e) {
      console.error('Błąd pobierania wydarzeń:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  const monthLabel = moment(date).format('MMMM YYYY');

  const monthEvents = events
    .filter((ev: any) => inCurrentMonth(ev, date))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  const groupedByRange = groupEventsByRange(monthEvents, date);

  const groupOrder = sortGroupedEvents(groupedByRange, date);

  const eventStyleGetter = (event: any) => {
    const blocked = isBlockedEvent(event);
    const reservation = isReservationEvent(event);

    return {
      style: {
        backgroundColor: blocked
          ? '#111827'
          : reservation
            ? '#16a34a'
            : event.color || '#2563eb',
        borderRadius: '6px',
        opacity: blocked ? 0.75 : 0.9,
        color: 'white',
        border: blocked ? '1px dashed #f8fafc' : 'none',
        display: 'block',
        fontWeight: 500,
      },
    };
  };

  const getBlockingConflict = (
    startIso?: string,
    endIso?: string,
    ignoreId?: string | null
  ) => {
    return events.find((event: any) => {
      const eventId = event.id || event.documentId;

      if (ignoreId && String(eventId) === String(ignoreId)) {
        return false;
      }

      if (!isBlockedEvent(event)) {
        return false;
      }

      return rangesOverlap(startIso, endIso, event.start, event.end);
    });
  };

  const openCreateEventModal = () => {
    setTopForm({
      mode: 'event',
      title: '',
      start: '',
      end: '',
      color: '#60a5fa',
      description: '',
    });

    setEditingId(null);
    setShowCreateModal(true);
    setShowEditModal(false);
  };

  const openBlockTermModal = () => {
    setTopForm({
      mode: 'blocked',
      title: 'Zablokowany termin',
      start: '',
      end: '',
      color: '#111827',
      description: '',
    });

    setEditingId(null);
    setShowCreateModal(true);
    setShowEditModal(false);
  };

  const handleCreateOrUpdate = async () => {
    try {
      const isBlocked = topForm.mode === 'blocked';

      if (!topForm.start) {
        alert('Proszę podać datę rozpoczęcia.');
        return false;
      }

      if (!isBlocked && !topForm.title) {
        alert('Proszę podać tytuł wydarzenia.');
        return false;
      }

      const startMoment = moment(topForm.start, 'YYYY-MM-DD');
      const endMoment = moment(topForm.end || topForm.start, 'YYYY-MM-DD');

      if (!startMoment.isValid()) {
        alert('Data rozpoczęcia jest niepoprawna.');
        return false;
      }

      if (!endMoment.isValid()) {
        alert('Data zakończenia jest niepoprawna.');
        return false;
      }

      if (endMoment.isBefore(startMoment, 'day')) {
        alert('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.');
        return false;
      }

      const startIso = toStartIso(topForm.start);
      const endIso = toEndIso(topForm.end || topForm.start);

      if (!isBlocked) {
        const conflict = getBlockingConflict(startIso, endIso, editingId);

        if (conflict) {
          alert(
            `Nie można dodać wydarzenia w tym terminie, ponieważ zakres nachodzi na blokadę: ${conflict.title} (${formatDisplayDate(conflict.start)} – ${formatDisplayDate(conflict.end)})`
          );

          return false;
        }
      }

      const payload = {
        title: isBlocked ? topForm.title || 'Zablokowany termin' : topForm.title,
        start: startIso,
        end: endIso,
        color: isBlocked ? '#111827' : topForm.color,
        description: isBlocked
          ? `${BLOCKED_MARKER}\n${topForm.description || ''}`.trim()
          : topForm.description || '',
      };

      if (editingId) {
        await updateEvent(editingId, payload);

        setEvents((prev) =>
          prev.map((event) =>
            String(event.id || event.documentId) === String(editingId)
              ? { ...event, ...payload }
              : event
          )
        );

        setEditingId(null);
      } else {
        const res = await createEvent(payload);

        const created =
          res && res.data
            ? res.data.attributes
              ? { id: res.data.id || res.data._id, ...res.data.attributes }
              : res.data
            : res;

        const event = normalizeEventFromStrapi({
          id: created?.id || created?._id,
          ...created,
          ...payload,
        });

        setEvents((prev) => [event, ...prev]);
      }

      setTopForm({
        mode: 'event',
        title: '',
        start: '',
        end: '',
        color: '#60a5fa',
        description: '',
      });

      return true;
    } catch (e: any) {
      console.error('Event create/update failed', e);

      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        (e?.details ? JSON.stringify(e.details) : 'Błąd zapisu wydarzenia');

      alert('Błąd zapisu wydarzenia: ' + msg);

      return false;
    }
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to wydarzenie?')) return;

    try {
      if (id) {
        await deleteEvent(String(id));
      }

      setEvents((prev) => prev.filter((event) => String(event.id || event.documentId) !== String(id)));
    } catch (e) {
      console.error('Delete failed', e);
      alert('Błąd usuwania wydarzenia');
    }
  };

  const startEdit = (event: any) => {
    const blocked = isBlockedEvent(event);

    setEditingId(event.id || event.documentId || null);

    setTopForm({
      mode: blocked ? 'blocked' : 'event',
      title: event.title || '',
      start: toInputDate(event.start),
      end: toInputDate(event.end || event.start),
      color: blocked ? '#111827' : event.color || '#60a5fa',
      description: cleanDescription(event.description || ''),
    });
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="rbc-wrapper">
        <div className="calendar-top">
          <div className="calendar-top-buttons">
            <button className="btn btn-primary" onClick={openCreateEventModal}>
              Dodaj nowe wydarzenie
            </button>

            <button className="btn btn-secondary" onClick={openBlockTermModal}>
              Zablokuj termin
            </button>

            <button
              className="btn"
              onClick={() => {
                setShowEditModal(true);
                setShowCreateModal(false);
              }}
            >
              Edytuj wydarzenia
            </button>
          </div>
        </div>

        {showCreateModal && (
          <div
            className="modal-overlay"
            onClick={() => {
              setShowCreateModal(false);
              setEditingId(null);
            }}
          >
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>
                  {editingId
                    ? topForm.mode === 'blocked'
                      ? 'Edytuj blokadę terminu'
                      : 'Edytuj wydarzenie'
                    : topForm.mode === 'blocked'
                      ? 'Zablokuj termin'
                      : 'Dodaj nowe wydarzenie'}
                </h3>

                <button
                  className="modal-close"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                  }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <label>
                  {topForm.mode === 'blocked'
                    ? 'Nazwa blokady'
                    : 'Tytuł wydarzenia'}
                </label>

                <input
                  placeholder={
                    topForm.mode === 'blocked'
                      ? 'Np. Urlop / termin niedostępny'
                      : 'Tytuł wydarzenia'
                  }
                  value={topForm.title}
                  onChange={(e) => setTopForm({ ...topForm, title: e.target.value })}
                />

                <label>Data od</label>

                <input
                  type="date"
                  value={topForm.start?.slice(0, 10) || ''}
                  onChange={(e) => setTopForm({ ...topForm, start: e.target.value })}
                />

                <label>Data do</label>

                <input
                  type="date"
                  value={topForm.end?.slice(0, 10) || ''}
                  onChange={(e) => setTopForm({ ...topForm, end: e.target.value })}
                />

                {topForm.mode !== 'blocked' && (
                  <>
                    <label>Kolor</label>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={topForm.color}
                        onChange={(e) => setTopForm({ ...topForm, color: e.target.value })}
                      />

                      <span style={{ fontSize: 12, color: 'var(--color-gray)' }}>
                        {topForm.color}
                      </span>
                    </div>
                  </>
                )}

                <label>Opis</label>

                <textarea
                  placeholder={
                    topForm.mode === 'blocked'
                      ? 'Opcjonalny opis blokady'
                      : 'Opis wydarzenia'
                  }
                  value={topForm.description}
                  onChange={(e) => setTopForm({ ...topForm, description: e.target.value })}
                />

                {topForm.mode === 'blocked' && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 10,
                      fontSize: 13,
                      color: '#475569',
                    }}
                  >
                    W tym zakresie dat nie będzie można dodawać nowych wydarzeń ani rezerwacji z lejka.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const saved = await handleCreateOrUpdate();

                    if (saved) {
                      setShowCreateModal(false);
                    }
                  }}
                >
                  Zapisz
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                  }}
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Edytuj wydarzenia i blokady</h3>

                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                  ×
                </button>
              </div>

              <div className="modal-body">
                {loadingEvents ? (
                  <div>Ładowanie wydarzeń...</div>
                ) : (
                  <div className="edit-list">
                    {events.map((event) => {
                      const blocked = isBlockedEvent(event);
                      const reservation = isReservationEvent(event);

                      return (
                        <div className="edit-list-item" key={event.id || event.documentId || event.title}>
                          <div className="edit-item-main">
                            <div className="event-title">
                              {event.title}

                              {blocked && (
                                <span style={{ marginLeft: 8, fontSize: 12, color: '#111827' }}>
                                  blokada
                                </span>
                              )}

                              {reservation && (
                                <span style={{ marginLeft: 8, fontSize: 12, color: '#16a34a' }}>
                                  rezerwacja
                                </span>
                              )}
                            </div>

                            <div className="event-dates">
                              {formatDisplayDate(event.start)}
                              {event.end ? ' – ' + formatDisplayDate(event.end) : ''}
                            </div>

                            <div style={{ fontSize: 12, color: 'var(--color-gray)' }}>
                              <strong>Kolor:</strong> {event.color}
                            </div>

                            <div style={{ fontSize: 12, color: 'var(--color-gray)' }}>
                              <strong>Opis:</strong> {cleanDescription(event.description) || '-'}
                            </div>
                          </div>

                          <div className="edit-item-actions">
                            <button
                              className="btn"
                              onClick={() => {
                                startEdit(event);
                                setShowCreateModal(true);
                                setShowEditModal(false);
                              }}
                            >
                              Edytuj
                            </button>

                            <button
                              className="btn btn-ghost"
                              onClick={() => handleDelete(event.id || event.documentId)}
                            >
                              Usuń
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn" onClick={() => setShowEditModal(false)}>
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rbc-content">
          <Calendar
            localizer={localizer}
            culture="pl"
            onNavigate={(nextDate: Date) => setDate(nextDate)}
            date={date}
            events={events.map((event) => ({
              ...event,
              start: event.start ? new Date(event.start) : new Date(),
              end: event.end
                ? new Date(event.end)
                : event.start
                  ? new Date(event.start)
                  : new Date(),
            }))}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventStyleGetter}
            showAllEvents
            popup={false}
            views={{
              month: true,
              week: WeekSimple as unknown as React.ComponentType<any> & ViewStatic,
            }}
            style={{ flex: 1 }}
            view={view}
            onView={(newView: string) => setView(newView as 'month' | 'week')}
            formats={{
              dateFormat: 'D',
              weekdayFormat: (date: Date, culture?: string, l?: any) =>
                l.format(date, 'dddd', culture),
              dayHeaderFormat: (date: Date, culture?: string, l?: any) =>
                l.format(date, 'dddd, D MMMM YYYY', culture),
              dayRangeHeaderFormat: (
                { start, end }: { start: Date; end: Date },
                culture?: string,
                l?: any
              ) => `${l.format(start, 'D MMMM', culture)} – ${l.format(end, 'D MMMM YYYY', culture)}`,
            }}
            components={{
              month: {
                event: () => null,
                dateHeader: MonthDateHeader,
              },
            }}
            messages={{
              date: 'Data',
              time: 'Godzina',
              event: 'Wydarzenie',
              allDay: 'Cały dzień',
              week: 'Tydzień',
              work_week: 'Tydzień roboczy',
              day: 'Dzień',
              month: 'Miesiąc',
              previous: 'Poprzedni',
              next: 'Następny',
              yesterday: 'Wczoraj',
              tomorrow: 'Jutro',
              today: 'Dziś',
              agenda: 'Agenda',
              noEventsInRange: 'Brak wydarzeń w tym zakresie',
              showMore: (total: number) => `+${total} więcej`,
            }}
          />

          {view === 'month' && (
            <MonthPanel
              monthLabel={monthLabel}
              groupOrder={groupOrder}
              groupedByRange={groupedByRange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;