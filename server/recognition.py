"""Local Audiveris provider and MusicXML/OMR normalization.

Audiveris remains a separate executable. Its OMR archive supplies original image
coordinates; MusicXML supplies pitch and rhythm. No demo note data is substituted.
"""
from __future__ import annotations

from collections import defaultdict
from fractions import Fraction
from pathlib import Path
import json
import os
import signal
import subprocess
import time
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CLI = ROOT / '.runtime/Audiveris.app/Contents/MacOS/Audiveris'


def _q(value, default=0.0):
    return float(Fraction(value)) if value else default


def available():
    return Path(os.environ.get('AUDIVERIS_CLI', str(DEFAULT_CLI))).is_file()


def _xml_score(path):
    with zipfile.ZipFile(path) as archive:
        container = ET.fromstring(archive.read('META-INF/container.xml'))
        rootfile = next(x for x in container.iter() if x.tag.split('}')[-1] == 'rootfile')
        return ET.fromstring(archive.read(rootfile.attrib['full-path']))


def _geometry(omr_path, part_ids):
    """Group original heads by exported measure, logical part, voice and onset."""
    measures, staves = [], defaultdict(list)
    with zipfile.ZipFile(omr_path) as archive:
        book = ET.fromstring(archive.read('book.xml'))
        for sheet_ref in book.findall('sheet'):
            sheet_number = int(sheet_ref.attrib['number'])
            name = f'sheet#{sheet_number}/sheet#{sheet_number}.xml'
            if name not in archive.namelist():
                continue
            sheet = ET.fromstring(archive.read(name))
            picture = sheet.find('picture')
            width, height = float(picture.attrib['width']), float(picture.attrib['height'])
            ref_systems = sheet_ref.findall('page/system')
            for system_index, system in enumerate(sheet.findall('page/system')):
                symbols = {x.attrib['id']: x for x in system.findall('sig/inters/*') if 'id' in x.attrib}
                contained = defaultdict(list)
                for relation in system.findall('sig/relations/relation'):
                    if relation.find('containment') is not None:
                        contained[relation.attrib['source']].append(relation.attrib['target'])
                parts = system.findall('part')
                refs = ref_systems[system_index].findall('part') if system_index < len(ref_systems) else []
                logical = {id(part): 'P' + (refs[i].attrib.get('logical-id', part.attrib['id']) if i < len(refs) else part.attrib['id']) for i, part in enumerate(parts)}
                for part in parts:
                    pid = logical[id(part)]
                    for staff in part.findall('staff'):
                        points = staff.findall('lines/line/point')
                        if not points:
                            continue
                        y = sum(float(p.attrib['y']) for p in points) / len(points)
                        staves[sheet_number - 1].append({'part': pid, 'short': pid, 'y': y / height,
                                                        'x': float(staff.attrib['left']) / width,
                                                        'system': system_index, 'staff': staff.attrib['id']})
                for stack_index, stack in enumerate(system.findall('stack')):
                    if stack.attrib.get('special') == 'CAUTIONARY':
                        continue
                    slots = {s.attrib['id']: _q(s.attrib.get('time-offset')) * 4 for s in stack.findall('slot')}
                    record = {'page': sheet_number - 1, 'system': system_index, 'groups': defaultdict(list),
                              'duration': _q(stack.attrib.get('duration')) * 4,
                              'x': float(stack.attrib['left']) / width, 'repeatMarks': {'left': [], 'right': []}}
                    for side,edge in [('left',float(stack.attrib['left'])),('right',float(stack.attrib['right']))]:
                        dots=[x for x in symbols.values() if x.tag=='repeat-dot' and x.find('bounds') is not None and abs(float(x.find('bounds').attrib['x'])-edge)<max(60,width*.03)]
                        for staff_id in {x.attrib.get('staff') for x in dots}:
                            boxes=[x.find('bounds').attrib for x in dots if x.attrib.get('staff')==staff_id]
                            boxes += [x.find('bounds').attrib for x in symbols.values() if x.tag=='barline' and x.attrib.get('staff')==staff_id and x.find('bounds') is not None and abs(float(x.find('bounds').attrib['x'])-edge)<max(60,width*.03)]
                            left=min(float(b['x']) for b in boxes)-5;top=min(float(b['y']) for b in boxes)-4;right=max(float(b['x'])+float(b['w']) for b in boxes)+5;bottom=max(float(b['y'])+float(b['h']) for b in boxes)+4
                            record['repeatMarks'][side].append({'page':sheet_number-1,'x':left/width,'y':top/height,'width':(right-left)/width,'height':(bottom-top)/height})
                    for part in parts:
                        pmeasures = part.findall('measure')
                        if stack_index >= len(pmeasures):
                            continue
                        for voice in pmeasures[stack_index].findall('voice'):
                            for entry in voice.findall('slots/entry'):
                                val = entry.find('value')
                                if val is None or val.attrib.get('status') != 'BEGIN':
                                    continue
                                beat = slots.get(entry.findtext('key'))
                                if beat is None:
                                    continue
                                chord_id = val.attrib['chord']
                                child_ids = contained.get(chord_id, [])
                                for child_id in child_ids:
                                    sym = symbols.get(child_id)
                                    if sym is None or sym.tag not in ('head', 'rest'):
                                        continue
                                    bounds = sym.find('bounds')
                                    if bounds is None:
                                        continue
                                    b = {k: float(v) for k, v in bounds.attrib.items()}
                                    record['groups'][(logical[id(part)], voice.attrib['id'], round(beat, 6))].append({
                                        'x': (b['x'] + b['w'] / 2) / width,
                                        'y': (b['y'] + b['h'] / 2) / height,
                                        'width': b['w'] / width, 'height': b['h'] / height,
                                        'staff': sym.attrib.get('staff', '1'), 'rest': sym.tag == 'rest',
                                        'recognitionGrade': float(sym.attrib.get('ctx-grade', sym.attrib.get('grade', '0'))),
                                        'sourceSymbol': child_id,
                                    })
                    measures.append(record)
    return measures, dict(staves)


def parse_result(mxl_path, omr_path, warnings=None):
    score = _xml_score(mxl_path)
    parts = [{'id': p.attrib['id'], 'name': p.findtext('part-name', p.attrib['id'])} for p in score.findall('part-list/score-part')]
    geometry, staves = _geometry(omr_path, [p['id'] for p in parts])
    events, measures, warnings = [], [], list(warnings or [])
    repeat_specs,ending_specs={},{}
    part_measures = {p.attrib['id']: p.findall('measure') for p in score.findall('part')}
    divisions = {pid: 1 for pid in part_measures}
    time_sig = {'num': 4, 'den': 4}
    absolute = 0.0
    count = max((len(m) for m in part_measures.values()), default=0)
    if len(geometry) != count:
        warnings.append(f'Export contains {count} measures; OMR geometry contains {len(geometry)}. Verify note positions.')
    for mi in range(count):
        batch, lengths = [], []
        geo = geometry[mi] if mi < len(geometry) else None
        has_time = False
        for pid, pmeasures in part_measures.items():
            if mi >= len(pmeasures):
                continue
            measure = pmeasures[mi]
            for barline in measure.findall('barline'):
                repeat=barline.find('repeat');ending=barline.find('ending')
                if repeat is not None:repeat_specs[(mi+1,repeat.attrib['direction'])]=int(repeat.attrib.get('times','2'))
                if ending is not None:ending_specs[(mi+1,ending.attrib.get('type','start'))]=[int(n) for n in ending.attrib.get('number','1').replace(' ','').split(',') if n.isdigit()]
            cursor, previous_onset, maximum = 0.0, 0.0, 0.0
            for element in measure:
                if element.tag == 'attributes':
                    divisions[pid] = int(element.findtext('divisions', str(divisions[pid])))
                    ts = element.find('time')
                    if ts is not None:
                        time_sig = {'num': sum(int(b) for b in ts.findtext('beats', '4').split('+')), 'den': int(ts.findtext('beat-type', '4'))}
                        has_time = True
                elif element.tag in ('backup', 'forward'):
                    duration = int(element.findtext('duration', '0')) / divisions[pid]
                    cursor += duration * (-1 if element.tag == 'backup' else 1)
                elif element.tag == 'note':
                    duration = int(element.findtext('duration', '0')) / divisions[pid]
                    chord = element.find('chord') is not None
                    onset = previous_onset if chord else cursor
                    pitch = element.find('pitch')
                    midi = None
                    diatonic = None
                    if pitch is not None:
                        step, octave = pitch.findtext('step'), int(pitch.findtext('octave'))
                        midi = (octave + 1) * 12 + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[step] + int(float(pitch.findtext('alter', '0')))
                        diatonic = octave * 7 + 'CDEFGAB'.index(step)
                    event = {'id': f'{pid}-m{mi+1}-n{len(batch)}', 'part': pid, 'midi': midi,
                             'measure': mi + 1, 'sourceMeasure': measure.attrib.get('number'),
                             'beat': onset, 'duration': duration, 'time': absolute + onset,
                             'page': geo['page'] if geo else None, 'x': None, 'y': None,
                             'voice': element.findtext('voice', '1'), 'staff': element.findtext('staff', '1'),
                             'tieStart': any(x.attrib.get('type') == 'start' for x in element.findall('tie')),
                             'tieStop': any(x.attrib.get('type') == 'stop' for x in element.findall('tie')),
                             'uncertain': True, '_diatonic': diatonic}
                    batch.append(event)
                    maximum = max(maximum, onset + duration)
                    if not chord:
                        previous_onset = onset
                        cursor += duration
            lengths.append(maximum)
        if mi == 0 and not has_time:
            warnings.append('No opening time signature was recognized. Confirm the default 4/4 before practising.')
        groups = defaultdict(list)
        for event in batch:
            groups[(event['part'], event['voice'], round(event['beat'], 6))].append(event)
        for key, group in groups.items():
            candidates = list(geo['groups'].get(key, [])) if geo else []
            for rest in (False, True):
                matching_events = sorted((e for e in group if (e['midi'] is None) == rest), key=lambda e: e['_diatonic'] or 0, reverse=True)
                matching_heads = sorted((h for h in candidates if h['rest'] == rest), key=lambda h: h['y'])
                if len(matching_events) != len(matching_heads):
                    continue
                for event, head in zip(matching_events, matching_heads):
                    event.update({k: v for k, v in head.items() if k != 'rest'})
                    event['uncertain'] = head['recognitionGrade'] < 0.65
        duration = max(lengths, default=0) or (time_sig['num'] * 4 / time_sig['den'])
        measures.append({'number': mi + 1, 'start': absolute, 'duration': duration, 'timeSig': dict(time_sig), 'page': geo['page'] if geo else None})
        absolute += duration
        for event in batch:
            event.pop('_diatonic', None)
        events.extend(batch)
    irregular = [m['number'] for m in measures if abs(m['duration'] - m['timeSig']['num'] * 4 / m['timeSig']['den']) > 0.00001]
    if irregular:
        warnings.append(f'Measures {", ".join(map(str, irregular))} have incomplete or irregular timing. Check pickups and recognition errors.')
    repeats,repeat_marks,endings=[],[],[]
    stack=[]
    for mi in range(1,count+1):
        if (mi,'forward') in repeat_specs:stack.append(mi)
        if (mi,'backward') in repeat_specs:
            start=stack.pop() if stack else 1
            repeat={'id':f'repeat-{start}-{mi}','startMeasure':start,'endMeasure':mi,'times':repeat_specs[(mi,'backward')]};repeats.append(repeat)
            for number,side in [(start,'left'),(mi,'right')]:
                if number<=len(geometry):repeat_marks.extend(dict(mark,repeatId=repeat['id']) for mark in geometry[number-1]['repeatMarks'][side])
    opened=None
    for (mi,kind),numbers in sorted(ending_specs.items(),key=lambda x:(x[0][0],x[0][1]!='start')):
        if kind=='start':opened={'startMeasure':mi,'numbers':numbers}
        elif opened:
            opened['endMeasure']=mi
            region=next((r for r in reversed(repeats) if r['startMeasure']<=opened['startMeasure']<=r['endMeasure']+1),None)
            if region:opened['repeatId']=region['id'];endings.append(opened)
            opened=None
    if repeats:warnings.append('Written repeat barlines are followed automatically and highlighted until the final pass. Review repeat counts and endings against the print.')
    if score.findall('.//direction-type/segno') or score.findall('.//direction-type/coda'):warnings.append('D.S., D.C. and coda navigation needs manual practice loops.')
    missing = sum(e['midi'] is not None and e['x'] is None for e in events)
    if missing:
        warnings.append(f'{missing} pitched notes could not be positioned safely. Review them before practice.')
    warnings.append('Automatic recognition needs review: symbol confidence does not guarantee correct pitch or rhythm.')
    if any(p['name'] == 'Voice' for p in parts):
        warnings.append('Some part names were not recognized. Rename the parts in score review.')
    for rows in staves.values():
        for system in sorted({row['system'] for row in rows}):
            counts = [sum(row['part'] == p['id'] and row['system'] == system for row in rows) for p in parts]
            if counts == [1, 1, 1, 1, 2]:
                for part, suggested in zip(parts, ['Soprano', 'Alto', 'Tenor', 'Bass', 'Piano']):
                    part['suggestedName'] = suggested
                break
    return {'parts': parts, 'events': events, 'measures': measures, 'staves': staves, 'warnings': warnings,
            'duration': absolute, 'repeats':repeats,'repeatMarks':repeat_marks,'endings':endings, 'recognition': {'engine': 'Audiveris', 'version': '5.11.0', 'reviewRequired': True}}


def recognize(pdf_path, pages, output_dir, progress=None, timeout=900, cancel_event=None):
    """Recognize zero-based original PDF pages, preserving original page identity."""
    cli = Path(os.environ.get('AUDIVERIS_CLI', str(DEFAULT_CLI))).resolve()
    if not cli.is_file():
        raise RuntimeError('Audiveris is not installed. Set AUDIVERIS_CLI or run the local setup instructions.')
    if not pages or any(not isinstance(p, int) or p < 0 for p in pages):
        raise ValueError('Choose one or more valid zero-based page numbers.')
    out = Path(output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    # A contiguous input also prevents Audiveris from exporting disjoint selected
    # pages as separate movements. Keep the original identity in the result.
    from pypdf import PdfReader, PdfWriter
    page_map = sorted(set(pages))
    reader = PdfReader(str(pdf_path))
    if page_map[-1] >= len(reader.pages):
        raise ValueError('A selected page is outside the PDF.')
    writer = PdfWriter()
    for page in page_map:
        writer.add_page(reader.pages[page])
    selected_pdf = out / 'selected-pages.pdf'
    with selected_pdf.open('wb') as handle:
        writer.write(handle)
    env = os.environ.copy()
    # Batch exports need fonts, but no graphics event loop. On macOS AWT can
    # otherwise keep the JVM alive after a successful MusicXML/OMR export.
    env['JAVA_TOOL_OPTIONS'] = (env.get('JAVA_TOOL_OPTIONS', '') + ' -Djava.awt.headless=true').strip()
    tessdata = ROOT / '.runtime/tessdata'
    if tessdata.is_dir():
        env['TESSDATA_PREFIX'] = str(tessdata)
    args = [str(cli), '-batch', '-transcribe', '-export', '-save', '-output', str(out), '--', str(selected_pdf)]
    if progress:
        progress({'stage': 'recognizing', 'message': 'Reading pitches, rhythms, and staff positions.'})
    started = time.monotonic()
    with (out / 'recognition.log').open('w') as log:
        run = subprocess.Popen(args, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        while run.poll() is None:
            cancelled = cancel_event is not None and cancel_event.is_set()
            timed_out = time.monotonic() - started > timeout
            if cancelled or timed_out:
                try:
                    os.killpg(run.pid, signal.SIGTERM)
                    run.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    os.killpg(run.pid, signal.SIGKILL)
                    run.wait(timeout=2)
                except ProcessLookupError:
                    pass
                raise RuntimeError('Recognition cancelled.' if cancelled else 'Recognition timed out. Try fewer pages.')
            try:
                run.wait(timeout=0.5)
            except subprocess.TimeoutExpired:
                pass
    mxls, omrs = sorted(out.glob('*.mxl')), sorted(out.glob('*.omr'))
    if run.returncode or not mxls or not omrs:
        if os.environ.get('RAILWAY_PROJECT_ID'):
            print('Audiveris failed, exit code:',run.returncode,flush=True)
            print('\n'.join((out / 'recognition.log').read_text(errors='replace').splitlines()[-80:]),flush=True)
        raise RuntimeError('Recognition could not export a score. Inspect recognition.log and retry with a clean score PDF.')
    if len(mxls) != 1:
        raise RuntimeError('Selected pages exported as multiple movements. Select a continuous passage or import movements separately.')
    lines = (out / 'recognition.log').read_text(errors='replace').splitlines()
    warnings = [line.split('|', 1)[-1].strip() for line in lines if line.startswith('WARN')]
    result = parse_result(mxls[0], omrs[0], warnings)
    for item in result['events'] + result['measures'] + result.get('repeatMarks',[]):
        if item['page'] is not None:
            item['page'] = page_map[item['page']]
    result['staves'] = {page_map[int(page)]: rows for page, rows in result['staves'].items()}
    if any(b-a>1 for a,b in zip(page_map,page_map[1:])):
        result['warnings'].append('Selected pages contain gaps. Playback joins the selected pages in their chosen order; verify bar transitions across omitted passages.')
    result['selectedPages'] = page_map
    result['recognition']['seconds'] = round(time.monotonic() - started, 2)
    (out / 'recognized-score.json').write_text(json.dumps(result, indent=2))
    if progress:
        progress({'stage': 'review', 'message': 'Recognition completed. Review the notes and part names.'})
    return result


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--pages', default='1', help='Comma-separated one-based original PDF pages')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = recognize(args.pdf, [int(p) - 1 for p in args.pages.split(',')], args.output)
    print(json.dumps({'parts': result['parts'], 'events': len(result['events']), 'measures': len(result['measures']), 'warnings': result['warnings']}))
