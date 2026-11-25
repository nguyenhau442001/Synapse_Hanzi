import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_TUTOR_PROMPT_DATA, AI_TUTOR_UI_LABELS } from '../src/islands/AiTutorPromptConstants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 1. Validate data contract
assert.equal(AI_TUTOR_PROMPT_DATA.id, 'hsk4_hskk_live_tutor');
assert.ok(AI_TUTOR_PROMPT_DATA.systemPrompt.includes('HSK 3.0 Cấp 4'), 'System prompt should target HSK 3.0 Cấp 4');
assert.ok(AI_TUTOR_PROMPT_DATA.systemPrompt.includes('HSKK Trung cấp'), 'System prompt should target HSKK Intermediate');
assert.equal(AI_TUTOR_PROMPT_DATA.setupSteps.length, 3, 'Setup guide should have 3 steps');
assert.equal(AI_TUTOR_PROMPT_DATA.practiceModes.length, 3, 'Practice modes should cover all 3 drills');
assert.equal(AI_TUTOR_PROMPT_DATA.correctionRules.length, 3, 'Correction rules should have 3 items');
assert.ok(AI_TUTOR_UI_LABELS.COPY_BTN_IDLE.length > 0);

// 2. Verify component and integration wiring on disk
const guideSource = fs.readFileSync(path.join(rootDir, 'src/islands/AiTutorPromptGuide.jsx'), 'utf8');
assert.ok(guideSource.includes('AI_TUTOR_PROMPT_DATA'), 'AiTutorPromptGuide must use AI_TUTOR_PROMPT_DATA');
assert.ok(guideSource.includes('APP_TIMEOUTS.TOAST_DURATION_MS'), 'AiTutorPromptGuide must use APP_TIMEOUTS');

const speakingSource = fs.readFileSync(path.join(rootDir, 'src/islands/SpeakingPractice.jsx'), 'utf8');
assert.ok(speakingSource.includes('AiTutorPromptGuide'), 'SpeakingPractice must integrate AiTutorPromptGuide');

const examSource = fs.readFileSync(path.join(rootDir, 'src/islands/Hsk30ExamView.jsx'), 'utf8');
assert.ok(examSource.includes('AiTutorPromptGuide'), 'Hsk30ExamView must integrate AiTutorPromptGuide');

console.log('✓ AiTutorPromptGuide data contract & integration tests passed');
