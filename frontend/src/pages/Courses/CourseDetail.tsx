import React, { useEffect, useState } from 'react';
import './CourseDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourses, getProgress, saveProgress, getPurchases, createPurchase } from '../../services/strapi';
import { getCurrentUserId } from '../../utils/auth';
import { getLocalPurchases, setLocalPurchase } from '../../utils/purchases';
import { getProgressFor, setProgressFor } from '../../utils/progress';

type Lesson = { id: string; title: string; content: string };
type Module = { id: string; title: string; lessons: Lesson[]; exam?: { questions: { id:string; q:string; choices: string[]; answer:number }[] } };
type Course = { id: string; title: string; description?: string; modules: Module[]; price?: number };

const PROGRESS_KEY = 'course_progress_v1';
const PURCHASE_KEY_BASE = 'purchased_courses_v1';

const ensureBoundaries = (modules: Module[]): Module[] => {
  return modules.map((m) => {
    const lessons = [...(m.lessons || [])];
    if (!lessons.length || lessons[0].title !== 'Wstęp') {
      lessons.unshift({ id: `${m.id}-intro`, title: 'Wstęp', content: 'Wprowadzenie do modułu.' });
    }
    if (!lessons.length || lessons[lessons.length-1].title !== 'Podsumowanie') {
      lessons.push({ id: `${m.id}-summary`, title: 'Podsumowanie', content: 'Krotka powtorka przed egzaminem.' });
    }
    return { ...m, lessons };
  });
};

const loadMockCourse = (id: string): Course | null => {
  if (id === 'c1') {
    const modules: Module[] = [
      {
        id: 'm1',
        title: 'Wprowadzenie do marketingu',
        lessons: [
          { id: 'm1-1', title: 'Co to jest marketing?', content: '## Wprowadzenie\n\nMarketing to proces rozumienia potrzeb użytkowników i dostarczania im wartości. W tej lekcji omówimy podstawowe pojęcia i ramy działań marketingowych.\n\n### Kluczowe pojęcia\n\n- Wartość dla klienta\n- Kanały komunikacji\n- Customer journey\n\n### Cel lekcji\n\nZrozumienie podstaw, które pozwolą zaplanować strategię komunikacji.' },
          { id: 'm1-2', title: 'Historia i ewolucja', content: '## Krótka historia marketingu\n\nMarketing przeszedł długą drogę od masowej komunikacji do personalizacji na poziomie pojedynczego użytkownika.\n\n### Główne etapy\n\n1. Druk i PR\n2. Telewizja i reklama masowa\n3. Internet i targetowanie\n\n### Refleksja\n\nZrozumienie kontekstu historycznego pomaga wybierać narzędzia adekwatne do celu.' },
          { id: 'm1-3', title: 'Buyer persona i segmentacja', content: '## Persona i segmentacja\n\nTworzenie persony to proces zbierania danych jakościowych i ilościowych. W tej lekcji pokażemy przykładowe szablony i checklisty.\n\n### Elementy persony\n\n- Demografia\n- Cele i wyzwania\n- Kanały komunikacji\n\n### Ćwiczenie\n\nPrzygotuj opis 2 person dla wybranego produktu.' }
        ],
        exam: {
          questions: [
            { id:'q1', q: 'Co powinien zawierać opis buyer persona?', choices:['Wiek, potrzeby, bariery, cele','Wyłącznie wiek i płeć','Tylko dane demograficzne'], answer:0 },
            { id:'q1b', q: 'Czy segmentacja rynku może poprawić konwersję?', choices:['Tak, umożliwia lepsze targetowanie','Nie, to zbędne','Tylko w reklamie offline'], answer:0 }
          ]
        }
      },
      {
        id: 'm2',
        title: 'Lejek sprzedaży i treści',
        lessons: [
          { id: 'm2-1', title: 'Architektura lejka', content: '## Architektura lejka\n\nLejek sprzedażowy dzieli ścieżkę klienta na fazy: świadomość (TOFU), rozważanie (MOFU) i decyzja (BOFU).\n\n### Co mierzyć\n\n- Ruch na TOFU\n- Lead generation na MOFU\n- CR i przychody na BOFU' },
          { id: 'm2-2', title: 'Tworzenie treści wartościowych', content: '## Tworzenie treści\n\nJak tworzyć artykuły, webinary i lead magnety, które faktycznie przyciągają użytkowników.\n\n### Szablon artykułu\n\nNagłówek, lead, problem, rozwiązanie, dowód społeczny, CTA.\n\n### Przykład\n\nAnaliza artykułu, który wygenerował dużą liczbę leadów.' },
          { id: 'm2-3', title: 'Copywriting i CTA', content: '## Copywriting\n\nTechniki AIDA, storytelling i język korzyści.\n\n### CTA\n\nJak projektować CTA, testować warianty i wybierać zwycięzców.' },
          { id: 'm2-4', title: 'Analiza i optymalizacja', content: '## Analiza lejka\n\nNarzędzia: Google Analytics, Hotjar, systemy CRM.\n\n### Eksperymenty\n\nJak przeprowadzać testy A/B i interpretować wyniki.' }
        ],
        exam: {
          questions: [
            { id:'q2', q: 'Który etap lejka odpowiada za generowanie świadomości?', choices:['TOFU','MOFU','BOFU'], answer:0 },
            { id:'q2b', q: 'Co jest dobrym celem dla MOFU?', choices:['Zbieranie leadów','Zamknięcie sprzedaży','Tylko budowanie marki'], answer:0 }
          ]
        }
      },
      {
        id: 'm3',
        title: 'Kanały i reklama',
        lessons: [
          { id: 'm3-1', title: 'SEO i content', content: '## SEO i content\n\nDługoterminowe strategie: optymalizacja on-page, plan treści i budowanie autorytetu.\n\n### Kroki\n\n1. Audyt\n2. Plan treści\n3. Link building' },
          { id: 'm3-2', title: 'PPC i reklamy społecznościowe', content: '## PPC\n\nBudowanie kampanii, targetowanie i optymalizacja stawki.\n\n### Metryki\n\nCPC, CTR, ROAS' },
          { id: 'm3-3', title: 'E-mail marketing', content: '## E-mail marketing\n\nSekwencje onboardingowe, segmentacja i automatyzacje.\n\n### Szablony\n\nPrzykładowe wiadomości: powitalna, edukacyjna, sprzedażowa.' }
        ],
        exam: undefined
      }
    ];
    return { id: 'c1', title: 'Kurs Marketingu Online', description: 'Kompletny kurs od A do Z z praktycznymi przykładami, zadaniami i egzaminami.', price:199, modules: ensureBoundaries(modules) };
  }
  if (id === 'c2') {
    const modules: Module[] = [
      {
        id:'m3',
        title:'Praktyka — budowa lejka',
        lessons:[
          { id:'m3-1', title:'Wstęp', content:'## Cel praktyki\n\nW tej sekcji przeprowadzimy praktyczne ćwiczenia: zaplanujesz lejka, przygotujesz treści i uruchomisz testy.\n\n### Co będzie potrzebne\n\nLista narzędzi, brief produktu i podstawowe dane o odbiorcach.' },
          { id:'m3-2', title:'Zadanie 1 — research', content:'## Research słów kluczowych\n\nKrok po kroku: jak znaleźć tematy z potencjałem, ocenić ich wolumen oraz intencję użytkownika.\n\n### Narzędzia\n\nGoogle Keyword Planner, AnswerThePublic, narzędzia SEO.' },
          { id:'m3-3', title:'Zadanie 2 — plan treści', content:'## Kalendarz treści\n\nPrzygotuj 8-tygodniowy plan: temat, format (artykuł/wideo), właściciel i CTA.\n\n### Przykład wpisu\n\nTytuł: Jak zbudować lejka w 30 dni — struktura, CTA i metryki.' },
          { id:'m3-4', title:'Podsumowanie', content:'## Podsumowanie i dalsze kroki\n\nOmówimy wyniki, wyciągniemy wnioski i zaplanujemy eksperymenty optymalizacyjne.\n\n### Checklista\n\n- Raport wyników\n- Lista testów\n- Harmonogram optymalizacji' }
        ],
        exam: undefined
      }
    ];
    return { id: 'c2', title: 'Lejek Sprzedazy — praktyka', description:'Budowanie lejków krok po kroku z ćwiczeniami praktycznymi.', price:99, modules: ensureBoundaries(modules) };
  }
  return null;
};

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [purchased, setPurchased] = useState<boolean>(false);
  const [purchaseChecked, setPurchaseChecked] = useState<boolean>(false);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>({ completedLessons: {}, completedModules: [], examResults: {} });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await getCourses();
        if (res && res.data) {
          const mapped = res.data.map((r:any) => ({ id: String(r.id), title: r.attributes.title, description: r.attributes.description, modules: r.attributes.modules || r.attributes.lessons || [], price: r.attributes.price }));
          const found = mapped.find((c:any) => String(c.id) === id);
          if (found) {
            const modules = ensureBoundaries(found.modules || []);
            setCourse({ ...found, modules });
            setCurrentModule(modules[0]?.id || null);
            setCurrentLesson(modules[0]?.lessons[0]?.id || null);

            // check if user already purchased this course (localStorage first, then API)
            try {
              const uid = getCurrentUserId();
              let already = false;
              try {
                const local = getLocalPurchases(uid);
                if (local && local[found.id]) {
                  already = true;
                  setPurchased(true);
                }
              } catch (e) {}

              // if not in localStorage, ask backend
              if (!already && (found.price && Number(found.price) > 0)) {
                try {
                  const p = await getPurchases({ ['filters[userId][$eq]']: uid, ['filters[courseId][$eq]']: found.id });
                  if (p && p.data && p.data.length) {
                    setPurchased(true);
                    try { setLocalPurchase(uid, found.id, true); } catch(e) {}
                    already = true;
                  } else {
                    setPurchased(false);
                  }
                } catch (e) {
                  setPurchased(false);
                }
              }

              // prefer local progress if present, then attempt to load server progress for purchased/free
                try {
                  const localProg = getProgressFor(String(found.id));
                  if (localProg) {
                    setProgress(localProg);
                  } else if (!found.price || Number(found.price) <= 0 || already) {
                    const api = await getProgress({ ['filters[courseId][$eq]']: id, ['filters[userId][$eq]']: uid });
                    if (api && api.data && api.data[0]) {
                      const srv = api.data[0].attributes.progress || {};
                      setProgress(srv);
                      try { setProgressFor(String(found.id), srv); } catch (e) {}
                    }
                  }
                } catch (e) {
                  // fallback: try server if local read failed
                  try {
                    if (!found.price || Number(found.price) <= 0 || already) {
                      const api = await getProgress({ ['filters[courseId][$eq]']: id, ['filters[userId][$eq]']: uid });
                      if (api && api.data && api.data[0]) {
                        const srv = api.data[0].attributes.progress || {};
                        setProgress(srv);
                        try { setProgressFor(String(found.id), srv); } catch (e) {}
                      }
                    }
                  } catch(e) {}
                }
            } catch (e) {}

            // mark that we've checked purchase status
            setPurchaseChecked(true);

            return;
          }
        }
      } catch (e) {}
      const mock = loadMockCourse(id as string);
      if (!mock) { alert('Kurs nie znaleziony'); navigate('/app/courses'); return; }
      setCourse(mock);
      setCurrentModule(mock.modules[0]?.id || null);
      setCurrentLesson(mock.modules[0]?.lessons[0]?.id || null);
      try {
        const local = getProgressFor(id as string);
        if (local) setProgress(local);
      } catch(e){}
      setPurchaseChecked(true);
    })();
  }, [id, navigate]);

  // progress is persisted via `persistProgress` which writes per-course via helper

  const persistProgress = async (newProgress: any) => {
    // compute course id robustly
    const courseId = (id || (course && course.id) || '').toString();

    // persist to localStorage immediately (synchronous)
    try {
      setProgressFor(courseId, newProgress);
      // eslint-disable-next-line no-console
      console.log('[CourseDetail] persisted progress to localStorage', courseId, newProgress);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write progress to localStorage', err);
    }

    // update in-memory state so UI updates
    setProgress(newProgress);

    // dispatch an event so other parts of the app (courses list) can update immediately
    try {
      window.dispatchEvent(new CustomEvent('progress:updated', { detail: { courseId, progress: newProgress } }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to dispatch progress event', e);
    }

    try {
      const uid = getCurrentUserId();
      // only persist to server for purchased or free courses
      if (purchased || (course && (!course.price || Number(course.price) <= 0))) {
        // debounce server saves to avoid excessive requests
        scheduleSaveToServer(uid, courseId, newProgress);
      }
    } catch(e){}
  };

  // debounce helper for server saves
  const saveTimer = React.useRef<number | null>(null);
  const scheduleSaveToServer = (userId: string, courseId: string, prog: any) => {
    try {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    } catch (e) {}
    // schedule after 1s of inactivity
    saveTimer.current = window.setTimeout(async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[CourseDetail] attempting server save', courseId);
        await saveProgress({ userId: userId, courseId: courseId, progress: prog });
        // eslint-disable-next-line no-console
        console.log('[CourseDetail] server save succeeded', courseId);
        // also persist to localStorage via helper (ensure server-updated copy exists)
        try { setProgressFor(courseId, prog); } catch (e) {}
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[CourseDetail] server save failed', e);
      }
    }, 1000) as unknown as number;
  };

  const handlePurchase = async () => {
    try {
      const uid = getCurrentUserId();

      // if already owned locally, open immediately
      try { const local = getLocalPurchases(uid); if (local && local[id as string]) { setPurchased(true); setPurchaseChecked(true); navigate(`/app/courses/${id}`); return; } } catch(e) {}

      const created = await createPurchase({ userId: uid, courseId: id, purchasedAt: new Date().toISOString() });
      // verify server saved the purchase (some Strapi setups restrict public creation)
      let confirmed = false;
      try {
        const v = await getPurchases({ ['filters[userId][$eq]']: uid, ['filters[courseId][$eq]']: id });
        if (v && v.data && v.data.length) confirmed = true;
      } catch (e) { /* ignore */ }

      // always mark locally so UI remains consistent
      try { setLocalPurchase(uid, id as string, true); } catch(e) {}
      setPurchased(true);
      setPurchaseChecked(true);

      if (confirmed) alert('Płatność przetworzona — dostęp nadany');
      else alert('Płatność zarejestrowana lokalnie, backend nie potwierdza zapisu (sprawdź uprawnienia Strapi).');
    } catch (e) {
      alert('Błąd przy tworzeniu zakupu — spróbuj ponownie');
    }
  };

  const markLessonDone = (moduleId:string, lessonId:string) => {
    const prev = progress || { completedLessons: {}, completedModules: [], examResults: {} };
    const completedLessons = { ...(prev.completedLessons || {}) };
    completedLessons[moduleId] = Array.from(new Set([...(completedLessons[moduleId]||[]), lessonId]));
    const newProgress = { ...prev, completedLessons };
    persistProgress(newProgress);
  };

  const markModuleComplete = (moduleId:string) => {
    const prev = progress || { completedLessons: {}, completedModules: [], examResults: {} };
    const completedModules = Array.from(new Set([...(prev.completedModules||[]), moduleId]));
    const newProgress = { ...prev, completedModules };
    persistProgress(newProgress);
  };

  const submitExam = (moduleId:string, score:number, total:number) => {
    const prev = progress || { completedLessons: {}, completedModules: [], examResults: {} };
    const examResults = { ...(prev.examResults || {}) , [moduleId]: { score, total } };
    const newProgress = { ...prev, examResults };
    persistProgress(newProgress);
    if (score / Math.max(1,total) >= 0.6) markModuleComplete(moduleId);
  };

  if (!course) return <div className="page-container">Ładowanie kursu...</div>;

  const computeOverallProgress = () => {
    const allLessons = course.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    if (!allLessons) return 0;
    const completed = course.modules.reduce((acc, m) => {
      const done = (progress.completedLessons?.[m.id] || []).length;
      return acc + done;
    }, 0);
    return Math.round((completed / allLessons) * 100);
  };

  const renderContent = (text?: string | undefined) => {
    if (!text) return null;
    return text.split('\n\n').map((block, i) => {
      if (block.startsWith('## ')) return <h3 key={i}>{block.replace('## ', '')}</h3>;
      if (block.startsWith('### ')) return <h4 key={i}>{block.replace('### ', '')}</h4>;
      return <p key={i} style={{marginTop:8, color:'#374151', lineHeight:1.6}}>{block}</p>;
    });
  };

  const OverallProgress: React.FC = () => {
    const pct = computeOverallProgress();
    return (
      <div className="overall-progress">
        <div className="progress-row">
          <div className="progress-info">
            <div className="course-title-small">{course.title}</div>
            <div className="course-desc">{course.description}</div>
          </div>
          <div className="progress-summary">{pct}% ukończono</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  // if course is paid and not purchased, show purchase prompt
  // const isPaid = !!course.price && Number(course.price) > 0;
  // if (isPaid && !purchaseChecked) {
  //   return <div className="page-container">Sprawdzam status dostępu...</div>;
  // }
  // if (isPaid && purchaseChecked && !purchased) {
  //   return (
  //     <div className="page-container">
  //       <h1>{course.title}</h1>
  //       <div style={{display:'grid', gridTemplateColumns:'1fr', gap:16}}>
  //         <div style={{background:'#fff', padding:12, borderRadius:8}}>
  //           <div>{course.description}</div>
  //           <div style={{marginTop:12}}>Cena: {course.price} PLN</div>
  //           <div style={{marginTop:12}}>
  //             <button className="btn btn-primary" onClick={handlePurchase}>Kup teraz</button>
  //             <button className="btn btn-ghost" onClick={() => navigate('/app/courses')} style={{marginLeft:8}}>Wróć do listy</button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="page-container">
      <OverallProgress />
      <h1 className="sr-only">{course.title}</h1>
      <div className="course-layout" style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:16}}>
        <aside>
          <div>
            <div><strong>Moduły</strong></div>
            <ul>
              {course.modules.map(m => (
                <li key={m.id}>
                  <div className={`module-row ${currentModule === m.id ? 'active' : ''}`} role="button" tabIndex={0} onClick={() => { setCurrentModule(m.id); setCurrentLesson(m.lessons[0]?.id || null); }} onKeyDown={(e:any)=>{ if (e.key === 'Enter' || e.key === ' ') { setCurrentModule(m.id); setCurrentLesson(m.lessons[0]?.id || null); } }}>
                    <div className="module-title">{m.title}</div>
                    <div className="module-badge">{(progress.completedModules||[]).includes(m.id) ? 'Zakończony' : `${(progress.completedLessons?.[m.id]||[]).length}/${m.lessons.length}`}</div>
                  </div>
                  {currentModule === m.id && (
                    <ol>
                      {m.lessons.map(l => (
                        <li key={l.id}>
                          <a className={`lesson-link ${currentLesson === l.id ? 'active-lesson' : ''}`} onClick={() => { setCurrentLesson(l.id); markLessonDone(m.id, l.id); }} >{l.title} <span className="lesson-check">{ (progress.completedLessons?.[m.id]||[]).includes(l.id) ? '✓' : '' }</span></a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main>
          <div className="course-main-card">
          {currentModule ? (
            (() => {
              const mod = course.modules.find(x => x.id === currentModule)!;
              const lesson = mod.lessons.find(l => l.id === currentLesson) || mod.lessons[0];
              return (
                <div>
                  <h2>{mod.title}</h2>
                  <div>
                    <h3>{lesson.title}</h3>
                    <div style={{marginTop:8}}>{renderContent(lesson.content)}</div>
                    {mod.exam && lesson.title === 'Podsumowanie' && (
                      <div style={{marginTop:12}}>
                        <Exam moduleId={mod.id} exam={mod.exam} onSubmit={(s,t)=> submitExam(mod.id,s,t)} existing={progress.examResults?.[mod.id]} />
                      </div>
                    )}
                    <div style={{marginTop:12}}><strong>Postep modułu:</strong> {Math.round(((progress.completedLessons?.[mod.id]||[]).length / Math.max(1, mod.lessons.length)) * 100)}%</div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div>Wybierz modul aby rozpoczac</div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
};

const Exam: React.FC<{ moduleId: string; exam: any; onSubmit: (score:number,total:number)=>void; existing?: any }> = ({ exam, onSubmit, existing }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(existing || null);
  const [submitted, setSubmitted] = useState(false);

  if (!exam) return null;

  const toggleAnswer = (qId: string, idx: number) => {
    if (submitted) return; // lock after submit
    setAnswers(a => ({ ...a, [qId]: idx }));
  };

  const submit = () => {
    const total = exam.questions.length;
    let score = 0;
    exam.questions.forEach((q:any) => { if (answers[q.id] === q.answer) score++; });
    const res = { score, total };
    setResult(res);
    setSubmitted(true);
    onSubmit(res.score, res.total);
  };

  return (
    <div className="exam-card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <strong>Egzamin modułu</strong>
        {!submitted ? <div style={{fontSize:13, color:'#6b7280'}}>Wybierz odpowiedzi i zatwierdź</div> : <div style={{fontSize:13, color:'#6b7280'}}>Wynik zapisany</div>}
      </div>
      <div style={{marginTop:12, display:'grid', gap:12}}>
        {exam.questions.map((q:any, qi:number) => (
          <div key={q.id} className="exam-question">
            <div style={{fontWeight:600, marginBottom:8}}>{qi+1}. {q.q}</div>
            <div className="exam-choices">
              {q.choices.map((c:string, idx:number) => {
                const isSelected = answers[q.id] === idx;
                const isCorrect = q.answer === idx;
                const choiceClass = submitted ? (isCorrect ? 'choice correct' : (isSelected ? 'choice incorrect' : 'choice')) : (isSelected ? 'choice selected' : 'choice');
                return (
                  <button key={idx} className={choiceClass} onClick={() => toggleAnswer(q.id, idx)} type="button">
                    <span className="choice-label">{String.fromCharCode(65+idx)}</span>
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12, display:'flex', gap:8, alignItems:'center'}}>
        {!submitted ? (
          <button className="btn btn-primary" onClick={submit}>Zatwierdź egzamin</button>
        ) : (
          <div className="exam-result">Wynik: {result?.score}/{result?.total} — {result && Math.round((result.score/result.total)*100)}% {result && result.score/result.total>=0.6 ? '(Zaliczone)' : '(Niezaliczone)'}</div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
