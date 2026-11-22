// src/islands/SpaRouter.js
// Single Page Application (SPA) History API Router & Navigation Coordinator

export const SpaRouter = (function() {
  let isNavigatingFromPopstate = false;
  let hasNavigatedInApp = false;
  let initialized = false;

  function getCurrentUrlState() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('level')) {
      return { view: 'cards', level: params.get('level'), mode: params.get('mode') === 'browse' ? 'browse' : 'review' };
    }
    if (params.has('tab')) {
      const tab = params.get('tab');
      const story = params.get('story');
      const q = params.get('q');
      const mode = params.get('mode');
      const exam = params.get('exam');
      const lesson = params.get('lesson');
      return { view: 'tab', tab, story, q, mode, exam, lesson };
    }
    if (params.get('screen') === 'today-reviews') {
      return { view: 'todayReviews' };
    }
    if (params.get('screen') === 'radical-cards') {
      return { view: 'radicalCards', mode: params.get('mode') || 'basic50' };
    }
    return { view: 'vocab', subTab: 'level' };
  }

  function formatUrl(state) {
    const base = window.location.pathname;
    let themeParam = '';
    try {
      const t = document.documentElement.dataset.theme || (new URLSearchParams(window.location.search).get('theme'));
      if (t === 'light' || t === 'dark') themeParam = `&theme=${t}`;
    } catch (e) {}

    if (!state || state.view === 'vocab') {
      return themeParam ? `${base}?${themeParam.slice(1)}` : base;
    }
    if (state.view === 'cards' && state.level) {
      const modeParam = state.mode === 'browse' ? '&mode=browse' : '';
      return `${base}?level=${encodeURIComponent(state.level)}${modeParam}${themeParam}`;
    }
    if (state.view === 'tab' && state.tab && state.tab !== 'vocab') {
      if (state.tab === 'gradedReading' && state.story) {
        return `${base}?tab=gradedReading&story=${encodeURIComponent(state.story)}${themeParam}`;
      }
      if (state.tab === 'reading' && state.q) {
        return `${base}?tab=reading&q=${encodeURIComponent(state.q)}${themeParam}`;
      }
      if (state.tab === 'curriculum' && state.lesson) {
        return `${base}?tab=curriculum&lesson=${encodeURIComponent(state.lesson)}${themeParam}`;
      }
      if (state.tab === 'writing' && state.lesson) {
        return `${base}?tab=writing&lesson=${encodeURIComponent(state.lesson)}${themeParam}`;
      }
      if (state.tab === 'listening' && state.mode) {
        return `${base}?tab=listening&mode=${encodeURIComponent(state.mode)}${themeParam}`;
      }
      if (state.tab === 'sentenceGame') {
        let extra = '';
        if (state.exam) extra += `&exam=${encodeURIComponent(state.exam)}`;
        if (state.q) extra += `&q=${encodeURIComponent(state.q)}`;
        return `${base}?tab=sentenceGame${extra}${themeParam}`;
      }
      return `${base}?tab=${encodeURIComponent(state.tab)}${themeParam}`;
    }
    if (state.view === 'todayReviews') {
      return `${base}?screen=today-reviews${themeParam}`;
    }
    if (state.view === 'radicalCards') {
      return `${base}?screen=radical-cards&mode=${encodeURIComponent(state.mode || 'basic50')}${themeParam}`;
    }
    return themeParam ? `${base}?${themeParam.slice(1)}` : base;
  }

  function pushView(state, customUrl = null) {
    if (isNavigatingFromPopstate) return;
    const url = customUrl || formatUrl(state);
    const currentState = window.history.state;
    // Prevent duplicate consecutive entries
    if (
      currentState &&
      currentState.view === state.view &&
      currentState.level === state.level &&
      currentState.tab === state.tab &&
      (currentState.lesson || null) === (state.lesson || null) &&
      Boolean(currentState.drawerOpen) === Boolean(state.drawerOpen)
    ) {
      return;
    }
    hasNavigatedInApp = true;
    try {
      window.history.pushState(state, '', url);
    } catch (e) {
      console.warn('SpaRouter: pushState failed', e);
    }
    updateGlobalBackButton();
  }

  function replaceView(state, customUrl = null) {
    const url = customUrl || formatUrl(state);
    try {
      window.history.replaceState(state, '', url);
    } catch (e) {
      console.warn('SpaRouter: replaceState failed', e);
    }
    updateGlobalBackButton();
  }

  function updateGlobalBackButton() {
    const btn = document.getElementById('globalBackBtn');
    if (!btn) return;
    const state = window.history.state || getCurrentUrlState();
    const isRoot = (!state || state.view === 'vocab' || (!state.view && !state.tab)) &&
                   (!state || !state.subTab || state.subTab === 'level') &&
                   !document.body.classList.contains('study-mode') &&
                   !document.body.classList.contains('flashcard-study-mode') &&
                   !document.body.classList.contains('today-reviews-focus-mode');

    const canGoBack = hasNavigatedInApp || !isRoot;
    btn.hidden = !canGoBack;
  }

  function navigateBack() {
    if (hasNavigatedInApp && window.history.length > 1) {
      window.history.back();
    } else {
      handleFallbackBack();
    }
  }

  function handleFallbackBack() {
    const currentState = window.history.state || getCurrentUrlState();
    if (currentState.drawerOpen) {
      if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
      replaceView({ ...currentState, drawerOpen: false });
      updateGlobalBackButton();
      return;
    }
    if (currentState.view === 'cards') {
      if (typeof goBackToPicker === 'function') goBackToPicker();
      replaceView({ view: 'vocab' });
      updateGlobalBackButton();
      return;
    }
    if (currentState.view === 'todayReviews') {
      if (typeof closeTodayReviews === 'function') closeTodayReviews();
      replaceView({ view: 'vocab' });
      updateGlobalBackButton();
      return;
    }
    if (currentState.view === 'radicalCards') {
      if (typeof goBackToRadicalHub === 'function') goBackToRadicalHub();
      replaceView({ view: 'tab', tab: 'radicals' });
      updateGlobalBackButton();
      return;
    }
    if (currentState.view === 'tab') {
      const subtab = currentState.tab;
      if (['speedQuiz', 'sentenceGame'].includes(subtab)) {
        if (typeof setPrimaryTab === 'function') setPrimaryTab('writing');
        replaceView({ view: 'tab', tab: 'writing' });
      } else if (subtab === 'reading') {
        if (typeof setPrimaryTab === 'function') setPrimaryTab('gradedReading');
        replaceView({ view: 'tab', tab: 'gradedReading' });
      } else {
        if (typeof setPrimaryTab === 'function') setPrimaryTab('vocab');
        replaceView({ view: 'vocab' });
      }
      updateGlobalBackButton();
      return;
    }
  }

  function onPopState(event) {
    const state = event.state || getCurrentUrlState();
    isNavigatingFromPopstate = true;
    try {
      applyState(state);
    } finally {
      isNavigatingFromPopstate = false;
    }
  }

  function hideScreen(id) {
    const el = document.getElementById(id);
    if (el && el.style.display !== 'none') el.style.display = 'none';
  }

  function applyState(state) {
    if (!state) return;

    // 1. Handle drawer sub-state if open
    const isDrawerCurrentlyOpen = document.body.classList.contains('study-sidebar-open');
    if (isDrawerCurrentlyOpen && !state.drawerOpen) {
      if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
      if (state.view === 'cards' && typeof currentLevel !== 'undefined' && currentLevel === state.level) {
        return;
      }
    }

    // 2. Handle main view states
    // Hide every full-screen view except the target one; the branches below
    // only need to open their own view.
    if (state.view !== 'todayReviews') {
      document.body.classList.remove('today-reviews-focus-mode');
      hideScreen('screenTodayReviews');
    }
    if (state.view !== 'radicalCards') hideScreen('screenRadicalCards');
    if (state.view !== 'cards') hideScreen('screenCards');

    if (state.view === 'vocab') {
      document.body.classList.remove('study-mode');
      if (document.body.classList.contains('flashcard-study-mode')) {
        if (typeof goBackToPicker === 'function') goBackToPicker();
      } else if (typeof setPrimaryTab === 'function' && typeof primaryTab !== 'undefined' && primaryTab !== 'vocab') {
        setPrimaryTab('vocab');
      }
    } else if (state.view === 'cards') {
      document.body.classList.remove('study-mode');
      if (state.level) {
        if (typeof currentLevel === 'undefined' || currentLevel !== state.level) {
          if (typeof selectLevel === 'function') selectLevel(state.level);
        } else {
          const screenCards = document.getElementById('screenCards');
          if (screenCards && screenCards.style.display === 'none') {
            if (typeof selectLevel === 'function') selectLevel(state.level);
          }
        }
      }
      if (state.drawerOpen) {
        if (typeof toggleStudyWritingPanel === 'function') toggleStudyWritingPanel(true);
      }
    } else if (state.view === 'tab') {
      document.body.classList.remove('study-mode');
      if (state.tab && typeof setPrimaryTab === 'function') {
        if (document.body.classList.contains('flashcard-study-mode')) {
          if (typeof goBackToPicker === 'function') goBackToPicker();
        }
        setPrimaryTab(state.tab);
        if (state.tab === 'gradedReading' && state.story && typeof GradedReading !== 'undefined') {
          GradedReading.openStory(state.story, false);
        }
        if (state.tab === 'curriculum' && state.lesson && typeof Curriculum !== 'undefined') {
          Curriculum.openLesson(state.lesson, false);
        }
        if (state.tab === 'writing' && state.lesson && typeof Writing !== 'undefined') {
          Writing.open(state.lesson, false);
        }
        if (state.tab === 'listening' && state.mode && typeof ListeningPractice !== 'undefined') {
          ListeningPractice.setMode(state.mode);
        }
        if (state.tab === 'sentenceGame') {
          if (typeof setSentenceGameExam === 'function' && state.exam) {
            setSentenceGameExam(state.exam);
          }
          if (typeof goToSentenceGameQuestion === 'function' && state.q) {
            const qNum = parseInt(state.q, 10);
            if (qNum >= 86 && qNum <= 95) {
              goToSentenceGameQuestion(qNum - 86);
            }
          }
        }
      }
    } else if (state.view === 'todayReviews') {
      if (typeof openTodayReviews === 'function') openTodayReviews();
    } else if (state.view === 'radicalCards') {
      document.body.classList.remove('flashcard-study-mode');
      if (typeof startRadicalStudy === 'function') {
        startRadicalStudy(state.mode || 'basic50', 0);
      }
    }
    updateGlobalBackButton();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    window.addEventListener('popstate', onPopState);

    const backBtn = document.getElementById('globalBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateBack();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateBack();
      }
    });

    // Bootstrap current state on initial load
    const initialState = getCurrentUrlState();
    replaceView(initialState);
    updateGlobalBackButton();

    // If initial URL had deep link parameters, activate corresponding view on load
    function activateInitialView() {
      if (initialState.view === 'cards' && initialState.level) {
        if (typeof selectLevel === 'function') selectLevel(initialState.level);
      } else if (initialState.view === 'tab' && initialState.tab && initialState.tab !== 'vocab') {
        if (typeof setPrimaryTab === 'function') {
          setPrimaryTab(initialState.tab);
          if (initialState.tab === 'gradedReading' && initialState.story && typeof GradedReading !== 'undefined') {
            GradedReading.openStory(initialState.story, false);
          }
          if (initialState.tab === 'writing' && initialState.lesson && typeof Writing !== 'undefined') {
            Writing.open(initialState.lesson, true);
          }
          if (initialState.tab === 'curriculum' && initialState.lesson && typeof Curriculum !== 'undefined') {
            // setPrimaryTab pushed the plain tab URL; push the lesson so the link survives and Back returns to the list.
            Curriculum.openLesson(initialState.lesson, true);
          }
          if (initialState.tab === 'listening' && initialState.mode && typeof ListeningPractice !== 'undefined') {
            ListeningPractice.setMode(initialState.mode);
          }
          if (initialState.tab === 'sentenceGame') {
            if (typeof setSentenceGameExam === 'function' && initialState.exam) {
              setSentenceGameExam(initialState.exam);
            }
            if (typeof goToSentenceGameQuestion === 'function' && initialState.q) {
              const qNum = parseInt(initialState.q, 10);
              if (qNum >= 86 && qNum <= 95) {
                goToSentenceGameQuestion(qNum - 86);
              }
            }
          }
        }
      } else if (initialState.view === 'todayReviews') {
        if (typeof openTodayReviews === 'function') openTodayReviews();
      }
    }

    if (document.readyState === 'complete') {
      setTimeout(activateInitialView, 50);
    } else {
      window.addEventListener('load', () => setTimeout(activateInitialView, 50));
    }
  }

  return {
    init,
    pushView,
    replaceView,
    navigateBack,
    updateGlobalBackButton,
    isNavigatingFromPopstate: () => isNavigatingFromPopstate
  };
})();

export function mountSpaRouter() {
  if (typeof window !== 'undefined') {
    window.SpaRouter = SpaRouter;
    SpaRouter.init();
  }
  return SpaRouter;
}

if (typeof window !== 'undefined') {
  window.SpaRouter = SpaRouter;
}
