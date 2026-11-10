"""Writes public/estimator/roofing/placeholder/<material>-<colour>.svg: a simple
elevation drawing of one house with the roof in each material and colour. They
are the roofing funnel's fallbacks while the photos
(scripts/generate-roofing-funnel-photos.mjs) do not exist yet.

    python3 scripts/roofing-placeholders.py
"""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'estimator', 'roofing', 'placeholder')

COLOURS = {
    'asphalt': {'charcoal': '#3b3d40', 'weathered_wood': '#6b5b4b', 'pewter': '#9a9ea3'},
    'tile': {'terracotta': '#b5532f', 'sandstone': '#c9a678', 'slate_grey': '#5d6468'},
    'metal': {'matte_black': '#25272a', 'dark_bronze': '#4a3a2c', 'galvalume': '#b9bec3'},
}


def texture(material):
    if material == 'asphalt':
        return ''.join(f'<line x1="0" y1="{y}" x2="1200" y2="{y}" stroke="#000" stroke-opacity=".18" stroke-width="2"/>' for y in range(150, 420, 18))
    if material == 'tile':
        wave = ' '.join('q15 14 30 0' for _ in range(40))
        return ''.join(f'<path d="M0 {y} {wave}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="3"/>' for y in range(150, 420, 22))
    return ''.join(f'<line x1="{x}" y1="0" x2="{x}" y2="800" stroke="#fff" stroke-opacity=".22" stroke-width="3"/>' for x in range(0, 1200, 28))


def svg(material, colour):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<defs><clipPath id="r"><path d="M110 420 L600 150 L1090 420 Z"/></clipPath>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3f3"/><stop offset="1" stop-color="#eef4f8"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#sky)"/>
<rect y="640" width="1200" height="160" fill="#a7bf8f"/>
<rect x="190" y="400" width="820" height="250" fill="#f1ebe0"/>
<rect x="540" y="500" width="120" height="150" fill="#7a6352"/>
<rect x="270" y="470" width="170" height="110" fill="#9fb6c6" stroke="#fff" stroke-width="10"/>
<rect x="760" y="470" width="170" height="110" fill="#9fb6c6" stroke="#fff" stroke-width="10"/>
<path d="M110 420 L600 150 L1090 420 Z" fill="{colour}"/>
<g clip-path="url(#r)">{texture(material)}</g>
<path d="M110 420 L600 150 L1090 420" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="6"/>
</svg>
'''


os.makedirs(OUT, exist_ok=True)
for material, colours in COLOURS.items():
    for name, hex_colour in colours.items():
        with open(os.path.join(OUT, f'{material}-{name}.svg'), 'w') as f:
            f.write(svg(material, hex_colour))
print('wrote', sum(len(c) for c in COLOURS.values()), 'placeholders to', os.path.normpath(OUT))
