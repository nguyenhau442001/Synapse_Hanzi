#!/usr/bin/env python3
"""Regenerate failing Tier 2 illustrations in clean editorial SVG style.

Writes updated 240x240 data-style="editorial" SVGs to every path listed in
each WordAuditRecord and updates database/audit/illustration_audit.json status
to "regenerated".
"""

import json
from pathlib import Path

AUDIT_PATH = Path("database/audit/illustration_audit.json")

BG_AND_SHADOW = (
    '<rect width="240" height="240" fill="#F4EDE2"/>'
    '<ellipse cx="120" cy="208" rx="88" ry="9" fill="#E3D5C1"/>'
)


def wrap_editorial(body: str) -> str:
    """Wrap inner SVG markup with the standard 240x240 editorial canvas."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" '
        f'data-style="editorial">{BG_AND_SHADOW}{body}</svg>'
    )


TIER2_ARTWORKS: dict[str, str] = {
    "不但…而且…": wrap_editorial(
        '<rect x="44" y="88" width="58" height="72" rx="8" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M58 124 L68 134 L86 112" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M112 124 H128 M120 116 V132" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
        '<rect x="138" y="68" width="58" height="92" rx="8" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<polygon points="167,88 171,98 181,98 173,104 176,114 167,108 158,114 161,104 153,98 163,98" fill="#FFFFFF"/>'
    ),
    "之": wrap_editorial(
        '<rect x="48" y="74" width="66" height="92" rx="6" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M62 96 H100 M62 114 H100 M62 132 H90" stroke="#C5B9A5" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M114 118 Q130 104 146 118" fill="none" stroke="#D96B43" stroke-width="3.5" stroke-linecap="round"/>'
        '<rect x="146" y="88" width="46" height="64" rx="6" fill="#E39A62" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="169" cy="120" r="10" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.5"/>'
    ),
    "之中": wrap_editorial(
        '<circle cx="64" cy="120" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="92" cy="94" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="148" cy="94" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="176" cy="120" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="92" cy="146" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="148" cy="146" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="120" cy="120" r="18" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="120" cy="120" r="26" fill="none" stroke="#E39A62" stroke-width="2.5" stroke-dasharray="4 4"/>'
    ),
    "以外": wrap_editorial(
        '<circle cx="96" cy="120" r="48" fill="#FFFFFF" fill-opacity="0.5" stroke="#3A332D" stroke-width="2.8" stroke-dasharray="6 5"/>'
        '<circle cx="80" cy="108" r="12" fill="#7E9C86" stroke="#3A332D" stroke-width="2.5"/>'
        '<circle cx="112" cy="108" r="12" fill="#7E9C86" stroke="#3A332D" stroke-width="2.5"/>'
        '<circle cx="96" cy="138" r="12" fill="#7E9C86" stroke="#3A332D" stroke-width="2.5"/>'
        '<circle cx="178" cy="120" r="16" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M148 120 H158 M152 114 L160 120 L152 126" fill="none" stroke="#D96B43" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "只有…才…": wrap_editorial(
        '<rect x="122" y="96" width="56" height="68" rx="8" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M134 96 V78 A16 16 0 0 1 166 78 V96" fill="none" stroke="#3A332D" stroke-width="5"/>'
        '<circle cx="150" cy="126" r="7" fill="#3A332D"/><path d="M150 132 V144" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
        '<circle cx="68" cy="126" r="14" fill="none" stroke="#D96B43" stroke-width="4.5"/>'
        '<path d="M82 126 H112 M102 126 V136 M110 126 V134" stroke="#D96B43" stroke-width="4" stroke-linecap="round"/>'
    ),
    "只（副词）": wrap_editorial(
        '<ellipse cx="120" cy="160" rx="74" ry="18" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="82" cy="138" r="14" fill="none" stroke="#C5B9A5" stroke-width="2.5" stroke-dasharray="4 4"/>'
        '<circle cx="158" cy="138" r="14" fill="none" stroke="#C5B9A5" stroke-width="2.5" stroke-dasharray="4 4"/>'
        '<circle cx="120" cy="136" r="18" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M120 118 Q126 108 134 112" fill="none" stroke="#7E9C86" stroke-width="3" stroke-linecap="round"/>'
    ),
    "完全": wrap_editorial(
        '<circle cx="120" cy="116" r="52" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="120" cy="116" r="40" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M100 116 L114 130 L142 100" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "得（助动词）": wrap_editorial(
        '<circle cx="100" cy="84" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M84 102 H116 L122 148 H78 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M90 148 L76 188 M110 148 L128 188" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="164" cy="82" r="22" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M164 82 V68 M164 82 L176 82" stroke="#D96B43" stroke-width="3" stroke-linecap="round"/>'
        '<path d="M148 58 L156 52 M180 58 L172 52" stroke="#E39A62" stroke-width="3" stroke-linecap="round"/>'
    ),
    "百分之": wrap_editorial(
        '<circle cx="120" cy="116" r="50" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M120 116 L120 66 A50 50 0 1 1 70 116 Z" fill="#D96B43" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
        '<path d="M120 116 L70 116 A50 50 0 0 1 120 66 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
    ),
    "省¹": wrap_editorial(
        '<ellipse cx="120" cy="134" rx="50" ry="38" fill="#E39A62" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="164" y="124" width="14" height="18" rx="4" fill="#F0C7AE" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M92 168 V186 M148 168 V186" stroke="#3A332D" stroke-width="6" stroke-linecap="round"/>'
        '<line x1="108" y1="102" x2="132" y2="102" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
        '<circle cx="120" cy="72" r="12" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M120 86 V96" stroke="#D96B43" stroke-width="2.8" stroke-dasharray="3 3" stroke-linecap="round"/>'
    ),
    "花（动词）": wrap_editorial(
        '<rect x="52" y="106" width="76" height="58" rx="8" fill="#A08B73" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M136 130 H164 M156 122 L166 130 L156 138" fill="none" stroke="#D96B43" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
        '<circle cx="182" cy="116" r="12" fill="#E39A62" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="182" cy="144" r="12" fill="#E39A62" stroke="#3A332D" stroke-width="2.6"/>'
    ),
    "不便": wrap_editorial(
        '<rect x="136" y="74" width="52" height="114" rx="4" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
        '<line x1="156" y1="74" x2="156" y2="188" stroke="#3A332D" stroke-width="2.5" stroke-dasharray="5 5"/>'
        '<circle cx="82" cy="96" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M66 114 H98 L102 160 H62 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M72 160 V190 M92 160 V190" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<rect x="92" y="114" width="38" height="34" rx="4" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
    ),
    "东部": wrap_editorial(
        '<circle cx="106" cy="122" r="46" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<polygon points="106,112 144,122 106,132" fill="#D96B43" stroke="#3A332D" stroke-width="2.4" stroke-linejoin="round"/>'
        '<polygon points="106,112 68,122 106,132" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.4" stroke-linejoin="round"/>'
        '<circle cx="176" cy="84" r="16" fill="#E39A62" stroke="#3A332D" stroke-width="2.6"/>'
        '<path d="M176 58 V64 M176 104 V110 M150 84 H156 M196 84 H202" stroke="#E39A62" stroke-width="2.8" stroke-linecap="round"/>'
    ),
    "中": wrap_editorial(
        '<rect x="46" y="96" width="36" height="48" rx="6" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="98" y="84" width="44" height="72" rx="8" fill="#D96B43" stroke="#3A332D" stroke-width="3.2"/>'
        '<rect x="158" y="96" width="36" height="48" rx="6" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M120 60 V74 M114 68 L120 76 L126 68" fill="none" stroke="#3A332D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "之¹": wrap_editorial(
        '<rect x="50" y="76" width="64" height="88" rx="6" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M64 98 H100 M64 116 H100 M64 134 H92" stroke="#C5B9A5" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M114 118 H144" stroke="#D96B43" stroke-width="3" stroke-dasharray="4 4" stroke-linecap="round"/>'
        '<path d="M148 108 H186 V134 Q186 150 167 150 Q148 150 148 134 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
    ),
    "于是": wrap_editorial(
        '<rect x="48" y="88" width="32" height="72" rx="4" fill="#8CA3B5" stroke="#3A332D" stroke-width="2.8" transform="rotate(14 64 124)"/>'
        '<rect x="104" y="88" width="32" height="72" rx="4" fill="#E39A62" stroke="#3A332D" stroke-width="2.8" transform="rotate(14 120 124)"/>'
        '<rect x="160" y="88" width="32" height="72" rx="4" fill="#D96B43" stroke="#3A332D" stroke-width="2.8" transform="rotate(14 176 124)"/>'
    ),
    "亚洲": wrap_editorial(
        '<circle cx="120" cy="116" r="54" fill="#8CA3B5" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M100 76 Q132 72 154 94 Q166 116 146 138 Q128 150 112 132 Q94 120 100 76 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="2.6" stroke-linejoin="round"/>'
        '<circle cx="136" cy="108" r="5" fill="#D96B43"/>'
    ),
    "产生": wrap_editorial(
        '<path d="M84 168 Q120 156 156 168" fill="none" stroke="#A08B73" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M120 162 V104" stroke="#7E9C86" stroke-width="4" stroke-linecap="round"/>'
        '<path d="M120 126 Q90 116 86 94 Q114 96 120 126 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
        '<path d="M120 114 Q150 104 154 82 Q126 84 120 114 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
        '<circle cx="120" cy="64" r="10" fill="#E39A62"/>'
    ),
    "从来": wrap_editorial(
        '<line x1="48" y1="116" x2="192" y2="116" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
        '<circle cx="64" cy="116" r="12" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8"/>'
        '<circle cx="102" cy="116" r="12" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8"/>'
        '<circle cx="140" cy="116" r="12" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8"/>'
        '<circle cx="178" cy="116" r="12" fill="#D96B43" stroke="#3A332D" stroke-width="2.8"/>'
    ),
    "会²": wrap_editorial(
        '<circle cx="120" cy="86" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M104 106 H136 L140 144 H100 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<rect x="66" y="144" width="108" height="34" rx="6" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M84 144 V162 M102 144 V162 M120 144 V162 M138 144 V162 M156 144 V162" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
    ),
    "便于": wrap_editorial(
        '<polygon points="56,164 184,164 184,104" fill="#D2C2AA" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<rect x="92" y="102" width="34" height="34" rx="5" fill="#7E9C86" stroke="#3A332D" stroke-width="3" transform="rotate(-25 109 119)"/>'
        '<path d="M74 96 L112 78 M104 72 L114 77 L108 88" fill="none" stroke="#D96B43" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "其他": wrap_editorial(
        '<rect x="52" y="96" width="36" height="48" rx="6" fill="#8CA3B5" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="96" y="96" width="36" height="48" rx="6" fill="#8CA3B5" stroke="#3A332D" stroke-width="2.8"/>'
        '<circle cx="168" cy="120" r="24" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="168" cy="120" r="32" fill="none" stroke="#E39A62" stroke-width="2.4" stroke-dasharray="4 4"/>'
    ),
    "其实": wrap_editorial(
        '<path d="M60 66 H180 V164 Q150 154 120 164 Q90 154 60 164 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M110 66 Q140 116 176 162 L180 164 V66 Z" fill="#F4EDE2" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<circle cx="152" cy="116" r="18" fill="#E39A62" stroke="#3A332D" stroke-width="2.8"/>'
    ),
    "内": wrap_editorial(
        '<path d="M64 96 V172 H176 V96" fill="#FFFFFF" stroke="#3A332D" stroke-width="3.5" stroke-linejoin="round"/>'
        '<circle cx="120" cy="136" r="22" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M120 62 V98 M110 88 L120 100 L130 88" fill="none" stroke="#7E9C86" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "再说": wrap_editorial(
        '<rect x="56" y="76" width="74" height="82" rx="8" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="56" y="76" width="74" height="22" rx="6" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M142 118 H184 M174 108 L186 118 L174 128" fill="none" stroke="#D96B43" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "冷静": wrap_editorial(
        '<circle cx="120" cy="86" r="18" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M111 86 Q114 90 117 86 M123 86 Q126 90 129 86 M115 94 Q120 97 125 94" fill="none" stroke="#3A332D" stroke-width="2.4" stroke-linecap="round"/>'
        '<path d="M98 108 H142 L156 154 H84 Z" fill="#8CA3B5" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M66 172 Q120 184 174 172" fill="none" stroke="#7E9C86" stroke-width="3" stroke-linecap="round"/>'
    ),
    "刚才": wrap_editorial(
        '<circle cx="120" cy="116" r="46" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M120 116 V82 M120 116 L142 128" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M120 60 A56 56 0 0 0 68 96" fill="none" stroke="#D96B43" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M64 82 L66 98 L82 94" fill="none" stroke="#D96B43" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "到底": wrap_editorial(
        '<path d="M56 164 Q80 164 80 132 Q80 100 116 100 Q144 100 144 74 H174" fill="none" stroke="#8CA3B5" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M174 58 V104" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<polygon points="174,58 198,68 174,78" fill="#D96B43" stroke="#3A332D" stroke-width="2.5" stroke-linejoin="round"/>'
    ),
    "力气": wrap_editorial(
        '<circle cx="120" cy="76" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M102 96 H138 L142 146 H98 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M106 146 V186 M134 146 V186" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M102 104 L76 114 L76 92" fill="none" stroke="#3A332D" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M138 104 L164 114 L164 92" fill="none" stroke="#3A332D" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>'
        '<circle cx="64" cy="92" r="14" fill="#7D7871" stroke="#3A332D" stroke-width="2.8"/>'
        '<circle cx="176" cy="92" r="14" fill="#7D7871" stroke="#3A332D" stroke-width="2.8"/>'
    ),
    "南部": wrap_editorial(
        '<circle cx="120" cy="96" r="42" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<polygon points="110,96 120,132 130,96" fill="#D96B43" stroke="#3A332D" stroke-width="2.4" stroke-linejoin="round"/>'
        '<polygon points="110,96 120,60 130,96" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.4" stroke-linejoin="round"/>'
        '<path d="M88 164 Q120 148 152 164" fill="none" stroke="#7E9C86" stroke-width="5" stroke-linecap="round"/>'
    ),
    "卫生": wrap_editorial(
        '<rect x="92" y="102" width="56" height="72" rx="10" fill="#8CA3B5" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="108" y="84" width="24" height="18" rx="4" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M120 72 V84 M120 72 H136" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="68" cy="96" r="10" fill="#FFFFFF" stroke="#7E9C86" stroke-width="2.6"/>'
        '<circle cx="172" cy="112" r="12" fill="#FFFFFF" stroke="#7E9C86" stroke-width="2.6"/>'
        '<circle cx="78" cy="144" r="7" fill="#FFFFFF" stroke="#7E9C86" stroke-width="2.4"/>'
    ),
    "印象": wrap_editorial(
        '<rect x="64" y="138" width="112" height="32" rx="6" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M96 138 Q120 124 144 138" fill="#A08B73" stroke="#3A332D" stroke-width="2.4"/>'
        '<rect x="104" y="64" width="32" height="44" rx="6" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="92" y="108" width="56" height="12" rx="3" fill="#3A332D"/>'
    ),
    "却": wrap_editorial(
        '<rect x="164" y="68" width="16" height="104" rx="4" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M56 102 H144 Q156 102 156 120 Q156 138 144 138 H74" fill="none" stroke="#D96B43" stroke-width="5" stroke-linecap="round"/>'
        '<path d="M84 128 L70 138 L84 148" fill="none" stroke="#D96B43" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "另外": wrap_editorial(
        '<rect x="52" y="96" width="44" height="68" rx="6" fill="#8CA3B5" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="62" y="88" width="44" height="68" rx="6" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M120 122 H136 M128 114 V130" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<rect x="148" y="88" width="44" height="68" rx="6" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
    ),
    "呀": wrap_editorial(
        '<circle cx="120" cy="112" r="34" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="106" cy="104" r="4" fill="#3A332D"/><circle cx="134" cy="104" r="4" fill="#3A332D"/>'
        '<ellipse cx="120" cy="124" rx="8" ry="10" fill="#D96B43" stroke="#3A332D" stroke-width="2.4"/>'
        '<path d="M168 68 L164 92" stroke="#E39A62" stroke-width="5" stroke-linecap="round"/>'
        '<circle cx="163" cy="102" r="3.5" fill="#E39A62"/>'
    ),
    "员": wrap_editorial(
        '<circle cx="120" cy="96" r="18" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M98 84 Q120 66 142 84 Z" fill="#3A332D" stroke="#3A332D" stroke-width="2.5"/>'
        '<path d="M96 84 H148" stroke="#D96B43" stroke-width="4" stroke-linecap="round"/>'
        '<path d="M98 118 H142 L148 172 H92 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<rect x="122" y="132" width="16" height="10" rx="2" fill="#E39A62" stroke="#3A332D" stroke-width="2"/>'
    ),
    "复杂": wrap_editorial(
        '<circle cx="92" cy="102" r="24" fill="#8CA3B5" stroke="#3A332D" stroke-width="3" stroke-dasharray="6 4"/>'
        '<circle cx="144" cy="108" r="20" fill="#E39A62" stroke="#3A332D" stroke-width="3" stroke-dasharray="6 4"/>'
        '<circle cx="114" cy="144" r="22" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-dasharray="6 4"/>'
        '<circle cx="92" cy="102" r="8" fill="#F4EDE2" stroke="#3A332D" stroke-width="2.5"/>'
        '<circle cx="144" cy="108" r="7" fill="#F4EDE2" stroke="#3A332D" stroke-width="2.5"/>'
        '<circle cx="114" cy="144" r="7" fill="#F4EDE2" stroke="#3A332D" stroke-width="2.5"/>'
    ),
    "大量": wrap_editorial(
        '<rect x="52" y="136" width="38" height="36" rx="4" fill="#E39A62" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="96" y="136" width="38" height="36" rx="4" fill="#D96B43" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="140" y="136" width="38" height="36" rx="4" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="74" y="98" width="38" height="36" rx="4" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="118" y="98" width="38" height="36" rx="4" fill="#E39A62" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="96" y="60" width="38" height="36" rx="4" fill="#D96B43" stroke="#3A332D" stroke-width="2.8"/>'
    ),
}


def main() -> None:
    payload = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
    updated = 0
    synced_files = 0

    for rec in payload["records"]:
        hanzi = rec["hanzi"]
        if hanzi not in TIER2_ARTWORKS:
            continue
        svg_content = TIER2_ARTWORKS[hanzi]
        for path_str in rec["paths"]:
            p = Path(path_str)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(svg_content, encoding="utf-8")
            synced_files += 1
        rec["status"] = "regenerated"
        updated += 1

    payload["summary"]["needs_regen_count"] = sum(
        1 for r in payload["records"] if r.get("status") == "needs_regen"
    )
    payload["summary"]["regenerated_count"] = sum(
        1 for r in payload["records"] if r.get("status") == "regenerated"
    )
    AUDIT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Regenerated {updated} Tier 2 words across {synced_files} SVG files.")


if __name__ == "__main__":
    main()
