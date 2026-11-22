/**
 * NewbieToneGuide.jsx
 * Intuitive Tone Handbook for Beginners (Newbie) learning Mandarin pronunciation.
 * Explains the Chao 5-scale pitch levels (55, 35, 214, 51), provides audio demos,
 * highlights common traps for Vietnamese learners, and connects directly to the
 * interactive pitch trainer.
 */

import { h } from 'preact';
import { speakChinese } from './SpeechAudio.js';
import { NEWBIE_TONES_DATA } from './newbieTonesData.js';

export { NEWBIE_TONES_DATA };

export function NewbieToneGuide({ onPracticeWord }) {
  const handlePlayAudio = (e, text) => {
    e.stopPropagation();
    speakChinese(text);
  };

  return (
    <div class="newbie-guide-container">
      {/* Hero explanation: What is Chao scale & 55, 35, 214, 51 */}
      <section class="newbie-hero-card">
        <div class="newbie-hero-header">
          <div class="newbie-badge">💡 Cẩm Nang Nhập Môn Thanh Điệu</div>
          <h2 class="newbie-hero-title">Giải Mã Thang 5 Độ Cao Chao (赵元任): 55, 35, 214, 51 Là Gì?</h2>
          <p class="newbie-hero-desc">
            Trong tiếng Trung, thanh điệu không phải là những dấu viết tùy ý mà là <strong>đường đi của cao độ giọng nói (pitch contour)</strong> được chuẩn hóa quốc tế theo thang 5 bậc của nhà ngôn ngữ học Triệu Nguyên Nhiệm (Y. R. Chao):
          </p>
        </div>

        {/* 5-Pitch Throat Levels Visualization */}
        <div class="newbie-throat-levels">
          <div class="throat-level-item lvl-5">
            <span class="level-badge">Mức 5</span>
            <div class="level-info">
              <strong>Đỉnh cao nhất (Cao vút)</strong>
              <small>Tông giọng cao nhất bình thường của bạn (như khi ngạc nhiên gọi to "A!")</small>
            </div>
          </div>
          <div class="throat-level-item lvl-4">
            <span class="level-badge">Mức 4</span>
            <div class="level-info">
              <strong>Hơi cao (Nửa cao)</strong>
              <small>Cao hơn giọng nói chuyện bình thường một chút</small>
            </div>
          </div>
          <div class="throat-level-item lvl-3">
            <span class="level-badge">Mức 3</span>
            <div class="level-info">
              <strong>Trung bình (Giọng nói tự nhiên)</strong>
              <small>Tông giọng nói chuyện giao tiếp hàng ngày thoải mái nhất</small>
            </div>
          </div>
          <div class="throat-level-item lvl-2">
            <span class="level-badge">Mức 2</span>
            <div class="level-info">
              <strong>Hơi trầm (Nửa thấp)</strong>
              <small>Thấp hơn giọng nói chuyện thông thường, chuẩn bị dìm giọng</small>
            </div>
          </div>
          <div class="throat-level-item lvl-1">
            <span class="level-badge">Mức 1</span>
            <div class="level-info">
              <strong>Đáy cổ họng (Rất trầm)</strong>
              <small>Tông trầm nhất bạn có thể phát ra (như tiếng ậm ừ gằn trong lồng ngực)</small>
            </div>
          </div>
        </div>

        {/* Chao Scale Numbers Rule Explanation */}
        <div class="newbie-rule-callout">
          <div class="callout-icon">📌</div>
          <div class="callout-body">
            <strong>Nguyên tắc đọc số cực dễ hiểu:</strong>
            <p>
              Mỗi con số thể hiện hành trình của dây thanh đới: <code>Số đầu = Điểm xuất phát</code>, <code>Số sau = Điểm kết thúc</code>.
            </p>
            <ul class="callout-bullets">
              <li><strong>55 (Thanh 1)</strong>: Bắt đầu ở đỉnh 5 và giữ nguyên ở đỉnh 5 (không rơi, không lên).</li>
              <li><strong>35 (Thanh 2)</strong>: Bắt đầu ở giọng thường 3 rồi vuốt vút lên đỉnh 5.</li>
              <li><strong>214 (Thanh 3)</strong>: Bắt đầu ở 2, dìm sâu xuống đáy 1 (ậm ừ), rồi mới hất nhẹ lên 4.</li>
              <li><strong>51 (Thanh 4)</strong>: Đứng tít trên đỉnh 5 và rơi dốc tự do cắm thẳng xuống đáy 1 (dứt khoát!).</li>
            </ul>
          </div>
        </div>

        {/* Master Vector Chart of 4 Tones */}
        <div class="newbie-chart-wrap">
          <h3 class="chart-title">Sơ Đồ Đường Cao Độ 4 Thanh Điệu Trên Thang 5 Cấp</h3>
          <svg class="newbie-svg-chart" viewBox="0 0 680 240" preserveAspectRatio="xMidYMid meet">
            {/* Background gridlines for levels 1 to 5 */}
            {[5, 4, 3, 2, 1].map((lvl) => {
              const y = 30 + (5 - lvl) * 45;
              const labels = {
                5: '5 - Đỉnh cao',
                4: '4 - Hơi cao',
                3: '3 - Chuẩn (Vừa)',
                2: '2 - Hơi trầm',
                1: '1 - Đáy cổ'
              };
              return (
                <g key={lvl}>
                  <line
                    x1="95"
                    y1={y}
                    x2="660"
                    y2={y}
                    stroke={lvl === 3 ? 'rgba(217, 119, 6, 0.35)' : 'rgba(168, 162, 158, 0.25)'}
                    stroke-dasharray={lvl === 3 ? 'none' : '4 4'}
                    stroke-width={lvl === 3 ? '1.5' : '1'}
                  />
                  <text
                    x="85"
                    y={y + 4}
                    fill="#78716c"
                    font-size="11.5"
                    font-weight="500"
                    text-anchor="end"
                  >
                    {labels[lvl]}
                  </text>
                </g>
              );
            })}

            {/* Tone 1: 55 Line (Blue) */}
            <path
              d="M 120 30 L 230 30"
              fill="none"
              stroke="#2563eb"
              stroke-width="5"
              stroke-linecap="round"
            />
            <circle cx="120" cy="30" r="5" fill="#2563eb" />
            <circle cx="230" cy="30" r="5" fill="#2563eb" />
            <text x="175" y="20" fill="#2563eb" font-size="13" font-weight="bold" text-anchor="middle">
              Thanh 1 [55]
            </text>

            {/* Tone 2: 35 Line (Teal) */}
            <path
              d="M 260 120 L 360 30"
              fill="none"
              stroke="#0d9488"
              stroke-width="5"
              stroke-linecap="round"
            />
            <circle cx="260" cy="120" r="5" fill="#0d9488" />
            <circle cx="360" cy="30" r="5" fill="#0d9488" />
            <text x="310" y="65" fill="#0d9488" font-size="13" font-weight="bold" text-anchor="middle">
              Thanh 2 [35]
            </text>

            {/* Tone 3: 214 Curve (Amber) */}
            <path
              d="M 390 165 C 410 185, 430 210, 450 210 C 470 210, 480 140, 500 75"
              fill="none"
              stroke="#d97706"
              stroke-width="5"
              stroke-linecap="round"
            />
            <circle cx="390" cy="165" r="5" fill="#d97706" />
            <circle cx="450" cy="210" r="5" fill="#d97706" />
            <circle cx="500" cy="75" r="5" fill="#d97706" />
            <text x="445" y="150" fill="#d97706" font-size="13" font-weight="bold" text-anchor="middle">
              Thanh 3 [214]
            </text>

            {/* Tone 4: 51 Line (Red) */}
            <path
              d="M 535 30 L 640 210"
              fill="none"
              stroke="#dc2626"
              stroke-width="5"
              stroke-linecap="round"
            />
            <circle cx="535" cy="30" r="5" fill="#dc2626" />
            <circle cx="640" cy="210" r="5" fill="#dc2626" />
            <text x="600" y="110" fill="#dc2626" font-size="13" font-weight="bold" text-anchor="middle">
              Thanh 4 [51]
            </text>
          </svg>
        </div>
      </section>

      {/* Detail Cards for All 5 Tones */}
      <section class="newbie-tones-grid">
        <h3 class="section-title">Chi Tiết Từng Thanh Điệu & Audio Thực Hành</h3>
        <div class="tones-card-list">
          {NEWBIE_TONES_DATA.map((tone) => (
            <div
              key={tone.id}
              class="newbie-tone-card"
              style={{
                borderColor: tone.borderLight,
                background: `linear-gradient(180deg, ${tone.bgLight} 0%, var(--bg-surface, #ffffff) 100%)`
              }}
            >
              <div class="card-head">
                <div class="card-tone-id" style={{ backgroundColor: tone.color }}>
                  T{tone.id}
                </div>
                <div class="card-title-group">
                  <h4 class="card-tone-name" style={{ color: tone.color }}>
                    {tone.name}
                  </h4>
                  <div class="card-pitch-label">
                    <span class="pitch-code">Độ cao: {tone.chao}</span>
                    <span class="pitch-desc">• {tone.pitchName}</span>
                  </div>
                </div>
              </div>

              <div class="card-body">
                <p class="tone-summary">{tone.summary}</p>
                <div class="tone-analogy-box">
                  <strong>💡 Mẹo cảm nhận:</strong> {tone.analogy}
                </div>
                <div class="tone-trap-box">
                  <strong>⚠️ Bẫy người Việt:</strong> {tone.vietnameseTrap}
                </div>

                <div class="exemplars-section">
                  <div class="exemplars-title">Từ vựng chuẩn mẫu (Bấm nghe audio studio):</div>
                  <div class="exemplars-chips">
                    {tone.exemplars.map((w, wIdx) => (
                      <button
                        key={wIdx}
                        type="button"
                        class="exemplar-chip"
                        onClick={(e) => handlePlayAudio(e, w.hanzi)}
                        title={`Nghe phát âm chuẩn: ${w.hanzi} (${w.pinyin})`}
                      >
                        <span class="chip-speaker">🔊</span>
                        <span class="chip-hanzi">{w.hanzi}</span>
                        <span class="chip-py">{w.pinyin}</span>
                        <span class="chip-meaning">({w.meaning})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div class="card-footer">
                <button
                  type="button"
                  class="practice-tone-btn"
                  style={{ backgroundColor: tone.color }}
                  onClick={() => onPracticeWord && onPracticeWord(tone.exemplars[0])}
                >
                  🎯 Luyện tập {tone.name.split(' ')[0]} ngay trên máy đo AI
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vietnamese Learner Traps & Antidotes Table */}
      <section class="newbie-traps-section">
        <h3 class="section-title">Bảng Đối Chiếu: Bẫy Người Việt & Bí Quyết Khắc Phục Chuẩn 100%</h3>
        <div class="traps-table-wrap">
          <table class="traps-table">
            <thead>
              <tr>
                <th>Thanh điệu</th>
                <th>Người Việt hay phát âm nhầm thành</th>
                <th>Hậu quả hiểu lầm</th>
                <th>Bí quyết phát âm chuẩn xác</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style={{ color: '#dc2626' }}>Thanh 4 [51]</strong>
                  <br /><small>bàn, shì, mài</small>
                </td>
                <td>
                  <strong>Dấu Sắc tiếng Việt</strong>
                  <br /><small>đọc thành "bán", "xí", "mái"</small>
                </td>
                <td>
                  Biến thành thanh 2 (hỏi) hoặc gây chói tai, khó nghe cho người bản xứ.
                </td>
                <td>
                  <strong>Gật đầu dứt khoát như chặt tay</strong>: Cao độ rơi từ đỉnh xuống đáy, tuyệt đối không được nhấc giọng lên.
                </td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#2563eb' }}>Thanh 1 [55]</strong>
                  <br /><small>bā, tiān, mā</small>
                </td>
                <td>
                  <strong>Thả rơi thành Dấu Huyền</strong>
                  <br /><small>đọc thành "bà", "màmà"</small>
                </td>
                <td>
                  Mất độ vang đặc trưng của tiếng Trung, nghe ủ rũ và thiếu chuẩn xác.
                </td>
                <td>
                  <strong>Giữ hơi ngang đỉnh đầu</strong>: Giữ nguyên cao độ từ đầu đến cuối như kéo dài một nốt nhạc cao.
                </td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#d97706' }}>Thanh 3 [214]</strong>
                  <br /><small>bǎi, mǎi, wǒ</small>
                </td>
                <td>
                  <strong>Dấu Hỏi giật cộc</strong>
                  <br /><small>đọc thành "bải", "mải"</small>
                </td>
                <td>
                  Gây hẫng âm tiết, khiến câu văn nói bị giật cục và rời rạc.
                </td>
                <td>
                  <strong>Dìm sâu xuống đáy cổ họng</strong>: Quan trọng nhất là điểm trũng (mức 1). Khi nói nhanh, chỉ cần hạ giọng xuống 1 là đạt.
                </td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#7c3aed' }}>Biến điệu 3 + 3</strong>
                  <br /><small>nǐ hǎo, lǎoshī hǎo</small>
                </td>
                <td>
                  <strong>Đọc đè 2 thanh 3 nặng nề</strong>
                  <br /><small>đọc "nỉ hảo" rất gượng</small>
                </td>
                <td>
                  Mỏi miệng và sai ngữ âm tự nhiên của người bản xứ.
                </td>
                <td>
                  <strong>Quy tắc Sandhi</strong>: Thanh 3 đứng trước tự động đổi thành Thanh 2: <code>nǐ hǎo → ní hǎo</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Final Action CTA Banner */}
      <section class="newbie-cta-banner">
        <div class="cta-content">
          <h4>Bạn đã sẵn sàng làm chủ 4 thanh điệu?</h4>
          <p>
            Hãy bước vào Phòng Luyện Nói AI để thử giọng, nhìn thấy đường cong cao độ F0 thời gian thực và nhận chấm điểm chính xác từ mô hình Neural Conformer!
          </p>
        </div>
        <button
          type="button"
          class="cta-launch-btn"
          onClick={() => onPracticeWord && onPracticeWord(NEWBIE_TONES_DATA[0].exemplars[0])}
        >
          🚀 Bắt đầu Luyện Thanh Điệu Trực Quan
        </button>
      </section>
    </div>
  );
}
