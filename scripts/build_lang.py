# Gera public/lang/{en,es,prof}.json e os áudios (Piper, offline) em public/lang/a/
import hashlib, json, os, subprocess, sys, wave, io
sys.path.insert(0, os.path.dirname(__file__))
from lang_en import UNITS as EN
from lang_es import UNITS as ES
from lang_prof import PROF
from piper import PiperVoice

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'lang')
AUD = os.path.join(OUT, 'a')
os.makedirs(AUD, exist_ok=True)
VOICES = {'en': '/tmp/tts/vits-piper-en_US-amy-medium/en_US-amy-medium.onnx', 'es': '/tmp/tts/vits-piper-es_MX-claude-high/es_MX-claude-high.onnx', 'pt': '/tmp/tts/vits-piper-pt_BR-faber-medium/pt_BR-faber-medium.onnx'}
loaded = {}
def aid(lang, text): return lang + hashlib.md5(text.encode()).hexdigest()[:9]
def say(lang, text):
    k = aid(lang, text)
    path = os.path.join(AUD, k + '.ogg')
    if os.path.exists(path): return k
    if lang not in loaded: loaded[lang] = PiperVoice.load(VOICES[lang])
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w: loaded[lang].synthesize_wav(text, w)
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'wav', '-i', 'pipe:0', '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,apad=pad_dur=0.08', '-ac', '1', '-c:a', 'libopus', '-b:a', '22k', path], input=buf.getvalue())
    assert p.returncode == 0, text
    return k

def course(lang, units):
    out = {'lang': lang, 'units': []}
    n = 0
    for u in units:
        items = []
        for i, (t, pt, alts) in enumerate(u['items']):
            items.append({'id': f"{u['id']}-{i}", 't': t, 'pt': pt, 'alt': alts, 'a': say(lang, t)}); n += 1
        lessons = [items[i:i + 6] for i in range(0, len(items), 6)]
        if len(lessons) > 1 and len(lessons[-1]) < 4: lessons[-2] += lessons.pop()
        ch = u['chat']
        chat = {'title': ch['title'], 'who': ch['who'], 'emoji': ch['emoji'], 'lines': [{'t': t, 'pt': pt, 'ok': ok, 'ex': ex, 'a': say(lang, t), 'xa': say(lang, ex)} for (t, pt, ok, ex) in ch['lines']]}
        out['units'].append({'id': u['id'], 'emoji': u['emoji'], 'title': u['title'], 'desc': u['desc'], 'lessons': [[x['id'] for x in l] for l in lessons], 'items': items, 'chat': chat})
        print(lang, u['id'], len(items), flush=True)
    json.dump(out, open(os.path.join(OUT, f'{lang}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    return n

prof = {m: {k: [{'t': t, 'a': say('pt', t)} for t in v] for k, v in cats.items()} for m, cats in PROF.items()}
json.dump(prof, open(os.path.join(OUT, 'prof.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('items', course('en', EN), course('es', ES))
