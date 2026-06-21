import React, { useEffect, useState } from 'react';
import { getFunnel, getEvents, createEvent } from '../../services/strapi';
import { useLocation } from 'react-router-dom';
import '../FunnelPreview/funnelPreview.css';
import axiosInstance from '../../utils/axiosInstance';

const BLOCKED_MARKER = '[[BLOCKED_TERM]]';
const RESERVATION_MARKER = '[[RESERVATION]]';

const isBlockedEvent = (event: any) => {
  const description = String(event?.description || '');
  const title = String(event?.title || '');

  return (
    description.includes(BLOCKED_MARKER) ||
    title.toLowerCase().includes('zablokowany termin')
  );
};

const toStartIso = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);

  return date.toISOString();
};

const toEndIso = (dateValue: string) => {
  const date = new Date(`${dateValue}T23:59:59`);

  return date.toISOString();
};

const rangesOverlap = (
  startA?: string,
  endA?: string,
  startB?: string,
  endB?: string
) => {
  if (!startA || !startB) return false;

  const aStart = new Date(startA).setHours(0, 0, 0, 0);
  const aEnd = new Date(endA || startA).setHours(23, 59, 59, 999);

  const bStart = new Date(startB).setHours(0, 0, 0, 0);
  const bEnd = new Date(endB || startB).setHours(23, 59, 59, 999);

  return aStart <= bEnd && bStart <= aEnd;
};

const formatDate = (value?: string) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('pl-PL');
};

const normalizeEvent = (record: any) => {
  const attrs = record?.attributes || record || {};

  return {
    id: record?.id || attrs.id,
    title: attrs.title || attrs.name || 'Wydarzenie',
    start: attrs.start || attrs.dateStart || '',
    end: attrs.end || attrs.dateEnd || attrs.start || attrs.dateStart || '',
    color: attrs.color || '#60a5fa',
    description: attrs.description || '',
  };
};

const ReservationBlock: React.FC<{ block: any }> = ({ block }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const checkBlockedTerm = async (startIso: string, endIso: string) => {
    const res = await getEvents();

    const events =
      res && res.data
        ? res.data.map(normalizeEvent)
        : Array.isArray(res)
          ? res.map(normalizeEvent)
          : [];

    return events.find((event: any) => {
      if (!isBlockedEvent(event)) return false;

      return rangesOverlap(startIso, endIso, event.start, event.end);
    });
  };

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      alert('Wpisz imię.');
      return;
    }

    if (!lastName.trim()) {
      alert('Wpisz nazwisko.');
      return;
    }

    if (!dateFrom) {
      alert('Wybierz datę rozpoczęcia.');
      return;
    }

    const finalDateTo = dateTo || dateFrom;

    const startDate = new Date(`${dateFrom}T00:00:00`);
    const endDate = new Date(`${finalDateTo}T00:00:00`);

    if (endDate.getTime() < startDate.getTime()) {
      alert('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.');
      return;
    }

    setSending(true);

    try {
      const startIso = toStartIso(dateFrom);
      const endIso = toEndIso(finalDateTo);

      const blockedConflict = await checkBlockedTerm(startIso, endIso);

      if (blockedConflict) {
        alert(
          `Nie można zarezerwować tego terminu, ponieważ nachodzi na zablokowany zakres: ${blockedConflict.title} (${formatDate(blockedConflict.start)} – ${formatDate(blockedConflict.end)})`
        );

        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const reservationDescription = description.trim() || 'Rezerwacja terminu';

      const payload = {
        title: `${fullName} - ${reservationDescription}`,
        start: startIso,
        end: endIso,
        color: '#16a34a',
        description: `${RESERVATION_MARKER}
Imię i nazwisko: ${fullName}
Email: ${email.trim() || '-'}
Opis: ${reservationDescription}`.trim(),
      };

      await createEvent(payload);

      alert('Termin został zarezerwowany.');

      setFirstName('');
      setLastName('');
      setEmail('');
      setDateFrom('');
      setDateTo('');
      setDescription('');
    } catch (err: any) {
      console.error('Błąd rezerwacji terminu:', err);

      const status = err?.response?.status;

      if (status === 401 || status === 403) {
        alert(
          'Nie udało się zapisać rezerwacji. W Strapi włącz publiczny dostęp do odczytu i tworzenia wydarzeń albo zrób osobny publiczny endpoint rezerwacji.'
        );

        return;
      }

      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Nieznany błąd';

      alert(`Nie udało się zarezerwować terminu: ${message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="reservation-block animate-enter">
      <div className="reservation-block__inner">
        <div className="reservation-block__header">
          <span className="reservation-block__eyebrow">
            Rezerwacja terminu
          </span>

          <h3>{block.title || 'Zarezerwuj termin'}</h3>

          {block.content && (
            <p>{block.content}</p>
          )}
        </div>

        <form className="reservation-form" onSubmit={handleReservation}>
          <div className="reservation-form__field">
            <label>Imię</label>
            <input
              placeholder="Wpisz imię"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="reservation-form__field">
            <label>Nazwisko</label>
            <input
              placeholder="Wpisz nazwisko"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="reservation-form__field">
            <label>Adres e-mail</label>
            <input
              placeholder="kontakt@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="reservation-form__field">
            <label>Data od</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="reservation-form__field">
            <label>Data do</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="reservation-form__field">
            <label>Opis rezerwacji</label>
            <textarea
              placeholder="Napisz krótko, czego dotyczy rezerwacja"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <button className="btn btn-primary reservation-form__button" disabled={sending}>
            {sending ? 'Rezerwowanie...' : block.ctaText || 'Zarezerwuj termin'}
          </button>
        </form>
      </div>
    </section>
  );
};

const FunnelPublic: React.FC = () => {
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
        const record = res && res.data ? res.data : res;
        const attrs = record && record.attributes ? record.attributes : record;

        setFunnel(attrs || null);
      } catch (e) {
        console.error('Błąd pobierania publicznego lejka:', e);
        setFunnel(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [location.search]);

  const resolveMediaUrl = (block: any) => {
    if (!block) return null;

    let url = null;

    if (block.mediaUrl) url = block.mediaUrl;
    if (!url && block.url) url = block.url;

    if (!url && block.media && block.media.data) {
      const mediaData = block.media.data;
      const attrs = mediaData.attributes || mediaData;

      if (attrs && attrs.url) url = attrs.url;

      if (!url && attrs && attrs.formats) {
        const formats = attrs.formats;
        const first: any = Object.values(formats)[0];

        if (first && first.url) url = first.url;
      }
    }

    if (!url && block.attributes && block.attributes.media && block.attributes.media.data) {
      const attrs = block.attributes.media.data.attributes;

      if (attrs && attrs.url) url = attrs.url;
    }

    if (!url) return null;

    const base = (axiosInstance.defaults.baseURL as string) || '';
    const backendOrigin = base.replace(/\/api\/?$/, '') || window.location.origin;

    if (url.startsWith('/')) url = backendOrigin + url;

    return url;
  };

  if (loading) return <div style={{ padding: 24 }}>Ładowanie...</div>;

  if (!funnel) return <div style={{ padding: 24 }}>Brak lejka do wyświetlenia</div>;

  return (
    <div className="funnel-preview" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div className="preview-canvas">
        {(funnel.blocks || []).map((block: any, index: number) => {
          if (block.type === 'hero') {
            return (
              <section key={index} className="preview-hero animate-enter">
                <h2>{block.title}</h2>
                <p>{block.content}</p>
              </section>
            );
          }

          if (block.type === 'optin') {
            return (
              <section key={index} className="preview-optin animate-enter">
                <h3>{block.title}</h3>

                <form>
                  <input placeholder="Twój email" />
                  <button className="btn btn-primary">
                    {block.ctaText || 'Zapisz się'}
                  </button>
                </form>
              </section>
            );
          }

          if (block.type === 'reservation') {
            return <ReservationBlock key={index} block={block} />;
          }

          if (block.type === 'video') {
            const mediaUrl = resolveMediaUrl(block) || block.mediaUrl || null;

            return (
              <section key={index} className="preview-video animate-enter">
                {mediaUrl ? (
                  (block.mediaMime && block.mediaMime.startsWith('image')) ||
                  (mediaUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(mediaUrl)) ? (
                    <img src={mediaUrl} alt={block.title || 'media'} />
                  ) : (
                    <video controls playsInline src={mediaUrl} poster={block.poster} />
                  )
                ) : (
                  <div className="video-placeholder">
                    Wideo: {block.title}
                  </div>
                )}
              </section>
            );
          }

          if (block.type === 'checkout') {
            return (
              <section key={index} className="preview-checkout animate-enter">
                <h4>{block.title}</h4>

                <button className="btn btn-primary">
                  {block.ctaText || 'Kup teraz'}
                </button>
              </section>
            );
          }

          if (block.type === 'thankyou') {
            return (
              <section key={index} className="preview-thankyou animate-enter">
                <h4>{block.title}</h4>
                <p>{block.content}</p>
              </section>
            );
          }

          return (
            <section key={index} className="preview-block animate-enter">
              <strong>{block.title || block.type}</strong>
              <p>{block.content}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default FunnelPublic;