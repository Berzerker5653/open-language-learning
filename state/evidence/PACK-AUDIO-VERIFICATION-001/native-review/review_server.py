#!/usr/bin/env python3
"""Native-speaker canary review GUI for LTS pack audio (stdlib only).

  python3 review_server.py --list clips.json --port 8790

clips.json: [{"id": ..., "text": ..., "wav": "/abs/path.wav"}, ...]
Serves a one-card-at-a-time page: play clip, thumbs up/down; thumbs down opens
a comment box. Verdicts are POSTed and appended to verdicts.json next to this
script (live, resumable — reloading the page continues where you left off).
"""
import argparse, json, pathlib, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HERE = pathlib.Path(__file__).resolve().parent
LIST_FILE = None
VERDICTS = HERE / 'verdicts.json'
_state = {}


def load_clips(p):
    return json.loads(pathlib.Path(p).read_text(encoding='utf-8'))


def load_verdicts():
    if VERDICTS.exists():
        try:
            return json.loads(VERDICTS.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {}


PAGE = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Russian audio check</title>
<style>
 body{font-family:system-ui;background:#101418;color:#e8eef2;margin:0;
      display:flex;min-height:100vh;align-items:center;justify-content:center}
 .card{width:min(560px,92vw);background:#1a2026;border-radius:16px;padding:28px;
       text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.5)}
 .prog{color:#8aa;font-size:14px;margin-bottom:14px}
 .word{font-size:44px;font-weight:700;margin:10px 0 22px}
 button{font-size:26px;border:0;border-radius:12px;padding:14px 26px;margin:8px;
        cursor:pointer;background:#2b3a45;color:#fff}
 .up{background:#1d7a3d}.down{background:#8a2727}
 .up:hover{background:#24954b}.down:hover{background:#a52f2f}
 textarea{width:100%;box-sizing:border-box;font-size:17px;margin-top:10px;
          min-height:70px;border-radius:10px;border:0;padding:10px;background:#0e1215;color:#e8eef2}
 .done{font-size:30px}
 audio{width:100%;margin:6px 0 12px}
</style></head><body><div class="card" id="app">loading…</div><script>
const clips = __CLIPS__;
async function verdicts(){return (await (await fetch('/verdicts')).json());}
async function render(){
  const v = await verdicts();
  const i = clips.findIndex(c => !v[c.id]);
  const app = document.getElementById('app');
  if (i < 0){ app.innerHTML = '<div class="done">All done — thank you! 🌿</div>' +
      '<p>Reviewed ' + clips.length + ' clips</p>'; return; }
  const c = clips[i];
  app.innerHTML = '<div class="prog">' + Object.keys(v).length + ' of ' +
    clips.length + ' reviewed — does this say the word correctly?</div>' +
    '<div class="word">' + c.text + '</div>' +
    '<audio controls autoplay src="/clip/' + c.id + '"></audio><br>' +
    '<button class="up" onclick="vote(\'' + c.id + '\',\'good\')">👍 Sounds right</button>' +
    '<button class="down" onclick="document.getElementById(\'cm\').style.display=\'block\';' +
    'document.getElementById(\'send\').style.display=\'inline-block\'">👎 Something\'s off</button>' +
    '<div id="cm" style="display:none"><textarea id="note" placeholder="What is wrong? (pronunciation, stress, speed…)"></textarea>' +
    '<button id="send" style="display:none;background:#8a2727" onclick="vote(\'' + c.id +
    '\',\'bad\')">Send feedback</button></div>';
}
async function vote(id, verdict){
  const note = document.getElementById('note') ? document.getElementById('note').value : '';
  await fetch('/verdict', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({id, verdict, comment: note})});
  render();
}
render();
</script></body></html>"""


class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype='text/html; charset=utf-8'):
        data = body if isinstance(body, bytes) else body.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        p = urlparse(self.path).path
        if p in ('/', '/index.html'):
            clips = [{'id': c['id'], 'text': c['text']} for c in _state['clips']]
            self._send(200, PAGE.replace('__CLIPS__', json.dumps(clips, ensure_ascii=False)))
        elif p == '/verdicts':
            self._send(200, json.dumps(load_verdicts()), 'application/json')
        elif p.startswith('/clip/'):
            cid = p.split('/clip/')[1]
            wav = next((c['wav'] for c in _state['clips'] if c['id'] == cid), None)
            if not wav or not pathlib.Path(wav).exists():
                self._send(404, 'nope')
                return
            self._send(200, pathlib.Path(wav).read_bytes(), 'audio/wav')
        else:
            self._send(404, 'nope')

    def do_POST(self):
        if urlparse(self.path).path != '/verdict':
            self._send(404, 'nope')
            return
        n = int(self.headers.get('Content-Length', 0))
        d = json.loads(self.rfile.read(n))
        v = load_verdicts()
        v[d['id']] = {'verdict': d['verdict'], 'comment': d.get('comment', ''),
                      'ts': __import__('datetime').datetime.now().isoformat(timespec='seconds')}
        VERDICTS.write_text(json.dumps(v, ensure_ascii=False, indent=1), encoding='utf-8')
        self._send(200, '{"ok":true}', 'application/json')

    def log_message(self, *args, **kw):
        pass


def main():
    global LIST_FILE
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', required=True)
    ap.add_argument('--port', type=int, default=8790)
    a = ap.parse_args()
    LIST_FILE = a.list
    _state['clips'] = load_clips(a.list)
    print(f'serving {len(_state["clips"])} clips on http://0.0.0.0:{a.port} '
          f'(verdicts -> {VERDICTS})', flush=True)
    ThreadingHTTPServer(('0.0.0.0', a.port), H).serve_forever()


if __name__ == '__main__':
    main()
