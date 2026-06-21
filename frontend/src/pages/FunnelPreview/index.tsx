import React, { useEffect, useState } from 'react';
import './funnelPreview.css';
import { getFunnel } from '../../services/strapi';
import axiosInstance from '../../utils/axiosInstance';
import { useLocation } from 'react-router-dom';
import { saveFunnel } from '../../services/strapi';

const FunnelPreview: React.FC = () => {
  const [funnel, setFunnel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(location.search);
        const id = params.get('documentId') || params.get('id');
        if (!id) {
          setFunnel(null);
          setLoading(false);
          return;
        }
        const res = await getFunnel(id);
        // support both Strapi shapes: { data: { id, attributes: {...} } } and { attributes: {...} }
        const record = (res && res.data) ? res.data : res;
        const attrs = (record && record.attributes) ? record.attributes : record;
        setFunnel(attrs || null);
      } catch (err) {
        console.error('Preview load failed', err);
        setFunnel(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [location.search]);

  if (loading) return <div className="page-container">Ładowanie podglądu...</div>;
  if (!funnel) return <div className="page-container">Brak lejka do podglądu</div>;
  const extractId = (res: any) => {
    if (!res) return null;
    if (res.id) return String(res.id);
    if (res._id) return String(res._id);
    if (res.data) {
      if (res.data.id) return String(res.data.id);
      if (res.data._id) return String(res.data._id);
      if (res.data.data && res.data.data.id) return String(res.data.data.id);
      if (Array.isArray(res.data) && res.data.length && res.data[0].id) return String(res.data[0].id);
    }
    return null;
  };

  const sharePreview = async () => {
    try {
      const params = new URLSearchParams(location.search);
      let id = params.get('documentId') || params.get('id');
      if (!id) {
        // try to save minimal funnel if preview was generated ad-hoc (unlikely)
        const payload = { name: funnel.name || 'Lejek', blocks: funnel.blocks || [] };
        const res = await saveFunnel(payload);
        id = extractId(res);
        if (!id) {
          alert('Nie udało się wygenerować linku.');
          return;
        }
      }
      const shareUrl = `${window.location.origin}/funnel/view?documentId=${encodeURIComponent(id)}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link skopiowany do schowka:\n' + shareUrl);
      } catch (e) {
        window.open(shareUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert('Błąd przy udostępnianiu podglądu');
    }
  };

  const resolveMediaUrl = (b: any) => {
    if (!b) return null;
    let url = null;
    // common direct fields
    if (b.mediaUrl) url = b.mediaUrl;
    if (!url && b.url) url = b.url;
    // strapi v4 relation shapes
    if (!url && b.media && b.media.data) {
      const md = b.media.data;
      const attrs = md.attributes || md;
      if (attrs && attrs.url) url = attrs.url;
      if (!url && attrs && attrs.formats) {
        const fm = attrs.formats;
        const first = Object.values(fm)[0];
        if (first && first.url) url = first.url;
      }
    }
    // nested attributes
    if (!url && b.attributes && b.attributes.media && b.attributes.media.data) {
      const attrs = b.attributes.media.data.attributes;
      if (attrs && attrs.url) url = attrs.url;
    }
    if (!url) return null;
    // derive backend origin from axiosInstance baseURL (strip trailing /api)
    const base = (axiosInstance.defaults.baseURL as string) || '';
    const backendOrigin = base.replace(/\/api\/?$/, '') || window.location.origin;
    if (url.startsWith('/')) url = backendOrigin + url;
    return url;
  };

  return (
    <div className="page-container funnel-preview">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '2rem'}}>
        <h1 style={{margin:0, fontWeight: 400}}>{funnel.name}</h1>
        <div>
          <button className="btn btn-secondary" onClick={sharePreview}>Udostępnij</button>
        </div>
      </div>

      <div className="preview-canvas">
        {(funnel.blocks || []).map((b: any, i: number) => {
          if (b.type === 'hero') return (
            <section key={i} className="preview-hero animate-enter"><h2>{b.title}</h2><p>{b.content}</p></section>
          );
          if (b.type === 'optin') return (
            <section key={i} className="preview-optin animate-enter"><h3>{b.title}</h3><form><input placeholder="Twój email" /><button className="btn btn-primary">{b.ctaText || 'Zapisz się'}</button></form></section>
          );
          if (b.type === 'video') {
            const mediaUrl = resolveMediaUrl(b) || b.mediaUrl || null;
            return (
              <section key={i} className="preview-video animate-enter">
                {mediaUrl ? (
                  (b.mediaMime && b.mediaMime.startsWith('image')) || (mediaUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(mediaUrl)) ? (
                    <img src={mediaUrl} alt={b.title || 'media'} />
                  ) : (
                    <video controls playsInline src={mediaUrl} poster={b.poster} />
                  )
                ) : (
                  <div className="video-placeholder">Wideo: {b.title}</div>
                )}
              </section>
            );
          }
          if (b.type === 'checkout') return (
            <section key={i} className="preview-checkout animate-enter"><h4>{b.title}</h4><button className="btn btn-primary">{b.ctaText || 'Kup teraz'}</button></section>
          );
          if (b.type === 'thankyou') return (
            <section key={i} className="preview-thankyou animate-enter"><h4>{b.title}</h4><p>{b.content}</p></section>
          );
          return (
            <section key={i} className="preview-block animate-enter"><strong>{b.title || b.type}</strong><p>{b.content}</p></section>
          );
        })}
      </div>
    </div>
  );
};

export default FunnelPreview;
