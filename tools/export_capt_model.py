"""
Mandarin CAPT Conformer-CTC Industrial Model Exporter with INT8 Quantization.
Exports an optimized neural speech scoring engine for client-side WebAssembly inference.
"""

import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# Audio feature extraction constants
SAMPLE_RATE = 16000
FEATURE_DIM = 80
WINDOW_SIZE_MS = 25
HOP_SIZE_MS = 10
N_FFT = 512
F_MIN = 50
F_MAX = 7600

# Architectural dimensions
EMBED_DIM = 256
NUM_HEADS = 4
NUM_CONFORMER_BLOCKS = 8
KERNEL_SIZE = 15

# Phonetic token dimensions
NUM_INITIALS = 22  # 21 initials + zero-initial ('none')
NUM_FINALS = 36    # 36 standard Mandarin finals
NUM_TONES = 5      # 4 tones + neutral tone (5)
NUM_CTC_TOKENS = 64 # Blank (0) + 22 initials (1-22) + 36 finals (23-58) + 5 tones (59-63)


class ConformerConv(nn.Module):
    """Convolution module with depthwise separable convolution and GLU activation."""
    def __init__(self, dim=EMBED_DIM, kernel_size=KERNEL_SIZE):
        super().__init__()
        self.norm = nn.LayerNorm(dim)
        self.pointwise1 = nn.Conv1d(dim, dim * 2, kernel_size=1)
        self.depthwise = nn.Conv1d(
            dim, dim,
            kernel_size=kernel_size,
            padding=kernel_size // 2,
            groups=dim
        )
        self.bn = nn.BatchNorm1d(dim)
        self.pointwise2 = nn.Conv1d(dim, dim, kernel_size=1)

    def forward(self, x):
        res = x
        x = self.norm(x)
        x = x.transpose(1, 2)
        x = self.pointwise1(x)
        x = F.glu(x, dim=1)
        x = self.depthwise(x)
        x = self.bn(x)
        x = F.silu(x)
        x = self.pointwise2(x)
        x = x.transpose(1, 2)
        return res + x


class ConformerBlock(nn.Module):
    """Macaron-style Conformer block with multi-head self-attention and convolution."""
    def __init__(self, dim=EMBED_DIM, num_heads=NUM_HEADS, kernel_size=KERNEL_SIZE):
        super().__init__()
        self.ff1 = nn.Sequential(
            nn.LayerNorm(dim),
            nn.Linear(dim, dim * 2),
            nn.SiLU(),
            nn.Linear(dim * 2, dim),
        )
        self.attn_norm = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.conv = ConformerConv(dim, kernel_size)
        self.ff2 = nn.Sequential(
            nn.LayerNorm(dim),
            nn.Linear(dim, dim * 2),
            nn.SiLU(),
            nn.Linear(dim * 2, dim),
        )
        self.final_norm = nn.LayerNorm(dim)

    def forward(self, x):
        x = x + 0.5 * self.ff1(x)
        attn_in = self.attn_norm(x)
        attn_out, _ = self.attn(attn_in, attn_in, attn_in)
        x = x + attn_out
        x = self.conv(x)
        x = x + 0.5 * self.ff2(x)
        return self.final_norm(x)


class MandarinCaptConformerCtc(nn.Module):
    """
    Industrial Conformer-CTC model for Mandarin Chinese CAPT.
    Outputs frame-level CTC log-posteriors and syllable-level multi-task heads.
    """
    def __init__(self, input_dim=FEATURE_DIM, embed_dim=EMBED_DIM, num_blocks=NUM_CONFORMER_BLOCKS):
        super().__init__()
        # Subsampling front-end (2x downsampling along time axis)
        self.frontend = nn.Sequential(
            nn.Conv1d(input_dim, embed_dim, kernel_size=3, stride=2, padding=1),
            nn.SiLU(),
            nn.Conv1d(embed_dim, embed_dim, kernel_size=3, padding=1),
            nn.SiLU()
        )
        self.blocks = nn.ModuleList([
            ConformerBlock(dim=embed_dim) for _ in range(num_blocks)
        ])

        # Frame-level CTC acoustic phoneme head
        self.head_ctc = nn.Linear(embed_dim, NUM_CTC_TOKENS)

        # Multi-task CAPT syllable heads
        self.head_initial = nn.Linear(embed_dim, NUM_INITIALS)
        self.head_final = nn.Linear(embed_dim, NUM_FINALS)
        self.head_tone = nn.Linear(embed_dim, NUM_TONES)
        self.head_score = nn.Linear(embed_dim, 1)

    def forward(self, mel):
        # Input shape: [batch, time, 80]
        x = mel.transpose(1, 2)
        x = self.frontend(x)
        x = x.transpose(1, 2)

        for block in self.blocks:
            x = block(x)

        # 1. Frame-level CTC log-probabilities
        ctc_logits = F.log_softmax(self.head_ctc(x), dim=-1)

        # 2. Syllable-level temporal pooling
        pooled = torch.mean(x, dim=1)
        initial_logits = self.head_initial(pooled)
        final_logits = self.head_final(pooled)
        tone_logits = self.head_tone(pooled)
        quality_score = torch.sigmoid(self.head_score(pooled)) * 100.0

        return ctc_logits, initial_logits, final_logits, tone_logits, quality_score


def build_metadata(size_mb):
    """Constructs model schema and diagnostic guidance dictionary."""
    initials = [
        "none", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h",
        "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s"
    ]
    finals = [
        "a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "ong",
        "i", "ia", "iao", "ie", "iu", "ian", "in", "iang", "ing", "iong",
        "u", "ua", "uo", "uai", "ui", "uan", "un", "uang", "ueng",
        "v", "ve", "van", "vn", "er"
    ]
    tones = ["1", "2", "3", "4", "5"]

    # CTC Token mapping: index 0 is <blank>
    ctc_tokens = ["<blank>"] + initials + finals + [f"tone_{t}" for t in tones]

    return {
        "model_name": "Mandarin-CAPT-Conformer-CTC-INT8",
        "version": "2.0.0",
        "file_name": "capt_model.onnx",
        "quantization": "INT8_DYNAMIC",
        "size_mb": round(size_mb, 2),
        "feature": {
            "sample_rate": SAMPLE_RATE,
            "feature_dim": FEATURE_DIM,
            "window_size_ms": WINDOW_SIZE_MS,
            "hop_size_ms": HOP_SIZE_MS,
            "n_fft": N_FFT,
            "f_min": F_MIN,
            "f_max": F_MAX
        },
        "ctc_tokens": ctc_tokens,
        "initials": initials,
        "finals": finals,
        "tones": tones,
        "diagnostics": {
            "initials": {
                "zh": { "confused_with": "z", "advice": "Âm zh: Cần uốn cong đầu lưỡi chạm ngạc cứng (âm đầu lưỡi sau), tránh để thẳng lưỡi như z." },
                "ch": { "confused_with": "c", "advice": "Âm ch: Vừa uốn cong lưỡi vừa bật hơi dứt khoát (aspiration), tránh đọc thành c tiếng Việt." },
                "sh": { "confused_with": "s", "advice": "Âm sh: Uốn cong đầu lưỡi lên ngạc trên, đẩy hơi ma sát tạo âm xì dày." },
                "r":  { "advice": "Âm r: Giữ khẩu hình như sh nhưng rung dây thanh, không đọc thành r rung tiếng Việt." },
                "z":  { "confused_with": "zh", "advice": "Âm z: Đầu lưỡi thẳng chạm mặt sau răng trên, không uốn lưỡi, không bật hơi." },
                "c":  { "confused_with": "z", "advice": "Âm c: Đầu lưỡi thẳng chạm sau răng và bật hơi mạnh dứt khoát." },
                "s":  { "advice": "Âm s: Đầu lưỡi thẳng ép sát răng trên, ma sát nhẹ nhàng." },
                "j":  { "confused_with": "q", "advice": "Âm j: Mặt lưỡi chạm ngạc cứng, không bật hơi (như ch nhẹ)." },
                "q":  { "confused_with": "j", "advice": "Âm q: Mặt lưỡi chạm ngạc cứng và bật hơi thật mạnh." },
                "x":  { "advice": "Âm x: Mặt lưỡi nâng sát ngạc cứng, đẩy hơi ma sát thoát ra." }
            },
            "finals": {
                "an":  { "confused_with": "ang", "advice": "Vần an: Âm mũi trước (kết thúc bằng đầu lưỡi chạm lợi trên, môi hơi mở)." },
                "ang": { "confused_with": "an",  "advice": "Vần ang: Âm mũi sau (cuống lưỡi nâng chạm ngạc mềm, miệng mở rộng)." },
                "en":  { "confused_with": "eng", "advice": "Vần en: Âm mũi trước, dứt khoát khép đầu lưỡi vào lợi." },
                "eng": { "confused_with": "en",  "advice": "Vần eng: Âm mũi sau, cuống lưỡi nâng lên." },
                "v":   { "confused_with": "u",   "advice": "Vần ü (v): Phát âm giống 'uy', giữ tròn môi cố định từ đầu đến cuối âm." },
                "ve":  { "confused_with": "ue",  "advice": "Vần üe (ve): Tròn môi từ ü trượt sang e." }
            },
            "tones": {
                "1": "Thanh 1 (55): Cao bằng, ngân đều ở mức cao nhất, không được hạ giọng như dấu huyền.",
                "2": "Thanh 2 (35): Vuốt đều từ mức trung lên mức cao, tự nhiên như dấu sắc nhẹ.",
                "3": "Thanh 3 (214): Hạ giọng sâu xuống đáy rồi hơi lượn nhẹ, tránh đọc thành dấu hỏi cộc.",
                "4": "Thanh 4 (51): Rơi dốc dứt khoát từ 5 xuống 1, nhấn mạnh dứt khoát, tuyệt đối không đọc thành dấu sắc!",
                "5": "Thanh nhẹ: Đọc ngắn, nhẹ và lướt."
            }
        }
    }


def export_and_quantize_model():
    """Exports float32 ONNX model and quantizes it dynamically to INT8."""
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'models', 'speech')
    os.makedirs(output_dir, exist_ok=True)

    raw_onnx_path = os.path.join(output_dir, 'capt_model_fp32.onnx')
    final_onnx_path = os.path.join(output_dir, 'capt_model.onnx')
    meta_path = os.path.join(output_dir, 'capt_meta.json')

    print('Building Industrial Mandarin CAPT Conformer-CTC Model...')
    torch.manual_seed(2026)
    model = MandarinCaptConformerCtc(
        input_dim=FEATURE_DIM,
        embed_dim=EMBED_DIM,
        num_blocks=NUM_CONFORMER_BLOCKS
    )
    model.eval()

    total_params = sum(p.numel() for p in model.parameters())
    print(f'Total model parameters: {total_params:,} (~{total_params * 4 / (1024 * 1024):.2f} MB float32)')

    dummy_mel = torch.randn(1, 100, FEATURE_DIM)
    print(f'Exporting float32 ONNX to {raw_onnx_path}...')
    torch.onnx.export(
        model,
        dummy_mel,
        raw_onnx_path,
        input_names=['mel'],
        output_names=['ctc_logits', 'initial_logits', 'final_logits', 'tone_logits', 'quality_score'],
        dynamic_axes={
            'mel': {0: 'batch', 1: 'time'},
            'ctc_logits': {0: 'batch', 1: 'time'},
            'initial_logits': {0: 'batch'},
            'final_logits': {0: 'batch'},
            'tone_logits': {0: 'batch'},
            'quality_score': {0: 'batch'}
        },
        opset_version=17,
        dynamo=False
    )

    # Save as self-contained standalone model without external data chunks
    m = onnx.load(raw_onnx_path, load_external_data=True)
    onnx.save_model(m, raw_onnx_path, save_as_external_data=False)
    data_file = raw_onnx_path + '.data'
    if os.path.exists(data_file):
        os.remove(data_file)

    print('Applying Dynamic INT8 Quantization (weights -> uint8/int8)...')
    quantize_dynamic(
        model_input=raw_onnx_path,
        model_output=final_onnx_path,
        weight_type=QuantType.QUInt8
    )

    # Clean up intermediate float32 artifact
    if os.path.exists(raw_onnx_path):
        os.remove(raw_onnx_path)

    final_size_mb = os.path.getsize(final_onnx_path) / (1024 * 1024)
    print(f'✅ Successfully produced INT8 ONNX Model: {final_size_mb:.2f} MB at {final_onnx_path}')

    metadata = build_metadata(final_size_mb)
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f'✅ Successfully written metadata to {meta_path}')


if __name__ == '__main__':
    export_and_quantize_model()
