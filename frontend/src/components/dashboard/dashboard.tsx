import React, { useEffect, useState } from 'react';
import { getLogs } from '../../services/strapi';

const Dashboard: React.FC = () => {

  return (
    <div className="page-container dashboard-page">
      <h1>Panel główny</h1>

      <section className="metrics">
        <div className="metric-card">
          <div className="metric-title">Nowe leady</div>
          <div className="metric-value">+124</div>
          <div className="metric-note">W tym tygodniu</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Sprzedaż</div>
          <div className="metric-value">12 430 PLN</div>
          <div className="metric-note">Miesiąc</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Konwersja</div>
          <div className="metric-value">3.8%</div>
          <div className="metric-note">Ostatnie 30 dni</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Aktywne kursy</div>
          <div className="metric-value">4</div>
          <div className="metric-note">Uczestnicy: 342</div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
