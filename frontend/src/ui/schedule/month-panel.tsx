import React from 'react';

import Eye from './assets/icon/eye';

import './assets/style/style.scss';

type MonthPanelProps = {
  monthLabel: string;
  groupOrder: string[];
  groupedByRange: { [key: string]: Array<{ title: string; color?: string }> };
};

export const MonthPanel = ({ monthLabel, groupOrder, groupedByRange }: MonthPanelProps) => {
  
  return (
    <aside className="month-panel">
      <div className="month-panel__title">W tym miesiącu:</div>
      <div className="month-panel__subtitle">{monthLabel}</div>

      <div className="month-panel__list">
        {groupOrder.length === 0 && (
          <div className="month-panel__empty">Brak wydarzeń w tym miesiącu</div>
        )}

        {groupOrder.map((key) => (
          <div key={key} className="month-group">
            <div className="month-group__header">
              <span className="month-group__line-left"></span>
              <span className="month-group__date">{key}</span>
              <span className="month-group__line"></span>
            </div>

            <div className="month-group__items">
              {groupedByRange[key].map((ev, idx) => (
                <div key={idx} className="month-item">
                  <span className="month-item__dot" style={{ backgroundColor: ev.color || '#2563eb' }} />
                  <span className="month-item__title">{ev.title}</span>
                  <button className="month-item__eye btn btn-ghost"><Eye /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
};

export default MonthPanel;
