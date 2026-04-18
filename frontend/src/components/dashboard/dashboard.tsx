import React, { useState } from 'react';

const Dashboard: React.FC = () => {
  const logs: any[] = [
    { id: '1', attributes: { message: 'Zakup: kurs c1 — metoda stripe-sim', createdAt: '2026-04-18T12:00:00Z' } },
    { id: '2', attributes: { message: 'Zakup: kurs c1 — metoda stripe-sim', createdAt: '2026-04-18T11:50:00Z' } },
    { id: '3', attributes: { message: 'Lejek zapisany: Nowy lejek', createdAt: '2026-04-18T11:40:00Z' } },
    { id: '4', attributes: { message: 'Zakup: kurs c1 — metoda stripe-sim', createdAt: '2026-04-18T11:30:00Z' } },
    { id: '5', attributes: { message: 'Lejek zapisany: Nowy lejek', createdAt: '2026-04-18T11:20:00Z' } },
    { id: '6', attributes: { message: 'Zakup: kurs c1 — metoda stripe-sim', createdAt: '2026-04-18T11:10:00Z' } },
    { id: '7', attributes: { message: 'Zakup: kurs — metoda stripe-sim', createdAt: '2026-04-18T11:00:00Z' } },
    { id: '8', attributes: { message: 'Zakup: kurs c2 — metoda stripe-sim', createdAt: '2026-04-18T10:50:00Z' } },
  ];
  const [page, setPage] = useState(1);
  const pageSize = 8;

  
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

      <section className="dashboard-grid">
        <div className="card">
          <h3>Wykres konwersji</h3>
          <div className="chart">
            <svg viewBox="0 0 200 80" preserveAspectRatio="none" style={{width: '100%', height: 120}}>
              <polyline fill="none" stroke="#4f46e5" strokeWidth="3" points="0,60 20,50 40,55 60,30 80,40 100,20 120,28 140,18 160,30 180,22 200,10" />
            </svg>
          </div>
        </div>

        <div className="card">
          <h3>Ostatnie aktywności</h3>
          <ul className="activity-list">
            {logs.map(l => (
              <li key={l.id} className="activity-item">
                <div className="activity-text">{l.attributes?.message}</div>
                <div className="activity-time">{l.attributes?.createdAt}</div>
              </li>
            ))}
          </ul>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:8}}>
            <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>Poprzednia</button>
            <div>Strona {page}</div>
            <button className="btn btn-secondary" onClick={() => setPage(p => p+1)}>Następna</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;