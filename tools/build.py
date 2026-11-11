#!/usr/bin/env python3
"""Build the Click the Pair game pages.

Run from anywhere:   python tools/build.py

Reads:   src/site.css, src/game.js, src/pages/*.html (the text under each game)
Writes:  index.html, hard.html, easy.html, animals.html, food.html, sports.html,
         thanksgiving.html, christmas.html,
         embed.html, assets/game.js, sw.js, sitemap.xml

The generated files are what Vercel serves. Edit the files in src/ (and the page
settings below), then run this script again. privacy.html and terms.html are
edited by hand and are not touched here.
"""
import datetime
import hashlib
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://clickthepair.com/'
GTM_ID = 'GTM-PTXMWV4L'
ADSENSE_CLIENT = 'ca-pub-6122544703023536'
HINT_PENALTY = ('A wrong click costs 2 seconds. On a keyboard, move with Tab or the arrow keys '
                'and press Enter or Space to pick a tile.')

FAVICON_SVG = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
               "%3Crect width='64' height='64' rx='14' fill='%232456e6'/%3E"
               "%3Crect x='9' y='20' width='20' height='24' rx='6' fill='%23fff'/%3E"
               "%3Crect x='35' y='20' width='20' height='24' rx='6' fill='%23fff'/%3E"
               "%3Ccircle cx='19' cy='32' r='5' fill='%23ffb703'/%3E"
               "%3Ccircle cx='45' cy='32' r='5' fill='%23ffb703'/%3E%3C/svg%3E")

CLASSIC = {
    'mode': 'classic', 'name': 'Click the Pair', 'label': 'Classic',
    'tiles': 12, 'cols': 4, 'seconds': 60, 'penalty': 2,
    'pool': 'all', 'rampAt': 10, 'rampBase': 4, 'rampMax': 8,
    'daily': True, 'bestKey': 'clickThePair.best', 'legacyBestKey': 'tapThePair.best',
}

# Every game page. 'nav' is the card in "More Ways to Play"; pages without it are not listed.
PAGES = [
    {
        'file': 'index.html', 'path': '',
        'nav': ('🎯', 'Classic & Daily', '12 tiles and a new daily challenge'),
        'title': 'Click the Pair – Free Emoji Matching Game | Play Online',
        'description': ('Play Click the Pair, a free emoji matching game. Find the matching pair before the '
                        '60-second timer runs out, then take the daily challenge. No download needed.'),
        'og_title': 'Click the Pair – Free Emoji Matching Game',
        'og_description': ('Find the two matching emojis before the 60-second timer runs out. '
                           'Free to play in your browser, no download needed.'),
        'h1': 'Click the Pair – Free Emoji Matching Game',
        'tagline': 'Twelve tiles, one matching pair, 60 seconds on the clock.',
        'start_title': 'Click the Pair',
        'start_text': 'Two tiles match. Find them and click both. You have 60 seconds.',
        'hint': HINT_PENALTY,
        'game_name': 'Click the Pair',
        'game_description': ('Click the Pair is a free emoji matching game. Find the two matching emojis in a grid '
                             'of twelve tiles and score as many pairs as you can in 60 seconds.'),
        'config': CLASSIC,
        'adsense_meta': True,
    },
    {
        'file': 'hard.html', 'path': 'hard.html',
        'nav': ('🔥', 'Hard Mode', '20 tiles packed with look-alikes'),
        'title': 'Hard Mode – 20-Tile Emoji Matching Game | Click the Pair',
        'description': ('Play Click the Pair Hard Mode: 20 tiles full of look-alike emojis and one matching pair. '
                        'Beat the 60-second timer. Free in your browser, no download.'),
        'h1': 'Click the Pair Hard Mode – 20-Tile Emoji Challenge',
        'tagline': 'Twenty tiles, look-alike emojis, one matching pair.',
        'start_title': 'Hard Mode',
        'start_text': '20 tiles packed with look-alikes. Find the one pair in 60 seconds.',
        'hint': HINT_PENALTY,
        'game_name': 'Click the Pair: Hard Mode',
        'game_description': ('Hard Mode of the Click the Pair emoji matching game: 20 tiles full of look-alike '
                             'emojis, one matching pair, and 60 seconds on the clock.'),
        'config': dict(CLASSIC, mode='hard', name='Click the Pair Hard Mode', label='Hard Mode',
                       tiles=20, rampAt=0, rampBase=6, rampMax=12, daily=False,
                       bestKey='clickThePair.best.hard', legacyBestKey=None),
    },
    {
        'file': 'easy.html', 'path': 'easy.html',
        'nav': ('🌱', 'Easy Mode', '9 big tiles, no time penalties'),
        'title': 'Easy Mode – Relaxed Emoji Matching Game | Click the Pair',
        'description': ('Click the Pair Easy Mode: nine big tiles, one matching pair and no time penalties. '
                        'A relaxed, free emoji matching game you can play in your browser.'),
        'h1': 'Click the Pair Easy Mode – Relaxed Emoji Matching',
        'tagline': 'Nine big tiles, one matching pair, no time penalties.',
        'start_title': 'Easy Mode',
        'start_text': 'Nine big tiles. Find the two that match. Wrong clicks don’t cost any time.',
        'hint': ('Wrong clicks cost no time in Easy Mode. On a keyboard, move with Tab or the arrow keys '
                 'and press Enter or Space to pick a tile.'),
        'game_name': 'Click the Pair: Easy Mode',
        'game_description': ('Easy Mode of the Click the Pair emoji matching game: nine big tiles, one matching '
                             'pair and no time penalties.'),
        'config': dict(CLASSIC, mode='easy', name='Click the Pair Easy Mode', label='Easy Mode',
                       tiles=9, cols=3, penalty=0, rampAt=None, daily=False,
                       bestKey='clickThePair.best.easy', legacyBestKey=None),
        'tile_font_max': '4.75rem',
    },
    {
        'file': 'animals.html', 'path': 'animals.html',
        'nav': ('🐼', 'Animals', 'Every tile is an animal'),
        'title': 'Animal Emoji Matching Game | Click the Pair',
        'description': ('Find the matching pair on a board full of animal emojis: pandas, foxes, owls and more. '
                        'A free 60-second animal matching game, no download needed.'),
        'h1': 'Animal Emoji Matching Game',
        'tagline': 'Twelve animal tiles, one matching pair, 60 seconds.',
        'start_title': 'Animal Board',
        'start_text': 'Every tile is an animal. Find the matching pair in 60 seconds.',
        'hint': HINT_PENALTY,
        'game_name': 'Click the Pair: Animals',
        'game_description': 'An animal emoji matching game: find the one matching pair of animals in 60 seconds.',
        'config': dict(CLASSIC, mode='animals', name='Click the Pair (Animals)', label='Animal board',
                       pool='animals', rampAt=None, daily=False,
                       bestKey='clickThePair.best.animals', legacyBestKey=None),
    },
    {
        'file': 'food.html', 'path': 'food.html',
        'nav': ('🍓', 'Food', 'Fruit, snacks and treats'),
        'title': 'Food Emoji Matching Game | Click the Pair',
        'description': ('Find the matching pair on a board of fruit, snacks and treats. A free 60-second food '
                        'emoji matching game you can play in your browser, no download needed.'),
        'h1': 'Food Emoji Matching Game',
        'tagline': 'Fruit, snacks and treats. One matching pair.',
        'start_title': 'Food Board',
        'start_text': 'Every tile is something to eat. Find the matching pair in 60 seconds.',
        'hint': HINT_PENALTY,
        'game_name': 'Click the Pair: Food',
        'game_description': 'A food emoji matching game: find the one matching pair of foods in 60 seconds.',
        'config': dict(CLASSIC, mode='food', name='Click the Pair (Food)', label='Food board',
                       pool='food', rampAt=None, daily=False,
                       bestKey='clickThePair.best.food', legacyBestKey=None),
    },
    {
        'file': 'sports.html', 'path': 'sports.html',
        'nav': ('⚽', 'Sports & Games', 'Balls, music and party games'),
        'title': 'Sports & Games Emoji Matching Game | Click the Pair',
        'description': ('Find the matching pair among balls, instruments and party games. A free 60-second '
                        'sports emoji matching game you can play in your browser.'),
        'h1': 'Sports & Games Emoji Matching Game',
        'tagline': 'Balls, music and party games. One matching pair.',
        'start_title': 'Sports & Games',
        'start_text': 'Every tile is a sport, instrument or game. Find the matching pair in 60 seconds.',
        'hint': HINT_PENALTY,
        'game_name': 'Click the Pair: Sports & Games',
        'game_description': ('A sports and games emoji matching game: find the one matching pair of balls, '
                             'instruments or games in 60 seconds.'),
        'config': dict(CLASSIC, mode='sports', name='Click the Pair (Sports & Games)', label='Sports & Games board',
                       pool='games', rampAt=None, daily=False,
                       bestKey='clickThePair.best.sports', legacyBestKey=None),
    },
    {
        'file': 'thanksgiving.html', 'path': 'thanksgiving.html',
        'nav': ('🦃', 'Thanksgiving', 'Turkey, pie and fall leaves'), 'nav_group': 'holiday', 'season': 'thanksgiving',
        'title': 'Thanksgiving Emoji Matching Game | Click the Pair',
        'description': ('A free Thanksgiving game: find the matching pair among turkeys, pies and fall leaves '
                        'before the 60-second timer runs out. Fun for the whole family.'),
        'og_title': 'Thanksgiving Emoji Matching Game',
        'og_description': ('Find the matching pair among turkeys, pies and fall leaves in 60 seconds. '
                           'Free to play in your browser.'),
        'h1': 'Thanksgiving Emoji Matching Game',
        'tagline': 'Turkey, pie and fall leaves. One matching pair.',
        'start_title': 'Thanksgiving Board',
        'start_text': 'Every tile is a Thanksgiving emoji. Find the matching pair in 60 seconds.',
        'hint': HINT_PENALTY,
        'game_name': 'Click the Pair: Thanksgiving',
        'game_description': ('A Thanksgiving emoji matching game: find the one matching pair of turkeys, pies, '
                             'harvest foods and fall leaves in 60 seconds.'),
        'config': dict(CLASSIC, mode='thanksgiving', name='Click the Pair (Thanksgiving)',
                       label='Thanksgiving board', pool='thanksgiving', rampAt=None, daily=False,
                       bestKey='clickThePair.best.thanksgiving', legacyBestKey=None),
    },
    {
        'file': 'christmas.html', 'path': 'christmas.html',
        'nav': ('🎄', 'Christmas', 'Santa, presents and snowmen'), 'nav_group': 'holiday', 'season': 'christmas',
        'title': 'Christmas Emoji Matching Game – Free Online | Click the Pair',
        'description': ('A free Christmas game: find the matching pair among Santas, trees, presents and '
                        'snowmen before the 60-second timer runs out. Great for holiday parties.'),
        'og_title': 'Christmas Emoji Matching Game',
        'og_description': ('Find the matching pair among Santas, trees and presents in 60 seconds. '
                           'Free to play in your browser.'),
        'h1': 'Christmas Emoji Matching Game',
        'tagline': 'Santa, presents and snowmen. One matching pair.',
        'start_title': 'Christmas Board',
        'start_text': 'Every tile is a Christmas emoji. Find the matching pair in 60 seconds.',
        'hint': HINT_PENALTY,
        'game_name': 'Click the Pair: Christmas',
        'game_description': ('A Christmas emoji matching game: find the one matching pair of Santas, trees, '
                             'presents and snowmen in 60 seconds.'),
        'config': dict(CLASSIC, mode='christmas', name='Click the Pair (Christmas)',
                       label='Christmas board', pool='christmas', rampAt=None, daily=False,
                       bestKey='clickThePair.best.christmas', legacyBestKey=None),
    },
    {
        'file': 'embed.html', 'path': 'embed.html', 'embed': True,
        'title': 'Click the Pair – Emoji Matching Game',
        'description': 'Click the Pair, a free emoji matching game, embedded on another site.',
        'h1': 'Click the Pair',
        'start_title': 'Click the Pair',
        'start_text': 'Two tiles match. Find them and click both. You have 60 seconds.',
        'hint': HINT_PENALTY,
        'config': dict(CLASSIC, daily=False, embed=True, legacyBestKey=None),
    },
]

E = lambda s: html.escape(s, quote=True)


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


GAME_JS = read('src/game.js')
CSS = read('src/site.css').rstrip('\n')
JS_HASH = hashlib.sha256(GAME_JS.encode('utf-8')).hexdigest()[:10]
JS_URL = '/assets/game.js?v=' + JS_HASH

# Emoji groups, read from the game script so the placeholder boards use the same set
GROUP_NAMES = ['animals', 'food', 'games', 'travel', 'nature', 'things']
_groups_src = re.search(r'const GROUPS = \[(.*?)\];', GAME_JS, re.S).group(1)
_seen, GROUPS = set(), []
for line in re.findall(r"'([^']*)'", _groups_src):
    g = [e for e in line.split(' ') if e and e not in _seen]
    _seen.update(g)
    GROUPS.append(g)
ALL = [e for g in GROUPS for e in g]
# Holiday sets (kept apart from GROUPS in the game script)
_themes_src = re.search(r'const THEMES = \{(.*?)\};', GAME_JS, re.S).group(1)
THEMES = {name: emojis.split(' ') for name, emojis in re.findall(r"(\w+): '([^']*)'", _themes_src)}


def placeholder_board(cfg):
    """A fixed, valid-looking board shown behind the start screen."""
    n = cfg['tiles']
    if cfg['mode'] == 'classic':
        return ['🐶', '🍉', '🚀', '🎲', '🌈', '🍉', '🔑', '🐙', '🎸', '🌵', '🍩', '⚓'][:n]
    pool = (ALL if cfg['pool'] == 'all' else THEMES[cfg['pool']] if cfg['pool'] in THEMES
            else GROUPS[GROUP_NAMES.index(cfg['pool'])])
    step = max(1, len(pool) // (n - 1)) if cfg['pool'] == 'all' else 1
    picked = [pool[(i * step) % len(pool)] for i in range(n - 1)]
    board = picked[:]
    board.insert(n // 2, picked[1])
    return board


def faq_pairs(content):
    """Visible FAQ questions and answers, used for the FAQPage structured data."""
    m = re.search(r'<section id="faq">(.*?)</section>', content, re.S)
    if not m:
        return []
    out = []
    for q, a in re.findall(r'<h3>(.*?)</h3>\s*<p>(.*?)</p>', m.group(1), re.S):
        clean = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s)).strip()
        out.append((clean(q), clean(a)))
    return out


def fold_sections(content):
    """Turn each text section under the game into a dropdown (<details>).
    The FAQ keeps its heading, and each question becomes its own dropdown."""
    def question(q):
        return ('      <details class="fold fold--q">\n'
                '        <summary><h3>' + q.group(1) + '</h3></summary>\n'
                '        <div class="fold__body"><p>' + q.group(2) + '</p></div>\n'
                '      </details>')

    def section(m):
        sid, title, body = m.group(1), m.group(2), m.group(3)
        if sid == 'faq':
            body = re.sub(r'      <h3>(.*?)</h3>\n      <p>(.*?)</p>', question, body, flags=re.S)
            return '    <section id="' + sid + '">\n      <h2>' + title + '</h2>\n' + body + '\n    </section>'
        body = '\n'.join(('  ' + line) if line.strip() else line for line in body.split('\n'))
        return ('    <section id="' + sid + '">\n'
                '      <details class="fold">\n'
                '        <summary><h2>' + title + '</h2></summary>\n'
                '        <div class="fold__body">\n' + body + '\n        </div>\n'
                '      </details>\n'
                '    </section>')

    return re.sub(r'    <section id="([\w-]+)">\n      <h2>(.*?)</h2>\n(.*?)\n    </section>', section, content, flags=re.S)



def third_party_loader():
    return f'''<!-- Google tag ({GTM_ID}) and AdSense load once the page has finished loading, so they never slow the game down -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  (function () {{
    function add(src, cors) {{
      var s = document.createElement('script');
      s.async = true;
      s.src = src;
      if (cors) s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }}
    function loadThirdParty() {{
      add('https://www.googletagmanager.com/gtm.js?id={GTM_ID}');
      add('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT}', true);
    }}
    function later() {{
      // wait for the next frame to be painted, then for a quiet moment
      requestAnimationFrame(function () {{
        setTimeout(function () {{
          if ('requestIdleCallback' in window) requestIdleCallback(loadThirdParty, {{ timeout: 2000 }});
          else loadThirdParty();
        }}, 0);
      }});
    }}
    if (document.readyState === 'complete') later();
    else addEventListener('load', later, {{ once: true }});
  }})();
</script>'''


def structured_data(page, url, faqs):
    graph = [{
        '@type': ['VideoGame', 'WebApplication'],
        '@id': url + '#game',
        'name': page['game_name'],
        'url': url,
        'image': SITE + 'og-image.png',
        'description': page['game_description'],
        'genre': 'Puzzle',
        'applicationCategory': 'Game',
        'operatingSystem': 'Any',
        'gamePlatform': 'Web browser',
        'playMode': 'SinglePlayer',
        'inLanguage': 'en',
        'isAccessibleForFree': True,
        'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD',
                   'availability': 'https://schema.org/InStock'},
    }]
    if faqs:
        graph.append({
            '@type': 'FAQPage',
            '@id': url + '#faq',
            'mainEntity': [{'@type': 'Question', 'name': q,
                            'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs],
        })
    return json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2)


def modes_nav(current):
    def cards(group):
        items = []
        for p in PAGES:
            if 'nav' not in p or p.get('nav_group') != group:
                continue
            icon, name, blurb = p['nav']
            here = ' aria-current="page"' if p is current else ''
            badge = '<span class="mode-card__here">Playing</span>' if p is current else ''
            season = f''' data-season="{p['season']}"''' if p.get('season') else ''
            items.append(f'''      <li{season}><a class="mode-card" href="/{p['path']}"{here}><span class="mode-card__icon" aria-hidden="true">{icon}</span><span class="mode-card__text"><strong>{E(name)}</strong><span>{E(blurb)}</span></span>{badge}</a></li>''')
        return '\n'.join(items)
    return '''  <nav class="modes" aria-label="More ways to play">
    <h2>More Ways to Play</h2>
    <ul>
''' + cards(None) + '''
    </ul>
    <div class="modes__seasonal" id="seasonal" hidden>
    <h3>Holiday Boards</h3>
    <ul class="modes__holiday">
''' + cards('holiday') + '''
    </ul>
    </div>
  </nav>'''


def game_section(page):
    cfg = page['config']
    rows = -(-cfg['tiles'] // cfg['cols'])
    style = f"--cols:{cfg['cols']};--rows:{rows}" + (f";--tile-font-max:{page['tile_font_max']}" if page.get('tile_font_max') else '')
    tiles = '\n'.join(f'            <button type="button" class="tile" disabled>{e}</button>' for e in placeholder_board(cfg))
    daily = cfg['daily']
    if daily:
        start_buttons = '''              <button type="button" class="btn" id="daily-btn">Daily challenge</button>
              <button type="button" class="btn btn--ghost" id="start-btn">Free play</button>'''
        start_meta = 'Same boards for everyone today. One try.'
    else:
        start_buttons = '              <button type="button" class="btn btn--big" id="start-btn">Start</button>'
        start_meta = 'New boards every round.'
    # Filled in by the game script while a holiday board is in season
    season_promo = '' if cfg.get('embed') else '<a class="season-promo" id="season-promo" hidden></a>'
    daily_results = '''
            <p class="result-best" id="daily-line" hidden></p>
            <p class="result-strip" id="daily-strip" hidden><span class="result-strip__blocks" id="strip-blocks" title="Pairs found in each 10 seconds" aria-hidden="true"></span><span id="strip-misses"></span></p>''' if daily else ''
    to_daily = '''
            <button type="button" class="link-btn" id="to-daily" hidden>Play today’s Daily</button>''' if daily else ''
    label = page.get('game_name', 'Click the Pair') + ' game'
    return f'''  <section id="game" aria-label="{E(label)}">
    <div class="stage" style="{style}">

      <div class="game" id="game-card">
        <div class="hud">
          <div class="stat">
            <span class="stat__label">Score</span>
            <span class="stat__value" id="score">0</span>
          </div>
          <div class="stat stat--time" id="time-stat" role="timer" aria-label="Seconds left">
            <span class="stat__label">Time</span>
            <span class="stat__value"><span id="time">60</span><small>s</small></span>
            <span class="penalty" id="penalty" aria-hidden="true">−2s</span>
          </div>
          <div class="stat">
            <span class="stat__label" id="best-label">Best</span>
            <span class="stat__value" id="best">0</span>
          </div>
        </div>
        <div class="timebar" id="timebar" aria-hidden="true"><div class="timebar__fill" id="timebar-fill"></div></div>

        <div class="board">
          <div class="grid" id="grid" role="group" aria-label="Emoji tiles">
{tiles}
          </div>

          <!-- Start screen -->
          <div class="overlay" id="start-screen">
            <h2 class="overlay__title">{E(page['start_title'])}</h2>
            <p class="overlay__text">{E(page['start_text'])}</p>
            <div class="overlay__actions">
{start_buttons}
            </div>
            <p class="overlay__meta" id="start-meta">{start_meta}</p>
          </div>

          <!-- Results card -->
          <div class="overlay" id="results" hidden>
            <h2 class="overlay__title" id="result-title">Time’s up!</h2>
            <p class="result-score"><strong id="final-score">0</strong> <span id="final-unit">pairs</span></p>
            <p class="result-best" id="result-best">Best: <span id="final-best">0</span><span class="badge" id="new-best" hidden>New best</span><span id="beat-line"></span></p>{daily_results}
            <div class="overlay__actions">
              <button type="button" class="btn" id="again-btn">Play Again</button>
              <button type="button" class="btn btn--ghost" id="share-btn">Share</button>
            </div>{to_daily}
            <p class="share-note" id="share-note" role="status"></p>
          </div>
        </div>

        <p class="sr-only" id="announcer" aria-live="polite"></p>
        <noscript><p style="text-align:center;margin:12px 0 4px">Click the Pair needs JavaScript turned on to play.</p></noscript>
      </div>

    </div>

    <div class="game-links">{season_promo}<button type="button" class="link-btn" id="stats-btn">📊 Your stats</button></div>
    <div class="hint">
      <p>{E(page['hint'])}</p>
    </div>
  </section>'''


STATS_DIALOG = '''<dialog class="stats" id="stats" aria-labelledby="stats-title">
  <h2 id="stats-title">Your stats</h2>
  <div id="stats-body"></div>
  <p class="stats__note">Stats are saved in this browser only.</p>
  <div class="stats__close"><button type="button" class="btn" id="stats-close">Close</button></div>
</dialog>'''


def render(page):
    cfg = dict(page['config'])
    embed = page.get('embed', False)
    url = SITE + page['path']
    cfg['url'] = SITE if embed else url
    content = '' if embed else read('src/pages/' + page['file']).rstrip('\n')
    faqs = faq_pairs(content)

    head = ['<!DOCTYPE html>',
            '<html lang="en"' + (' class="is-embed"' if embed else '') + '>',
            '<head>',
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1">',
            '<!-- Generated by tools/build.py from src/. Edit the source files, not this page. -->']
    if not embed:
        head.append('')
        head.append(third_party_loader())
    head += ['',
             f'<title>{E(page["title"])}</title>',
             f'<meta name="description" content="{E(page["description"])}">',
             '<meta name="robots" content="' + ('noindex, follow' if embed else 'index, follow') + '">']
    if not embed:
        head.append(f'<link rel="canonical" href="{url}">')
    head += ['',
             '<meta name="theme-color" content="#f6f1e7" media="(prefers-color-scheme: light)">',
             '<meta name="theme-color" content="#11141b" media="(prefers-color-scheme: dark)">']
    if not embed:
        og_title = page.get('og_title', page['h1'])
        og_desc = page.get('og_description', page['description'])
        head += ['',
                 '<!-- Open Graph -->',
                 '<meta property="og:type" content="website">',
                 '<meta property="og:site_name" content="Click the Pair">',
                 f'<meta property="og:title" content="{E(og_title)}">',
                 f'<meta property="og:description" content="{E(og_desc)}">',
                 f'<meta property="og:url" content="{url}">',
                 f'<meta property="og:image" content="{SITE}og-image.png">',
                 '<meta property="og:image:width" content="1200">',
                 '<meta property="og:image:height" content="630">',
                 '<meta property="og:image:alt" content="Click the Pair emoji matching game">',
                 '',
                 '<!-- Twitter card -->',
                 '<meta name="twitter:card" content="summary_large_image">',
                 f'<meta name="twitter:title" content="{E(og_title)}">',
                 f'<meta name="twitter:description" content="{E(og_desc)}">',
                 f'<meta name="twitter:image" content="{SITE}og-image.png">']
    head += ['',
             '<link rel="icon" href="/favicon.ico" sizes="32x32">',
             f'<link rel="icon" href="{FAVICON_SVG}" type="image/svg+xml">',
             '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">']
    if not embed:
        head.append('<link rel="manifest" href="/manifest.webmanifest">')
    if page.get('adsense_meta'):
        head += ['', '<!-- Google AdSense site verification -->',
                 f'<meta name="google-adsense-account" content="{ADSENSE_CLIENT}">']
    head += ['', '<style>', CSS, '</style>']
    if not embed:
        head += ['', '<script type="application/ld+json">', structured_data(page, url, faqs), '</script>']
    head += ['</head>', '']

    body = ['<body>', '']
    if embed:
        body += ['<header class="embed-header">',
                 '  <h1><a href="https://clickthepair.com/" target="_blank" rel="noopener">Click the Pair</a></h1>',
                 '</header>', '', '<main>', '', game_section(page), '',
                 '  <p class="embed-footer">Daily challenge and more modes at <a href="https://clickthepair.com/" target="_blank" rel="noopener">clickthepair.com</a></p>',
                 '</main>']
    else:
        body += ['<header class="site-header">',
                 f'  <h1>{E(page["h1"])}</h1>',
                 f'  <p class="tagline">{E(page["tagline"])}</p>',
                 '</header>', '', '<main>', '', game_section(page), '', modes_nav(page), '',
                 '  <article class="content">', '', fold_sections(content), '', '  </article>', '</main>', '',
                 '<footer class="site-footer">',
                 '  <nav aria-label="Footer">',
                 '    <a href="/privacy.html">Privacy Policy</a>',
                 '    <a href="/terms.html">Terms</a>',
                 '  </nav>',
                 '  <p>© Click the Pair. Free emoji matching game.</p>',
                 '</footer>']
    body += ['', STATS_DIALOG, '',
             '<script type="application/json" id="game-config">' + json.dumps(cfg, ensure_ascii=False) + '</script>',
             f'<script src="{JS_URL}" defer></script>', '', '</body>', '</html>', '']

    # simple checks that keep search snippets tidy
    if not embed:
        if len(page['title']) > 60:
            print(f'  note: {page["file"]} title is {len(page["title"])} characters (over 60)')
        if not 110 <= len(page['description']) <= 160:
            print(f'  note: {page["file"]} description is {len(page["description"])} characters')
    return '\n'.join(head + body)


def service_worker(urls):
    version = hashlib.sha256(('|'.join(urls) + JS_HASH + CSS).encode('utf-8')).hexdigest()[:10]
    return f'''/* Click the Pair offline support. Generated by tools/build.py.
   Network first: players always get the latest version while online, and the
   saved copy is only used when the network fails. Ads and analytics are never cached. */
const CACHE = 'click-the-pair-{version}';
const PRECACHE = {json.dumps(urls, indent=2)};

self.addEventListener('install', event => {{
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', event => {{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener('fetch', event => {{
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isPage = request.mode === 'navigate';
  const key = isPage ? url.origin + url.pathname : request;
  event.respondWith(
    fetch(request)
      .then(response => {{
        if (response.ok && response.type === 'basic') {{
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(key, copy));
        }}
        return response;
      }})
      .catch(() => caches.match(key).then(hit => hit || (isPage ? caches.match('/') : Response.error())))
  );
}});
'''


def sitemap(paths):
    today = datetime.date.today().isoformat()
    rows = []
    for path, freq, prio in paths:
        rows.append(f'''  <url>
    <loc>{SITE}{path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{prio}</priority>
  </url>''')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(rows) + '\n</urlset>\n')


def main():
    write('assets/game.js', GAME_JS)
    for page in PAGES:
        write(page['file'], render(page))
        print('built', page['file'])

    game_pages = ['/' + p['path'] for p in PAGES if not p.get('embed')]
    precache = game_pages + [JS_URL, '/manifest.webmanifest', '/favicon.ico',
                             '/icons/icon-192.png', '/icons/apple-touch-icon.png']
    write('sw.js', service_worker(precache))

    indexable = [('', 'daily', '1.0')] + [(p['path'], 'monthly', '0.8') for p in PAGES
                                          if p['path'] and not p.get('embed')]
    indexable += [('privacy.html', 'yearly', '0.3'), ('terms.html', 'yearly', '0.3')]
    write('sitemap.xml', sitemap(indexable))
    print('built sw.js, sitemap.xml and assets/game.js (version', JS_HASH + ')')


if __name__ == '__main__':
    main()
