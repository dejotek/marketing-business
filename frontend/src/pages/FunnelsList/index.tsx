import React, { useEffect, useState } from 'react';
import { getFunnels, deleteFunnel } from '../../services/strapi';
import { Link, useNavigate } from 'react-router-dom';

const FunnelsList: React.FC = () => {
  const [funnels, setFunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getFunnels();
        // Strapi shape: { data: [...] }
        if (res && res.data) setFunnels(res.data);
        else setFunnels(res || []);
      } catch (err) {
        // no backend yet — keep empty
        console.warn('getFunnels failed', err);
        setFunnels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page-container">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>Lista lejków</h1>
        <div>
          <button className="btn btn-primary" onClick={() => navigate('/app/funnels')}>Dodaj nowy</button>
        </div>
      </div>
      {loading && <div>Ładowanie...</div>}
      {!loading && funnels.length === 0 && <div>Brak zapisanych lejków</div>}

      <div style={{display:'grid', gap:12, marginTop:12}}>
        {funnels.map((f: any) => {
          const docId = f.attributes?.documentId || f.documentId || f.id;
          return (
            <div key={f.id || docId} style={{background:'#fff', padding:12, borderRadius:8}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div>
                  <strong>{f.attributes?.name || f.name || 'Lejek'}</strong>
                  <div style={{fontSize:13, color:'#666'}}>{f.attributes?.blocks?.length || f.blocks?.length || 0} bloków</div>
                </div>
                <div style={{display:'flex', gap:8}}>
                  <a className="btn btn-ghost" href={`/app/funnels/preview?id=${docId}`}>Podgląd</a>
                  <Link className="btn btn-ghost" to={`/app/funnels?id=${docId}`}>Edytuj</Link>
                  <button className="btn btn-secondary" onClick={async () => {
                    if (!window.confirm('Usunąć ten lejek?')) return;
                    try {
                      await deleteFunnel(docId);
                      setFunnels(prev => prev.filter((x:any)=>String(x.id)!==String(f.id) && String(x.attributes?.documentId || x.documentId || x.id)!==String(docId)));
                    } catch(e){ alert('Błąd'); }
                  }}>Usuń</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FunnelsList;
