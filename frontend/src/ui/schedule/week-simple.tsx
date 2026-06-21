import React from 'react';

import moment from 'moment';

type RBCLocalizer = any;

type Props = {
  date: Date;
  events: Array<{ start: Date; end: Date; title: string; color?: string }>;
  localizer: RBCLocalizer;
  onSelectEvent?: (event: any, e: React.SyntheticEvent) => void;
};

function getWeekBounds(date: Date, localizer: RBCLocalizer) {
  const start = localizer.startOf(date, 'week');
  const end = localizer.endOf(date, 'week');
  return { start, end };
}

function clipToWeek(ev: any, weekStart: Date, weekEnd: Date) {
  const s = moment(ev.start).toDate();
  const e = moment(ev.end).toDate();
  if (e < weekStart || s > weekEnd) return null;
  const _cs = s < weekStart ? weekStart : s;
  const _ce = e > weekEnd ? weekEnd : e;
  return { ...ev, _cs, _ce };
}

function dayIdx(d: Date, weekStart: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  const a = +moment(d).startOf('day');
  const b = +moment(weekStart).startOf('day');
  return Math.max(0, Math.min(6, Math.floor((a - b) / dayMs)));
}

function formatEventDates(ev: { start: Date; end: Date }) {
  const s = moment(ev.start);
  let e = moment(ev.end);

  if (e.isAfter(s, 'day') && e.hour() === 0 && e.minute() === 0 && e.second() === 0) {
    e = e.clone().subtract(1, 'minute');
  }

  if (s.isSame(e, 'day')) {
    return s.format('D.MM');
  }
  return `${s.format('D.MM')} - ${e.format('D.MM')}`;
}

export default function WeekSimple({ date, events, localizer, onSelectEvent }: Props) {
  const { start: weekStart, end: weekEnd } = getWeekBounds(date, localizer);

  const clipped = events.map(e => clipToWeek(e, weekStart, weekEnd)).filter(Boolean) as any[];

  const withCols = clipped
    .map(ev => {
      const si = dayIdx(ev._cs, weekStart);
      const endAdj =
        moment(ev._ce).isAfter(moment(ev._cs), 'day') &&
        moment(ev._ce).hour() === 0 &&
        moment(ev._ce).minute() === 0
          ? moment(ev._ce).subtract(1, 'minute').toDate()
          : ev._ce;
      const ei = dayIdx(endAdj, weekStart);
      return { ...ev, _si: si, _ei: Math.max(si, ei) };
    })
    .sort((a, b) => a._si - b._si || a._ei - b._ei);

  type Lane = { end: number; items: any[] };
  const lanes: Lane[] = [];
  for (const ev of withCols) {
    let placed = false;
    for (const lane of lanes) {
      if (ev._si > lane.end) {
        lane.items.push(ev);
        lane.end = ev._ei;
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push({ end: ev._ei, items: [ev] });
  }

  const totalRows = Math.max(5, lanes.length + 1);
  const days = Array.from({ length: 7 }, (_, i) => moment(weekStart).add(i, 'day'));

  return (
    <div className="rbc-week-simple" style={{ height: '100%' }}>
      <div
        className="ws-grid ws-grid-bg"
        style={{ ['--rows' as any]: totalRows } as React.CSSProperties}
      >
        {Array.from({ length: totalRows * 7 }).map((_, idx) => (
          <div key={idx} className="ws-bg-cell" />
        ))}
      </div>

      <div
        className="ws-grid ws-grid-fore"
        style={{ ['--rows' as any]: totalRows } as React.CSSProperties}
      >
        {days.map((d, col) => {
            const isSunday = d.day() === 0;
            return (
                <div
                    key={`h-${col}`}
                    className={`ws-header-cell${isSunday ? ' ws-sunday' : ''}`}
                    style={{ gridColumn: `${col + 1} / ${col + 2}`, gridRow: '1 / 2' }}
                >
                    <div className="ws-dow">{d.format('dddd')}</div>
                    <div className="ws-date">{d.format('D.MM')}</div>
                </div>
            );
        })}

        {lanes.map((lane, laneIdx) =>
          lane.items.map((ev, i) => (
            <div
                key={`e-${laneIdx}-${i}`}
                className="ws-event"
                title={ev.title}
                style={{
                    gridColumn: `${ev._si + 1} / ${ev._ei + 2}`,
                    gridRow: `${laneIdx + 2} / ${laneIdx + 3}`,
                    ['--ev-bg' as any]: ev.color || '#2563eb',
                }}
                onClick={(e) => onSelectEvent?.(ev, e)}
            >
                <div className="ws-event-title">{ev.title}</div>
                <div className="ws-event-dates">{formatEventDates(ev)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

(WeekSimple as any).title = (date: Date, { localizer, culture }: any) => {
  const { start, end } = getWeekBounds(date, localizer);
  return `${localizer.format(start, 'D MMMM', culture)} – ${localizer.format(end, 'D MMMM YYYY', culture)}`;
};

(WeekSimple as any).range = (date: Date, { localizer }: any) => {
  const start = localizer.startOf(date, 'week');
  const end = localizer.endOf(date, 'week');
  return { start, end };
};

(WeekSimple as any).navigate = (date: Date, action: string, { localizer }: any) => {
  switch (action) {
    case 'PREV': return localizer.add(date, -1, 'week');
    case 'NEXT': return localizer.add(date, 1, 'week');
    case 'TODAY': return new Date();
    default: return date;
  }
};
