"""Generate step-by-step traces of the programming lessons' own code samples by
RUNNING them in real python3 (sys.settrace). Output: src/interactive/studio/traces.json
Usage: python3 scripts/research/gen_traces.py <samples.json> <out.json>
samples.json = [{ "id": "...", "code": "...", "stdin": "..." }]"""
import builtins, io, json, sys

def trace(code, stdin=''):
    steps, out = [], io.StringIO()
    feed = io.StringIO(stdin)
    def fake_input(prompt=''):
        out.write(str(prompt))
        val = feed.readline().rstrip('\n')
        steps.append({'event': 'input', 'line': sys._getframe(1).f_lineno, 'func': '<module>', 'vars': {}, 'out': out.getvalue(), 'typed': val})
        return val
    def snap(frame):
        return {k: repr(v) for k, v in frame.f_locals.items() if not k.startswith('__') and not callable(v)}
    def tr(frame, event, arg):
        if frame.f_code.co_filename != '<v2u>':
            return None
        if event in ('line', 'return', 'call'):
            st = {'event': event, 'line': frame.f_lineno, 'func': frame.f_code.co_name, 'vars': snap(frame), 'out': out.getvalue()}
            if event == 'return' and frame.f_code.co_name != '<module>':
                st['ret'] = repr(arg)
            if frame.f_code.co_name != '<module>' or event == 'line':
                steps.append(st)
        return tr
    g = {'__name__': '__main__', 'input': fake_input}
    old = sys.stdout
    sys.stdout = out
    err = None
    try:
        sys.settrace(tr)
        exec(compile(code, '<v2u>', 'exec'), g)
    except Exception as e:
        err = f'{type(e).__name__}: {e}'
    finally:
        sys.settrace(None)
        sys.stdout = old
    final = {k: repr(v) for k, v in g.items() if not k.startswith('__') and k != 'input' and not callable(v)}
    steps.append({'event': 'end', 'line': 0, 'func': '<module>', 'vars': final, 'out': out.getvalue(), **({'error': err} if err else {})})
    return {'output': out.getvalue(), 'error': err, 'steps': steps}

if __name__ == '__main__':
    samples = json.load(open(sys.argv[1], encoding='utf-8'))
    res = {s['id']: {'code': s['code'], 'stdin': s.get('stdin', ''), **trace(s['code'], s.get('stdin', ''))} for s in samples}
    json.dump({'python': sys.version.split()[0], 'traces': res}, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(res), 'traces')
