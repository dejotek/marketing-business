export const PROGRESS_KEY = 'course_progress_v1';

export const getAllProgress = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY) || '{}';
    return JSON.parse(raw || '{}') || {};
  } catch (e) { return {}; }
};

const normalize = (p: any) => ({
  completedLessons: (p && p.completedLessons) || {},
  completedModules: (p && p.completedModules) || [],
  examResults: (p && p.examResults) || {},
});

export const getProgressFor = (courseId: string) => {
  try {
    const all = getAllProgress();
    const raw = all[courseId];
    if (!raw) return null;
    return normalize(raw);
  } catch (e) { return null; }
};

export const setProgressFor = (courseId: string, progress: any) => {
  try {
    const all = getAllProgress();
    all[courseId] = normalize(progress);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    return true;
  } catch (e) { return false; }
};

export default { getAllProgress, getProgressFor, setProgressFor };
