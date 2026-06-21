import moment from 'moment';

function formatRangeLabel(start: Date, end: Date) {
  const startMoment = moment(start);
  let endMoment = moment(end);

  if (endMoment.isAfter(startMoment, 'day') && endMoment.hour() === 0 && endMoment.minute() === 0 && endMoment.second() === 0) {
    endMoment = endMoment.clone().subtract(1, 'minute');
  }

  if (startMoment.isSame(endMoment, 'day')) return startMoment.format('D.MM.YYYY');

  const sameMonth = startMoment.isSame(endMoment, 'month') && startMoment.isSame(endMoment, 'year');
  const sameYear = startMoment.isSame(endMoment, 'year');

  if (sameMonth) return `${startMoment.format('D')}–${endMoment.format('D.MM.YYYY')}`;
  if (sameYear)  return `${startMoment.format('D.MM')}–${endMoment.format('D.MM.YYYY')}`;
  return `${startMoment.format('D.MM.YYYY')}–${endMoment.format('D.MM.YYYY')}`;
}

function inCurrentMonth(ev: { start: Date; end: Date }, current: Date) {
  const currentMoment = moment(current);
  return moment(ev.start).isSame(currentMoment, 'month') || moment(ev.end).isSame(currentMoment, 'month');
}

function sortGroupedEvents(groupedByRange: Record<string, { title: string; color?: string }[]>, date: Date) {
  return Object.keys(groupedByRange).sort((ka, kb) => {
    const parseStart = (k: string) => {
      const left = k.split('-')[0];
      const norm = left.includes('.') && left.split('.').length === 3
        ? left
        : `${left}.${moment(date).format('YYYY')}`;
      return moment(norm, ['D.MM.YYYY', 'D.MM']).toDate().getTime();
    };
    return parseStart(ka) - parseStart(kb);
  });
}

function groupEventsByRange(monthEvents: any[], date: Date) {
  return monthEvents.reduce<Record<string, { title: string; color?: string }[]>>(
    (acc, event) => {
      const key = formatRangeLabel(event.start, event.end);
        if (!acc[key]) acc[key] = [];
        acc[key].push({ title: event.title, color: event.color });
        return acc;
      },
    {}
  );
}

export { inCurrentMonth, sortGroupedEvents, groupEventsByRange };
