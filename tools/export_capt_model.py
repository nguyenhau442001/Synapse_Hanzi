import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F

class ConformerConv(nn.Module):
    def __init__(self, dim=168, kernel_size=15):
        super().__init__()
        self.norm = nn.LayerNorm(dim)
        self.pointwise1 = nn.Conv1d(dim, dim * 2, kernel_size=1)
        self.depthwise = nn.Conv1d(dim, dim, kernel_size=kernel_size, padding=kernel_size // 2, groups=dim)
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
    def __init__(self, dim=168, num_heads=4, kernel_size=15):
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

class MandarinCaptConformer(nn.Module):
    def __init__(self, input_dim=80, embed_dim=168, num_blocks=8):
        super().__init__()
        self.frontend = nn.Sequential(
            nn.Conv1d(input_dim, embed_dim, kernel_size=3, stride=2, padding=1),
            nn.SiLU(),
            nn.Conv1d(embed_dim, embed_dim, kernel_size=3, padding=1),
            nn.SiLU()
        )
        self.blocks = nn.ModuleList([
            ConformerBlock(dim=embed_dim) for _ in range(num_blocks)
        ])
        # Multi-task CAPT heads
        self.head_initial = nn.Linear(embed_dim, 22) # 21 initials + zero-initial
        self.head_final = nn.Linear(embed_dim, 36)   # 36 standard Mandarin finals
        self.head_tone = nn.Linear(embed_dim, 5)     # 4 tones + neutral tone
        self.head_score = nn.Linear(embed_dim, 1)    # Continuous quality score (0 - 100)

    def forward(self, mel):
        # mel: [batch, time, 80]
        x = mel.transpose(1, 2)
        x = self.frontend(x)
        x = x.transpose(1, 2)
        for block in self.blocks:
            x = block(x)
            
        pooled = torch.mean(x, dim=1)
        initial_logits = self.head_initial(pooled)
        final_logits = self.head_final(pooled)
        tone_logits = self.head_tone(pooled)
        quality_score = torch.sigmoid(self.head_score(pooled)) * 100.0
        
        return initial_logits, final_logits, tone_logits, quality_score

def export_model():
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'models', 'speech')
    os.makedirs(output_dir, exist_ok=True)
    onnx_path = os.path.join(output_dir, 'capt_model.onnx')
    meta_path = os.path.join(output_dir, 'capt_meta.json')

    print('Building Mandarin CAPT Conformer (20MB target)...')
    torch.manual_seed(42)
    model = MandarinCaptConformer(input_dim=80, embed_dim=168, num_blocks=8)
    model.eval()

    total_params = sum(p.numel() for p in model.parameters())
    print(f'Total parameters: {total_params:,} (~{total_params * 4 / (1024*1024):.2f} MB float32)')

    dummy_mel = torch.randn(1, 100, 80)
    print(f'Exporting ONNX to {onnx_path}...')
    torch.onnx.export(
        model,
        dummy_mel,
        onnx_path,
        input_names=['mel'],
        output_names=['initial_logits', 'final_logits', 'tone_logits', 'quality_score'],
        dynamic_axes={
            'mel': {0: 'batch', 1: 'time'},
            'initial_logits': {0: 'batch'},
            'final_logits': {0: 'batch'},
            'tone_logits': {0: 'batch'},
            'quality_score': {0: 'batch'}
        },
        opset_version=18
    )

    # Consolidate external data into a single standalone .onnx file for clean web caching
    import onnx
    m = onnx.load(onnx_path, load_external_data=True)
    onnx.save_model(m, onnx_path, save_as_external_data=False)
    data_file = onnx_path + '.data'
    if os.path.exists(data_file):
        os.remove(data_file)

    size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f'✅ Exported ONNX model size: {size_mb:.2f} MB')

    meta = {
        "model_name": "Mandarin-CAPT-Conformer-GOP",
        "version": "1.0.0",
        "file_name": "capt_model.onnx",
        "size_mb": round(size_mb, 2),
        "feature": {
            "sample_rate": 16000,
            "feature_dim": 80,
            "window_size_ms": 25,
            "hop_size_ms": 10,
            "n_fft": 512,
            "f_min": 50,
            "f_max": 7600
        },
        "initials": [
            "none", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h",
            "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s"
        ],
        "finals": [
            "a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "ong",
            "i", "ia", "iao", "ie", "iu", "ian", "in", "iang", "ing", "iong",
            "u", "ua", "uo", "uai", "ui", "uan", "un", "uang", "ueng",
            "v", "ve", "van", "vn", "er"
        ],
        "tones": ["1", "2", "3", "4", "5"],
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
                "v":   { "confused_with": "u",   "advice": "Vần ü (v): Phát âm giống 'uy', giữ tròn môi cố định từ đầu đến cuối âm." }
            },
            "tones": {
                "1": "Thanh 1 (55): Cao bằng, ngân đều ở mức cao nhất, không được hạ giọng như dấu huyền.",
                "2": "Thanh 2 (35): Vuốt đều từ mức trung lên mức cao, tự nhiên như dấu sắc nhẹ.",
                "3": "Thanh 3 (214): Hạ giọng sâu xuống đáy rồi hơi lượn nhẹ, tránh đọc thành dấu hỏi cộc.",
                "4": "Thanh 4 (51): Rơi dốc dứt khoát từ 5 xuống 1, nhấn mạnh và dứt khoát, tuyệt đối không đọc thành dấu sắc!",
                "5": "Thanh nhẹ: Đọc ngắn, nhẹ và lướt."
            }
        }
    }

    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f'✅ Written metadata to {meta_path}')

if __name__ == '__main__':
    export_model()
