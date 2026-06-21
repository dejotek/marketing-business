import React from 'react';

export default function MonthDateHeader({ label, date }: { label: string; date: Date }) {
  const isSunday = date.getDay() === 0;
  return <button type="button" className={isSunday ? 'rbc-date-red rbc-button-link' : 'rbc-button-link'}>{label}</button>;
}
