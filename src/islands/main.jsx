// Entry for the Preact islands mounted inside the legacy index.html.
// Each island owns one piece of the page that used to be built by a legacy script,
// rendering identical markup so the existing CSS applies unchanged.
import './tailwind.css';
import { mountAppUtils } from './AppUtils';
import { mountAppHeader } from './AppHeader';
import { mountAppState } from './AppState';
import { mountSrsEngine } from './SrsEngine';
import { mountStorageEngine } from './StorageEngine';
import { mountAmbientBackground } from './ambientBackground';
import { mountStudyHelpModal } from './StudyHelpModal';
import { mountFeaturePromoModal } from './FeaturePromoModal';
import { mountGuessWordGame } from './GuessWordGame';
import { mountSpeedQuizGame } from './SpeedQuizGame';
import { mountSentenceGame } from './SentenceGame';
import { mountVocabularyOverview } from './VocabularyOverview';
import { mountMemoryCurve } from './MemoryCurve';
import { mountSidebarSearch } from './SidebarSearch';
import { mountSidebarRadicalsFilter } from './SidebarRadicalsFilter';
import { mountWeakWords } from './WeakWords';
import { mountSidebarTabs } from './SidebarTabs';
import { mountRadicalsState } from './radicalsState';
import { mountStrokeCanvas } from './StrokeCanvas';
import { mountWordCompanion } from './WordCompanion';
import { mountGrammarBreakdown } from './GrammarBreakdown';
import { mountTodayReview } from './TodayReview';
import { mountHanziDecomposition } from './HanziDecomposition';
import { mountRelatedWords } from './RelatedWords';
import { mountQuickAccessDrawer } from './QuickAccessDrawer';
import { mountHomeWidgets } from './HomeWidgets';
import { mountRadicalHub } from './RadicalHub';
import { mountNavSections } from './NavSections';
import { mountRadicalCards } from './RadicalCards';
import { mountFastReview } from './FastReview';
import { mountFlashcardStudy } from './FlashcardStudy';
import { mountStudyProgress } from './StudyProgress';
import { mountDashboardEnhancements } from './DashboardEnhancements';
import { mountCardInteractions } from './CardInteractions';
import { mountWordIllustrations } from './WordIllustrations';
import { mountHsk30Grid } from './Hsk30Grid';
import { mountTopicGrid } from './TopicGrid';
import { mountCurriculum } from './Curriculum';
import { mountBackupSync } from './BackupSync';
import { mountAuth } from './AuthModal';
import { mountSync } from './SyncController';
import { mountThemeManager } from './ThemeManager';
import { mountSpeechAudio } from './SpeechAudio';
import { mountLevels } from './Levels';
import { mountSpaRouter } from './SpaRouter';
import { mountMobileBottomNav } from './MobileBottomNav';
import { mountAppBootstrap } from './AppBootstrap';
import { registerServiceWorker } from './ServiceWorkerManager';
import { initPwaInstallPrompt } from './PwaInstallPrompt';
import { initShareFeature } from './ShareModal';
import { db, migrateFromLocalStorage } from './db';

function mountDexieDatabase() {
  if (typeof window !== 'undefined' && db) {
    window.db = db;
    migrateFromLocalStorage(db).catch(err => {
      console.warn('Dexie auto-migration notice:', err);
    });
  }
}

mountAppUtils();
mountAppHeader(); // first DOM island: later modules look up header elements by id
mountAuth(); // sign-in dialogs; restores a Google session only when this device has one
mountSync(); // syncs progress whenever a signed-in session starts
mountAppState();
mountSrsEngine();
mountStorageEngine();
mountDexieDatabase();
mountAmbientBackground();
mountStudyHelpModal();
mountFeaturePromoModal();
mountGuessWordGame();
mountSpeedQuizGame();
mountSentenceGame();
mountVocabularyOverview();
mountMemoryCurve();
mountSidebarSearch(); // first: the dock panels below are placed relative to the search box
mountRadicalsState(); // radical state variables initialized before sidebar filter & radical hub
mountSidebarRadicalsFilter(); // before WeakWords: the weak-words panel goes right after it
mountWeakWords();
mountHanziDecomposition(); // before SidebarTabs: the initial tab may render the radicals panel
mountSidebarTabs();
mountStrokeCanvas(); // before WordCompanion: WordCompanion places itself right after #strokeCanvasWrap
mountWordCompanion(); // before GrammarBreakdown: the grammar panel goes right after it
mountGrammarBreakdown();
mountTodayReview();
mountRelatedWords();
mountQuickAccessDrawer();
mountHomeWidgets();
mountNavSections();
mountRadicalHub();
mountRadicalCards();
mountFastReview();
mountFlashcardStudy();
mountStudyProgress();
mountDashboardEnhancements();
mountCardInteractions();
mountWordIllustrations();
mountHsk30Grid();
mountTopicGrid();
mountCurriculum(); // after AppState: registers lesson decks in LEVELS before the router restores a deep link
mountBackupSync();
mountThemeManager();
mountSpeechAudio();
mountLevels();
mountSpaRouter();
mountMobileBottomNav();
mountAppBootstrap();
registerServiceWorker();
initPwaInstallPrompt();
initShareFeature();
