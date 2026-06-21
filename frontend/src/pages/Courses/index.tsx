import React, { useEffect, useState } from 'react';
import { getCourses, createPurchase, createLog, getPurchases, getProgress } from '../../services/strapi';
import { getCurrentUserId } from '../../utils/auth';
import { getLocalPurchases, setLocalPurchase } from '../../utils/purchases';
import { getAllProgress } from '../../utils/progress';
import { useNavigate } from 'react-router-dom';

type Lesson = { id: string; title: string; content: string };
type Module = { id: string; title: string; lessons: Lesson[]; exam?: { questions: { id:string; q:string; choices: string[]; answer:number }[] } };
type Course = { id: string; title: string; description?: string; modules: Module[]; price?: number; };

const MOCK: Course[] = [
  {
    id: 'c1',
    title: 'Kurs Marketingu Online',
    description: 'Kompletny kurs od A do Z z praktycznymi przykładami i zadaniami.',
    price: 199,
    modules: [
      {
        id: 'm1',
        title: 'Wprowadzenie do marketingu',
        lessons: [
          { id: 'l1', title: 'Co to jest marketing?', content: '## Wprowadzenie\n\nMarketing to proces tworzenia i komunikowania wartości. W lekcji omówimy definicje, role i przyklady.\n\n### Czego się nauczysz\n\n- Rozumienie podstaw\n- Znajomość kanałów\n- Umiejętność planowania podstawowej strategii' },
          { id: 'l2', title: 'Persona i segmentacja', content: '## Persona i segmentacja\n\nJak tworzyć persony oraz segmenty, które realnie poprawiają skuteczność kampanii.\n\n### Elementy persony\n\nImię, demografia, potrzeby, zachowania, kanały.' },
          { id: 'l3', title: 'Metryki i KPI', content: '## Metryki i KPI\n\nNauczysz się interpretować: CAC, LTV, CR, CTR.\n\n### Analiza\n\nJak zbierać dane i co znaczą poszczególne wskaźniki dla decyzji biznesowych.' }
        ],
        exam: { questions: [ { id:'q1', q: 'Która metryka mierzy koszt pozyskania klienta?', choices:['CAC','LTV','CR'], answer:0 } ] }
      },
      {
        id: 'm2',
        title: 'Tworzenie treści i lejek',
        lessons: [
          { id: 'l4', title: 'Planowanie treści', content: '## Planowanie treści\n\nPrzygotujemy harmonogram treści na 3 miesiące: tematy, formaty i cele.\n\n### Szablon\n\nTytuł, lead, sekcje, CTA, sugestie SEO.' },
          { id: 'l5', title: 'Copywriting', content: '## Copywriting\n\nTechniki pisania nagłówków, struktur tekstu i CTA.\n\n### Ćwiczenie\n\nNapisz trzy warianty nagłówków i przetestuj je.' },
          { id: 'l6', title: 'Formaty treści', content: '## Formaty treści\n\nKiedy użyć bloga, wideo, podcastu czy lead magnetu.\n\n### Porównanie\n\nZalety i wady każdego formatu oraz przykładowe case studies.' }
        ],
        exam: { questions: [ { id:'q2', q: 'Co to jest CTA?', choices:['Call To Action','Customer To Audience','Cost To Acquire'], answer:0 } ] }
      },
      {
        id: 'm3',
        title: 'Kampanie i optymalizacja',
        lessons: [
          { id: 'l7', title: 'PPC i remarketing', content: '## PPC i remarketing\n\nJak zbudować strukturę kampanii, ustawić budżet i wykonać remarketing.\n\n### Najlepsze praktyki\n\nSegmentacja, wykluczenia i optymalizacja konwersji.' },
          { id: 'l8', title: 'Analiza wyników', content: '## Analiza wyników\n\nPraktyczne techniki analizy danych kampanii i wyciągania wniosków.\n\n### Narzędzia\n\nGoogle Analytics, BigQuery, narzędzia BI.' },
          { id: 'l9', title: 'Automatyzacje', content: '## Automatyzacje\n\nSekwencje maili, automatyczne reguły i integracje systemów.\n\n### Przykłady\n\nOnboarding, porzucone koszyki, nurtujące sekwencje edukacyjne.' }
        ],
        exam: undefined
      }
    ]
  },
  {
    id: 'c2',
    title: 'Lejek Sprzedaży — praktyka',
    description: 'Budowanie lejków krok po kroku z ćwiczeniami praktycznymi i zadaniami.',
    price: 99,
    modules: [
      {
        id:'m4',
        title: 'Praktyczny lejek',
        lessons: [
          { id:'l10', title:'Wstęp do praktyki', content:'## Praktyczne przygotowanie\n\nInstrukcja jak korzystać z ćwiczeń, lista zasobów i oczekiwane rezultaty.\n\n### Materiały\n\nSzablony, checklisty, przykładowe pliki.' },
          { id:'l11', title:'Research i pomysły', content:'## Research i pomysły\n\nZadanie: znajdź 10 tematów, oceń intencję i zaproponuj lead magnety.\n\n### Metody\n\nAnaliza słów kluczowych, konkurencji i trendów.' },
          { id:'l12', title:'Wdrażanie i testy', content:'## Wdrażanie i testy\n\nUruchom kampanię testową, ustaw cele i mierz wyniki.\n\n### Raport\n\nJak przygotować raport z najważniejszymi wnioskami.' },
          { id:'l13', title:'Optymalizacja', content:'## Optymalizacja\n\nNa podstawie wyników zaplanuj 3 eksperymenty optymalizacyjne i priorytetyzuj je według wpływu.' }
        ],
        exam: undefined
      }
    ]
  }
];

const PURCHASE_KEY_BASE = 'purchased_courses_v1';
const PROGRESS_KEY = 'course_progress_v1';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(MOCK);
  const [viewMode, setViewMode] = useState<'marketplace' | 'yours'>('marketplace');
  const [modalCourse, setModalCourse] = useState<Course | null>(null);
  const [purchased, setPurchased] = useState<Record<string, boolean>>({});
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [processingPurchase, setProcessingPurchase] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const uid = getCurrentUserId();

  const PURCHASE_KEY = `${PURCHASE_KEY_BASE}_${uid}`;

  const computePercent = (course: Course, progress: any) => {
    try {
      const totalLessons = (course.modules || []).reduce((acc, m) => acc + ((m.lessons || []).length), 0);
      if (totalLessons === 0) return 0;
      let completed = 0;
      if (progress && progress.completedLessons) {
        // Count only lessons completed for modules that belong to this course
        completed = (course.modules || []).reduce((acc, m) => {
          const arr = progress.completedLessons?.[m.id];
          return acc + (Array.isArray(arr) ? arr.length : 0);
        }, 0);
      }
      // fallback to completedModules if completedLessons empty
      if (completed === 0 && progress && Array.isArray(progress.completedModules)) {
        const modulesDone = progress.completedModules.length;
        const totalModules = (course.modules || []).length || 1;
        return Math.min(100, Math.round((modulesDone / totalModules) * 100));
      }
      return Math.min(100, Math.round((completed / Math.max(1, totalLessons)) * 100));
    } catch (e) { return 0; }
  };

  // load purchases from centralized local storage (per-user) first
  useEffect(() => {
    try {
      const local = getLocalPurchases(uid);
      setPurchased(local);
    } catch (e) { }
  }, [uid]);

  useEffect(() => {
    (async () => {
      try {
        // debug: show stored progress map
        const _raw = localStorage.getItem(PROGRESS_KEY) || '{}';
        // eslint-disable-next-line no-console
        console.log('[Courses] loaded progress from localStorage', JSON.parse(_raw || '{}'));
      } catch (e) {}

      // load all local progress so UI shows per-course progress immediately
      try {
        const allProg = getAllProgress();
        setProgressMap(prev => ({ ...prev, ...allProg }));
      } catch (e) {}
      try {
        const res = await getCourses();
        if (res && res.data) {
          const mapped = res.data.map((r:any) => ({ id: String(r.id), title: r.attributes.title, description: r.attributes.description, modules: r.attributes.modules || r.attributes.lessons || [], price: r.attributes.price }));
          setCourses(mapped);
        }
      } catch (e) {
        // keep mocks
      }

      try {
        const p = await getPurchases({ ['filters[userId][$eq]']: uid });
          if (p && p.data) {
            const bought: Record<string, boolean> = {};
            const boughtIds: string[] = [];
            p.data.forEach((it:any) => { const cid = it.attributes.courseId || it.attributes.course?.data?.id; if (cid) { bought[String(cid)] = true; boughtIds.push(String(cid)); } });
            setPurchased(prev => {
              const merged = { ...prev, ...bought };
              try { Object.keys(bought).forEach(k => setLocalPurchase(uid, k, true)); } catch(e) {}
              return merged;
            });

          // load progress from localStorage first, then refresh from server for owned courses
          try {
            const localRaw = localStorage.getItem(PROGRESS_KEY) || '{}';
            const localAll = JSON.parse(localRaw || '{}');
            const initial: Record<string, any> = {};
            boughtIds.forEach(id => { if (localAll[id]) initial[id] = localAll[id]; });
            setProgressMap(prev => ({ ...prev, ...initial }));
          } catch (e) {}

          for (const cid of boughtIds) {
            try {
              const res2 = await getProgress({ ['filters[courseId][$eq]']: cid, ['filters[userId][$eq]']: uid });
              if (res2 && res2.data && res2.data[0]) {
                const serverProgress = res2.data[0].attributes.progress || {};
                setProgressMap(prev => ({ ...prev, [cid]: serverProgress }));
                try {
                  const allRaw = localStorage.getItem(PROGRESS_KEY) || '{}';
                  const allObj = JSON.parse(allRaw || '{}');
                  allObj[cid] = serverProgress;
                  localStorage.setItem(PROGRESS_KEY, JSON.stringify(allObj));
                } catch (e) {}
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    })();
    // listen for live progress updates from course page
    const onProgress = (e: any) => {
      try {
        const detail = e.detail || {};
        const cid = detail.courseId;
        const prog = detail.progress;
        if (cid) {
          setProgressMap(prev => ({ ...prev, [cid]: prog }));
          try {
            const allRaw = localStorage.getItem(PROGRESS_KEY) || '{}';
            const allObj = JSON.parse(allRaw || '{}');
            allObj[cid] = prog;
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(allObj));
          } catch (e) {}
        }
      } catch (e) {}
    };
    window.addEventListener('progress:updated', onProgress as EventListener);
    return () => window.removeEventListener('progress:updated', onProgress as EventListener);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchased)); } catch(e) {}
  }, [purchased]);

  const purchase = async (id: string) => {
    // if already processing, skip
    if (processingPurchase[id]) return;

    // if already marked purchased locally, open course immediately
    try {
      const local = getLocalPurchases(uid);
      if (local && local[id]) {
        navigate(`/app/courses/${id}`);
        return;
      }
    } catch (e) {}

    setProcessingPurchase(prev => ({ ...prev, [id]: true }));
    try {
      // createPurchase itself checks for existing purchases and will return existing if present
      const created = await createPurchase({ userId: uid, courseId: id, purchasedAt: new Date().toISOString() });

      // mark locally and in UI
      setPurchased(prev => {
        const next = { ...prev, [id]: true };
        try { Object.keys(next).forEach(k => setLocalPurchase(uid, k, !!next[k])); } catch(e) {}
        try { localStorage.setItem(PURCHASE_KEY, JSON.stringify(next)); } catch(e) {}
        return next;
      });

      try { await createLog({ type: 'purchase', userId: uid, payload: { courseId: id, method: 'stripe-sim' } }); } catch(e){}
      alert('Płatność przetworzona — dostęp nadany');
      navigate(`/app/courses/${id}`);
    } catch (e) {
      alert('Błąd przy tworzeniu zakupu — spróbuj ponownie');
    } finally {
      setProcessingPurchase(prev => ({ ...prev, [id]: false }));
    }
  };

  const openCourse = (id: string) => navigate(`/app/courses/${id}`);

  const displayed = viewMode === 'marketplace' ? courses : courses.filter(c => purchased[c.id]);

  return (
    <div className="page-container">
      <h1>Portal kursów</h1>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div style={{display:'inline-flex', background:'#eee', padding:4, borderRadius:999}}>
          <button onClick={() => setViewMode('yours')} style={{padding:'6px 12px', borderRadius:999, border:'none', background: viewMode === 'yours' ? '#fff' : 'transparent'}}>Twoje kursy</button>
          <button onClick={() => setViewMode('marketplace')} style={{padding:'6px 12px', borderRadius:999, border:'none', background: viewMode === 'marketplace' ? '#fff' : 'transparent'}}>Marketplace</button>
        </div>
        <div style={{color:'#666'}}>{viewMode === 'marketplace' ? 'Przeglądaj ofertę kursów' : 'Twoje zakupione kursy'}</div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16}}>
        {displayed.map(c => (
          <div key={c.id} style={{background:'#fff', padding:0, borderRadius:8, overflow:'hidden', boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{height:160, background:'#ddd'}}>
              <img src={`https://picsum.photos/seed/${encodeURIComponent(c.id)}/640/360`} alt={c.title} style={{width:'100%', height:160, objectFit:'cover'}} />
            </div>
            <div style={{padding:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <strong>{c.title}</strong>
                  <div style={{fontSize:13, color:'#666', marginTop:6}}>{c.description}</div>
                </div>
                <div style={{textAlign:'right', marginLeft:12}}>
                  <div style={{fontWeight:600}}>{c.price ? c.price + ' PLN' : 'Darmowy'}</div>
                </div>
              </div>

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12}}>
                <div>
                  <button className="btn btn-ghost" onClick={() => setModalCourse(c)}>Szczegóły</button>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  {!purchased[c.id] ? (
                    <button className="btn btn-primary" disabled={!!processingPurchase[c.id]} onClick={() => purchase(c.id)}>{processingPurchase[c.id] ? 'Kupuję...' : 'Zakup teraz'}</button>
                      ) : (
                    <>
                      <button className="btn btn-primary" onClick={() => openCourse(c.id)}>Otwórz kurs</button>
                      {(() => {
                        const prog = progressMap[c.id];
                        const hasProgress = prog && ((prog.completedLessons && Object.keys(prog.completedLessons).length>0) || (Array.isArray(prog.completedModules) && prog.completedModules.length>0) || (prog.examResults && Object.keys(prog.examResults).length>0));
                        if (!hasProgress) return null;
                        return <div style={{fontSize:13, color:'#333', marginLeft:8}}>Postęp: {computePercent(c, prog)}%</div>;
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalCourse && (
        <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999}} onClick={() => setModalCourse(null)}>
          <div style={{width:760, maxWidth:'95%', background:'#fff', borderRadius:8, padding:16}} onClick={(e) => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h2 style={{margin:0}}>{modalCourse.title}</h2>
              <button className="btn btn-ghost" onClick={() => setModalCourse(null)}>Zamknij</button>
            </div>
            <div style={{marginTop:12}}>
              <img src={`https://picsum.photos/seed/${encodeURIComponent(modalCourse.id)}/800/360`} alt={modalCourse.title} style={{width:'100%', height:220, objectFit:'cover', borderRadius:6}} />
            </div>
            <div style={{marginTop:12}}>
              <div style={{color:'#444'}}>{modalCourse.description || 'Brak dodatkowego opisu.'}</div>
              <div style={{marginTop:12}}><strong>Liczba modułów:</strong> {modalCourse.modules?.length || 0}</div>
              <div style={{marginTop:12}}>
                {!purchased[modalCourse.id] ? <button className="btn btn-primary" onClick={() => { purchase(modalCourse.id); setModalCourse(null); }}>Kup teraz</button> : <button className="btn btn-primary" onClick={() => { openCourse(modalCourse.id); setModalCourse(null); }}>Otwórz kurs</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
