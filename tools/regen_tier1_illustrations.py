#!/usr/bin/env python3
"""Regenerate the 37 failing Tier 1 illustrations in clean editorial SVG style.

Writes updated 240x240 data-style="editorial" SVGs to every path listed in
each WordAuditRecord, updates database/audit/illustration_audit.json status to
"regenerated", and optionally renders verification contact sheets.
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


TIER1_ARTWORKS: dict[str, str] = {
    "球": wrap_editorial(
        '<circle cx="120" cy="116" r="56" fill="#D96B43" stroke="#3A332D" stroke-width="3.2"/>'
        '<path d="M64 116 H176 M120 60 V172" fill="none" stroke="#3A332D" stroke-width="3" stroke-linecap="round"/>'
        '<path d="M80 76 Q110 116 80 156 M160 76 Q130 116 160 156" fill="none" stroke="#3A332D" stroke-width="3" stroke-linecap="round"/>'
        '<path d="M46 164 Q36 144 46 122" fill="none" stroke="#E39A62" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 5"/>'
    ),
    "电话": wrap_editorial(
        '<rect x="64" y="114" width="112" height="64" rx="14" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="120" cy="146" r="18" fill="#F4EDE2" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="120" cy="146" r="6" fill="#3A332D"/>'
        '<path d="M54 96 Q54 70 120 70 Q186 70 186 96 L186 108 Q186 116 172 116 L154 116 Q146 116 146 104 Q146 94 120 94 Q94 94 94 104 Q94 116 86 116 L68 116 Q54 116 54 108 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M44 74 Q36 60 44 48 M196 74 Q204 60 196 48" fill="none" stroke="#E39A62" stroke-width="3" stroke-linecap="round"/>'
    ),
    "肉": wrap_editorial(
        '<ellipse cx="120" cy="152" rx="76" ry="24" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M64 134 Q60 96 102 88 Q154 80 174 108 Q184 128 164 146 Q136 164 94 156 Q68 152 64 134 Z" fill="#C95B48" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<circle cx="144" cy="116" r="12" fill="#FFFDF9" stroke="#3A332D" stroke-width="2.6"/>'
        '<path d="M84 116 Q104 108 120 116 M86 134 Q108 130 124 138" fill="none" stroke="#F6D5C8" stroke-width="3" stroke-linecap="round"/>'
    ),
    "羊肉": wrap_editorial(
        '<ellipse cx="120" cy="166" rx="68" ry="18" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M80 154 Q84 130 120 128 Q156 128 160 154 Q142 164 120 164 Q98 164 80 154 Z" fill="#C95B48" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M156 138 L174 124" stroke="#FFFDF9" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M156 138 L174 124" stroke="#3A332D" stroke-width="2.5" stroke-linecap="round"/>'
        '<circle cx="120" cy="76" r="24" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<circle cx="102" cy="74" r="12" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="138" cy="74" r="12" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="120" cy="82" r="12" fill="#F0C7AE" stroke="#3A332D" stroke-width="2.4"/>'
        '<circle cx="115" cy="80" r="1.8" fill="#3A332D"/><circle cx="125" cy="80" r="1.8" fill="#3A332D"/>'
    ),
    "雨": wrap_editorial(
        '<path d="M68 104 Q52 104 52 88 Q52 72 70 70 Q78 50 104 50 Q128 50 138 66 Q156 62 168 74 Q182 86 172 102 Q166 106 156 104 Z" fill="#7D7871" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M74 120 L66 138 M96 118 L88 136 M120 120 L112 138 M144 118 L136 136 M164 120 L156 138 M84 148 L76 166 M108 148 L100 166 M132 148 L124 166 M154 148 L146 166" fill="none" stroke="#6E94B2" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M84 182 Q120 156 156 182 Z" fill="#D96B43" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
        '<path d="M120 182 V198 Q120 203 114 203" fill="none" stroke="#3A332D" stroke-width="3" stroke-linecap="round"/>'
    ),
    "零": wrap_editorial(
        '<ellipse cx="120" cy="116" rx="44" ry="60" fill="none" stroke="#3A332D" stroke-width="14"/>'
        '<ellipse cx="120" cy="116" rx="44" ry="60" fill="none" stroke="#D96B43" stroke-width="7"/>'
        '<path d="M120 56 A44 60 0 0 1 164 116" fill="none" stroke="#F4EDE2" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>'
    ),
    "百": wrap_editorial(
        '<rect x="54" y="64" width="132" height="104" rx="10" fill="#E3D5C1" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="64" y="74" width="112" height="84" rx="4" fill="#F4EDE2" stroke="#3A332D" stroke-width="2.4"/>'
        '<path d="M64 96 H176 M64 116 H176 M64 136 H176" stroke="#3A332D" stroke-width="2.2"/>'
        '<circle cx="84" cy="96" r="7" fill="#D96B43" stroke="#3A332D" stroke-width="2"/>'
        '<circle cx="102" cy="96" r="7" fill="#D96B43" stroke="#3A332D" stroke-width="2"/>'
        '<circle cx="84" cy="116" r="7" fill="#7E9C86" stroke="#3A332D" stroke-width="2"/>'
        '<circle cx="102" cy="116" r="7" fill="#7E9C86" stroke="#3A332D" stroke-width="2"/>'
        '<circle cx="120" cy="116" r="7" fill="#7E9C86" stroke="#3A332D" stroke-width="2"/>'
        '<circle cx="152" cy="136" r="7" fill="#E39A62" stroke="#3A332D" stroke-width="2"/>'
        '<circle cx="134" cy="136" r="7" fill="#E39A62" stroke="#3A332D" stroke-width="2"/>'
    ),
    "白": wrap_editorial(
        '<path d="M58 148 Q46 148 46 134 Q46 118 64 116 Q72 92 100 92 Q122 92 132 108 Q148 104 160 116 Q174 128 164 146 Q158 150 148 148 Z" fill="#FFFFFF" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M138 92 Q156 64 186 76 Q174 96 160 104 Q174 110 184 118 Q160 120 144 106 Z" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
        '<circle cx="174" cy="82" r="2" fill="#3A332D"/>'
    ),
    "白色": wrap_editorial(
        '<rect x="64" y="100" width="76" height="78" rx="8" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M64 108 Q78 134 90 114 Q102 142 116 116 Q128 134 140 108" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.6" stroke-linejoin="round"/>'
        '<path d="M64 100 Q102 68 140 100" fill="none" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="152" y="72" width="24" height="36" rx="4" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<rect x="158" y="108" width="12" height="52" rx="5" fill="#E39A62" stroke="#3A332D" stroke-width="2.8"/>'
    ),
    "的": wrap_editorial(
        '<circle cx="84" cy="96" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M68 118 Q84 112 100 118 L104 160 H64 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M74 160 V192 M94 160 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<rect x="132" y="128" width="52" height="44" rx="6" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M132 144 H184 M158 128 V172" stroke="#F4EDE2" stroke-width="3"/>'
        '<path d="M100 132 Q116 124 132 140" fill="none" stroke="#3A332D" stroke-width="3" stroke-linecap="round"/>'
        '<path d="M148 116 Q158 106 168 116" fill="none" stroke="#D96B43" stroke-width="2.6" stroke-linecap="round"/>'
    ),
    "真": wrap_editorial(
        '<polygon points="120,66 154,96 120,148 86,96" fill="#8CA3B5" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M86 96 H154 M102 66 L120 96 L138 66" fill="none" stroke="#3A332D" stroke-width="2.4" stroke-linejoin="round"/>'
        '<path d="M66 66 L74 74 M174 66 L166 74 M120 46 V56 M58 104 H68 M172 104 H182" stroke="#E39A62" stroke-width="3" stroke-linecap="round"/>'
    ),
    "着": wrap_editorial(
        '<circle cx="110" cy="84" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M92 82 Q92 64 110 64 Q128 64 128 82" fill="none" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
        '<rect x="86" y="78" width="8" height="14" rx="3" fill="#D96B43" stroke="#3A332D" stroke-width="2"/>'
        '<rect x="126" y="78" width="8" height="14" rx="3" fill="#D96B43" stroke="#3A332D" stroke-width="2"/>'
        '<path d="M94 104 H126 L132 152 H88 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M100 152 L88 192 M120 152 L134 192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M150 74 V56 L166 52 V70" fill="none" stroke="#E39A62" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'
        '<circle cx="146" cy="76" r="4" fill="#E39A62"/><circle cx="162" cy="72" r="4" fill="#E39A62"/>'
    ),
    "老师": wrap_editorial(
        '<rect x="52" y="54" width="136" height="78" rx="6" fill="#5D7B67" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="88" cy="92" r="16" fill="none" stroke="#F4EDE2" stroke-width="3"/>'
        '<polygon points="140,74 162,110 118,110" fill="none" stroke="#F4EDE2" stroke-width="3" stroke-linejoin="round"/>'
        '<circle cx="96" cy="118" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M80 136 H112 L116 178 H76 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M86 178 V196 M106 178 V196" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M112 142 L144 102" stroke="#E39A62" stroke-width="3.5" stroke-linecap="round"/>'
    ),
    "词": wrap_editorial(
        '<rect x="52" y="68" width="136" height="104" rx="8" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<line x1="120" y1="68" x2="120" y2="172" stroke="#3A332D" stroke-width="2.5"/>'
        '<path d="M68 92 H104 M68 110 H104 M68 128 H96 M136 92 H172 M136 110 H172 M136 128 H164" stroke="#C5B9A5" stroke-width="4" stroke-linecap="round"/>'
        '<circle cx="152" cy="136" r="20" fill="#F4EDE2" fill-opacity="0.7" stroke="#D96B43" stroke-width="3.5"/>'
        '<line x1="166" y1="150" x2="184" y2="168" stroke="#3A332D" stroke-width="4.5" stroke-linecap="round"/>'
    ),
    "说": wrap_editorial(
        '<circle cx="80" cy="108" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M64 128 H96 L100 170 H60 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M70 170 V194 M90 170 V194" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="164" cy="108" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M148 128 H180 L184 170 H144 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M154 170 V194 M174 170 V194" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<rect x="92" y="54" width="56" height="34" rx="10" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<circle cx="106" cy="71" r="3" fill="#D96B43"/><circle cx="120" cy="71" r="3" fill="#D96B43"/><circle cx="134" cy="71" r="3" fill="#D96B43"/>'
    ),
    "课": wrap_editorial(
        '<rect x="46" y="48" width="148" height="72" rx="6" fill="#5D7B67" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="86" cy="84" r="14" fill="none" stroke="#F4EDE2" stroke-width="2.8"/>'
        '<path d="M118 72 H168 M118 88 H158 M118 104 H148" stroke="#F4EDE2" stroke-width="3" stroke-linecap="round"/>'
        '<circle cx="72" cy="144" r="11" fill="#F0C7AE" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="120" cy="144" r="11" fill="#F0C7AE" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="168" cy="144" r="11" fill="#F0C7AE" stroke="#3A332D" stroke-width="2.6"/>'
        '<rect x="48" y="158" width="144" height="30" rx="4" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
    ),
    "边": wrap_editorial(
        '<rect x="52" y="120" width="96" height="58" rx="6" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="176" cy="126" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M162 144 H190 L194 182 H158 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M168 182 V196 M184 182 V196" stroke="#3A332D" stroke-width="3.2" stroke-linecap="round"/>'
        '<path d="M126 92 H166 M156 82 L168 92 L156 102" fill="none" stroke="#D96B43" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "过去¹": wrap_editorial(
        '<path d="M88 64 H152 L126 116 L152 168 H88 L114 116 Z" fill="#F0C7AE" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M80 64 H160 M80 168 H160" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
        '<path d="M100 164 H140 L120 132 Z" fill="#E39A62"/>'
        '<path d="M64 116 A56 56 0 1 1 82 158" fill="none" stroke="#7E9C86" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="5 5"/>'
        '<path d="M56 104 L64 118 L76 108" fill="none" stroke="#7E9C86" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "过来": wrap_editorial(
        '<circle cx="74" cy="96" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M58 114 H90 L94 160 H54 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M64 160 V192 M84 160 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="168" cy="100" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M152 118 H184 L188 162 H148 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M160 162 L148 192 M176 162 L188 192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M142 134 H104 M114 124 L102 134 L114 144" fill="none" stroke="#E39A62" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "还": wrap_editorial(
        '<rect x="52" y="138" width="136" height="12" rx="4" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M64 150 V192 M176 150 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="102" cy="94" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M86 112 H118 L122 138 H82 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<rect x="136" y="122" width="34" height="16" rx="3" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="164" cy="74" r="20" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M164 74 V62 M164 74 L174 74" stroke="#D96B43" stroke-width="2.8" stroke-linecap="round"/>'
    ),
    "这么": wrap_editorial(
        '<circle cx="88" cy="96" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M72 114 H104 L108 162 H68 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M78 162 V192 M98 162 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M104 126 H134 M126 118 L136 126 L126 134" fill="none" stroke="#D96B43" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
        '<rect x="144" y="106" width="38" height="44" rx="6" fill="#E39A62" stroke="#3A332D" stroke-width="3"/>'
    ),
    "这样": wrap_editorial(
        '<circle cx="82" cy="96" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M66 114 H98 L102 162 H62 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M72 162 V192 M92 162 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="158" cy="116" r="28" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M144 116 L154 126 L172 106" fill="none" stroke="#7E9C86" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M100 128 H124" stroke="#3A332D" stroke-width="3" stroke-linecap="round"/>'
    ),
    "那个": wrap_editorial(
        '<circle cx="72" cy="100" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M56 118 H88 L92 164 H52 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M62 164 V192 M82 164 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M88 128 L142 114" stroke="#D96B43" stroke-width="3" stroke-dasharray="5 5" stroke-linecap="round"/>'
        '<rect x="150" y="92" width="42" height="52" rx="6" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="171" cy="118" r="28" fill="none" stroke="#E39A62" stroke-width="2.4" stroke-dasharray="4 4"/>'
    ),
    "那么": wrap_editorial(
        '<rect x="52" y="92" width="48" height="60" rx="6" fill="#8CA3B5" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M108 122 H134 M124 112 L136 122 L124 132" fill="none" stroke="#D96B43" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
        '<rect x="142" y="92" width="48" height="60" rx="6" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M154 122 L164 132 L180 112" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "那样": wrap_editorial(
        '<circle cx="76" cy="96" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M60 114 H92 L96 162 H56 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M66 162 V192 M86 162 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M96 124 L134 114" stroke="#E39A62" stroke-width="3" stroke-dasharray="5 5" stroke-linecap="round"/>'
        '<circle cx="164" cy="96" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M148 114 H180 L184 162 H144 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M154 162 V192 M174 162 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
    ),
    "那边": wrap_editorial(
        '<circle cx="72" cy="100" r="15" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M56 118 H88 L92 164 H52 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M62 164 V192 M82 164 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M90 124 L144 106 M136 100 L146 106 L140 116" fill="none" stroke="#E39A62" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
        '<rect x="166" y="138" width="8" height="44" fill="#A08B73" stroke="#3A332D" stroke-width="2.5"/>'
        '<circle cx="170" cy="118" r="24" fill="#7E9C86" stroke="#3A332D" stroke-width="3"/>'
    ),
    "非常": wrap_editorial(
        '<circle cx="120" cy="106" r="18" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M102 128 H138 L144 170 H96 Z" fill="#D96B43" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M102 132 L78 104 M138 132 L162 104" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M108 170 V194 M132 170 V194" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<polygon points="72,64 76,74 86,74 78,80 81,90 72,84 63,90 66,80 58,74 68,74" fill="#E39A62" stroke="#3A332D" stroke-width="2"/>'
        '<polygon points="120,44 124,54 134,54 126,60 129,70 120,64 111,70 114,60 106,54 116,54" fill="#E39A62" stroke="#3A332D" stroke-width="2"/>'
        '<polygon points="168,64 172,74 182,74 174,80 177,90 168,84 159,90 162,80 154,74 164,74" fill="#E39A62" stroke="#3A332D" stroke-width="2"/>'
    ),
    "高兴": wrap_editorial(
        '<circle cx="120" cy="76" r="18" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M112 72 Q115 68 118 72 M122 72 Q125 68 128 72" fill="none" stroke="#3A332D" stroke-width="2.4" stroke-linecap="round"/>'
        '<path d="M112 80 Q120 88 128 80 Z" fill="#D96B43" stroke="#3A332D" stroke-width="2"/>'
        '<path d="M102 98 H138 L144 142 H96 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M102 104 L76 76 M138 104 L164 76" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<path d="M108 142 L94 174 M132 142 L146 174" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="64" cy="112" r="4" fill="#D96B43"/><circle cx="176" cy="112" r="4" fill="#E39A62"/><circle cx="82" cy="52" r="4" fill="#7E9C86"/><circle cx="158" cy="52" r="4" fill="#D96B43"/>'
    ),
    "会": wrap_editorial(
        '<circle cx="84" cy="156" r="24" fill="none" stroke="#3A332D" stroke-width="3.5"/>'
        '<circle cx="156" cy="156" r="24" fill="none" stroke="#3A332D" stroke-width="3.5"/>'
        '<path d="M84 156 L112 122 H144 L156 156 M112 122 L120 156 H84" fill="none" stroke="#D96B43" stroke-width="3.2" stroke-linejoin="round"/>'
        '<circle cx="116" cy="76" r="14" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M104 94 H128 L124 122 H108 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
    ),
    "别": wrap_editorial(
        '<circle cx="120" cy="116" r="52" fill="#FFFFFF" stroke="#D96B43" stroke-width="8"/>'
        '<line x1="84" y1="80" x2="156" y2="152" stroke="#D96B43" stroke-width="8" stroke-linecap="round"/>'
        '<rect x="102" y="108" width="36" height="34" rx="10" fill="#F0C7AE" stroke="#3A332D" stroke-width="2.6"/>'
        '<path d="M106 108 V84 M115 108 V78 M124 108 V80 M133 108 V88" stroke="#3A332D" stroke-width="5" stroke-linecap="round"/>'
    ),
    "因为…所以…": wrap_editorial(
        '<rect x="40" y="76" width="66" height="84" rx="8" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M54 110 Q48 110 48 102 Q48 94 58 92 Q64 82 76 84 Q88 86 92 98 Q96 110 86 110 Z" fill="#7D7871" stroke="#3A332D" stroke-width="2.4"/>'
        '<path d="M60 120 L56 132 M74 120 L70 132 M88 120 L84 132" stroke="#6E94B2" stroke-width="2.8" stroke-linecap="round"/>'
        '<path d="M112 118 H130 M122 110 L132 118 L122 126" fill="none" stroke="#D96B43" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
        '<rect x="136" y="76" width="66" height="84" rx="8" fill="#FFFFFF" stroke="#3A332D" stroke-width="2.8"/>'
        '<path d="M148 118 Q169 94 190 118 Z" fill="#D96B43" stroke="#3A332D" stroke-width="2.6" stroke-linejoin="round"/>'
        '<path d="M169 118 V142 Q169 148 163 148" fill="none" stroke="#3A332D" stroke-width="2.8" stroke-linecap="round"/>'
    ),
    "第一": wrap_editorial(
        '<rect x="44" y="148" width="48" height="40" rx="4" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="96" y="122" width="48" height="66" rx="4" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="148" y="158" width="48" height="30" rx="4" fill="#D2C2AA" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M104 66 H136 L130 94 Q120 104 110 94 Z" fill="#E39A62" stroke="#3A332D" stroke-width="2.8" stroke-linejoin="round"/>'
        '<path d="M120 98 V114 M108 114 H132" stroke="#3A332D" stroke-width="3" stroke-linecap="round"/>'
        '<circle cx="120" cy="48" r="6" fill="#E39A62"/>'
    ),
    "不好意思": wrap_editorial(
        '<circle cx="120" cy="100" r="24" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<circle cx="104" cy="106" r="5" fill="#E39A62" opacity="0.6"/><circle cx="136" cy="106" r="5" fill="#E39A62" opacity="0.6"/>'
        '<path d="M110 96 Q113 92 116 96 M124 96 Q127 92 130 96 M114 112 Q120 108 126 112" fill="none" stroke="#3A332D" stroke-width="2.4" stroke-linecap="round"/>'
        '<path d="M150 74 Q156 84 150 88 Q144 84 150 74 Z" fill="#8CA3B5" stroke="#3A332D" stroke-width="2"/>'
        '<path d="M98 128 H142 L148 176 H92 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M98 134 L76 112 L94 96" fill="none" stroke="#3A332D" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M108 176 V196 M132 176 V196" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
    ),
    "年": wrap_editorial(
        '<rect x="64" y="72" width="112" height="106" rx="10" fill="#FFFFFF" stroke="#3A332D" stroke-width="3"/>'
        '<rect x="64" y="72" width="112" height="28" rx="8" fill="#D96B43" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M92 60 V78 M148 60 V78" stroke="#3A332D" stroke-width="4" stroke-linecap="round"/>'
        '<circle cx="90" cy="122" r="10" fill="#7E9C86"/><circle cx="120" cy="122" r="10" fill="#E39A62"/>'
        '<circle cx="150" cy="122" r="10" fill="#8CA3B5"/><circle cx="120" cy="152" r="10" fill="#D96B43"/>'
    ),
    "得": wrap_editorial(
        '<circle cx="104" cy="94" r="16" fill="#F0C7AE" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M88 114 H120 L124 162 H84 Z" fill="#7E9C86" stroke="#3A332D" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M94 162 V192 M114 162 V192" stroke="#3A332D" stroke-width="3.5" stroke-linecap="round"/>'
        '<circle cx="160" cy="108" r="22" fill="#E39A62" stroke="#3A332D" stroke-width="3"/>'
        '<path d="M150 108 L158 116 L172 100" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M120 124 L142 114" stroke="#3A332D" stroke-width="3" stroke-linecap="round"/>'
    ),
    "是": wrap_editorial(
        '<circle cx="120" cy="116" r="50" fill="#7E9C86" stroke="#3A332D" stroke-width="3.2"/>'
        '<path d="M96 116 L114 134 L148 96" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    "有些": wrap_editorial(
        '<circle cx="80" cy="112" r="14" fill="#D96B43" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="114" cy="112" r="14" fill="#D96B43" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="97" cy="142" r="14" fill="#D96B43" stroke="#3A332D" stroke-width="2.6"/>'
        '<circle cx="152" cy="112" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.4"/>'
        '<circle cx="182" cy="126" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.4"/>'
        '<circle cx="152" cy="146" r="14" fill="#D2C2AA" stroke="#3A332D" stroke-width="2.4"/>'
        '<circle cx="97" cy="124" r="42" fill="none" stroke="#E39A62" stroke-width="2.8" stroke-dasharray="5 5"/>'
    ),
}


def main() -> None:
    payload = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
    updated = 0
    synced_files = 0

    for rec in payload["records"]:
        hanzi = rec["hanzi"]
        if hanzi not in TIER1_ARTWORKS:
            continue
        svg_content = TIER1_ARTWORKS[hanzi]
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
    print(f"Regenerated {updated} Tier 1 words across {synced_files} SVG files.")


if __name__ == "__main__":
    main()
