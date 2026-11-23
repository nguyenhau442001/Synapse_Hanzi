// tools/test_hskk_exam.mjs
// Automated verification suite for HSKK Spoken Exam datasets and prebuilt audio

import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

console.log('--- Testing HSKK Spoken Exam Datasets & Prebuilt Audio ---');

const indexFile = resolve(REPO_ROOT, 'database/exams/hskk/index.json');
if (!existsSync(indexFile)) {
  console.error(`FAIL: Index file not found at ${indexFile}`);
  process.exit(1);
}

const indexData = JSON.parse(readFileSync(indexFile, 'utf-8'));
const levels = indexData.levels;
if (!levels || Object.keys(levels).length === 0) {
  console.error('FAIL: No levels found in database/exams/hskk/index.json');
  process.exit(1);
}

const expectedLevels = ['hskk_primary', 'hskk_intermediate', 'hskk_advanced'];
for (const expected of expectedLevels) {
  if (!levels[expected]) {
    console.error(`FAIL: Missing level ${expected} in HSKK index`);
    process.exit(1);
  }
}

let totalAudiosChecked = 0;
let totalQuestionsChecked = 0;

for (const [levelKey, levelConfig] of Object.entries(levels)) {
  console.log(`Checking level: ${levelConfig.name_vi} (${levelConfig.name_zh})...`);
  for (const exam of levelConfig.exams) {
    const examFilePath = resolve(REPO_ROOT, exam.file);
    if (!existsSync(examFilePath)) {
      console.error(`FAIL: Exam file not found: ${exam.file}`);
      process.exit(1);
    }

    const examData = JSON.parse(readFileSync(examFilePath, 'utf-8'));
    if (!examData.sections) {
      console.error(`FAIL: Exam ${exam.id} missing sections`);
      process.exit(1);
    }

    for (const [secKey, section] of Object.entries(examData.sections)) {
      if (!Array.isArray(section.questions)) {
        console.error(`FAIL: Section ${secKey} missing questions array`);
        process.exit(1);
      }
      for (const q of section.questions) {
        totalQuestionsChecked++;
        if (!q.id || !q.prompt_zh) {
          console.error(`FAIL: Question missing id or prompt_zh:`, q);
          process.exit(1);
        }

        if (q.audio_clip) {
          const audioPath = resolve(REPO_ROOT, q.audio_clip);
          if (!existsSync(audioPath)) {
            console.error(`FAIL: Audio clip missing for ${q.id}: ${q.audio_clip}`);
            process.exit(1);
          }
          const size = statSync(audioPath).size;
          if (size < 1000) {
            console.error(`FAIL: Audio clip too small (<1KB) for ${q.id}: ${size} bytes`);
            process.exit(1);
          }
          totalAudiosChecked++;
        }
      }
    }
  }
}

console.log(`SUCCESS: All ${totalQuestionsChecked} HSKK questions and ${totalAudiosChecked} prebuilt audio files verified perfectly.`);
