import React from 'react';

import { ToolbarProps, Navigate } from 'react-big-calendar';

// import Switch from '@/components/ui/switch';
import ArrowLeft from './assets/icon/arrow-left';
import ArrowRight from './assets/icon/arrow-right';

import type { DateLocalizer } from 'react-big-calendar';

import './assets/style/style.scss';

export const CustomToolbar = (props: ToolbarProps) => {

  const localizer = props.localizer as unknown as DateLocalizer;

  const { date, view, onNavigate, onView } = props;
  const culture = 'pl';

  const viewOptions: any = [
    { name: "Tydzień", value: "week" },
    { name: "Miesiąc", value: "month" },
  ];

  const monthYear = localizer.format(date, 'MMMM YYYY', culture);

  const weekStart = localizer.startOf(date, 'week' as any);
  const weekEnd   = localizer.endOf(date, 'week' as any);
  const weekRange = `${localizer.format(weekStart, 'D.MM', culture)}–${localizer.format(weekEnd, 'D.MM', culture)}`;

  const unit = view === 'week' ? 'week' : 'month';
  const prev = () => onNavigate(Navigate.DATE, localizer.add(date, -1, unit));
  const next = () => onNavigate(Navigate.DATE, localizer.add(date,  1, unit));

  return (
    <div className="calendar-toolbar">
        <div>
            <div className="rbc-custom-toolbar">
                <div onClick={prev} className="rbc-custom-toolbar__button">
                    <ArrowLeft />
                </div>

                <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
                    <p className="rbc-custom-toolbar__month">{monthYear}</p>
                    {view === 'week' && <div className="rbc-custom-toolbar__week-range">{weekRange}</div>}
                </div>

                <div onClick={next} className="rbc-custom-toolbar__button">
                    <ArrowRight />
                </div>
            </div>
        </div>
        {/* <Switch
            switch={viewOptions}
            value={view}
            onChange={(newView: any) => onView(newView)}
            type="secondary"
        /> */}
    </div>
  );
}

export default CustomToolbar;
