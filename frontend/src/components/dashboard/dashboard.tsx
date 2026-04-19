import React, { useEffect, useState } from 'react';
import { getLogs } from '../../services/strapi';
 
import './assets/index.scss';
 
const Dashboard: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;
 
  useEffect(() => {
    (async () => {
      try {
        const res = await getLogs({ 'pagination[page]': page, 'pagination[pageSize]': pageSize, sort: 'createdAt:desc' });
        if (res && res.data) setLogs(res.data);
      } catch (e) {
        setLogs([]);
      }
    })();
  }, [page]);
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
                <div className="activity-text">{formatLog(l)}</div>
                <div className="activity-time">{formatTime(l.attributes?.createdAt)}</div>
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
 
function formatTime(val:any) {
  if (!val) return '';
  try { const d = new Date(val); return d.toLocaleString('pl-PL'); } catch(e) { return String(val) }
}
 
function formatLog(l:any) {
  const t = l.attributes?.type || l.type || '';
  const payload = l.attributes?.payload || l.payload || {};
  switch(t) {
    case 'exam.submitted':
      return `Egzamin: kurs ${payload.courseId || ''}, moduł ${payload.moduleId || ''} — wynik ${payload.score || 0}/${payload.total || 0} ${payload.score && payload.total ? ((payload.score / Math.max(1,payload.total)) >= 0.6 ? '(Zaliczone)' : '(Nie zaliczone)') : ''}`;
    case 'purchase':
    case 'purchase.created':
      return `Zakup: kurs ${payload.courseId || ''} — metoda ${payload.method || payload.paymentMethod || 'nieznana'}`;
    case 'lesson.complete':
      return `Lekcja ukończona: kurs ${payload.courseId || ''}, moduł ${payload.moduleId || ''}, lekcja ${payload.lessonId || ''}`;
    case 'funnel.saved':
      return payload.name ? `Lejek zapisany: ${payload.name}` : `Lejek zapisany (${payload.blocksLength || 0} bloków)`;
    case 'system.seed':
      return `System: ${payload?.message || 'Inicjalizacja'}`;
    default:
      return `${t} — ${JSON.stringify(payload)}`;
  }
}
 
export default Dashboard;
