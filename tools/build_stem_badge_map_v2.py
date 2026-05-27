import json, yaml, re, textwrap, collections, os
from pathlib import Path
MASTER=Path('/mnt/data/repo_check/STEM-Scouts-main/_data/badges_master.json')
OUT=Path('/mnt/data/stem_v21/copy_to_repo/_data/stem_badge_map.yml')

def clean(s):
    return re.sub(r'\s+', ' ', str(s or '').strip())

def lower(s): return clean(s).lower()

def has_any(t, words):
    return any(re.search(r'\b'+re.escape(w)+r'\b', t) for w in words)

def contains_phrase(t, phrases):
    return any(p in t for p in phrases)

DOMAINS = {
    'Computing & digital systems': ['code','coding','program','programming','algorithm','debug','digital','computer','internet','online','app','website','web page','robot','animation','game','software','spreadsheet','presentation','email','cyber','password','privacy'],
    'Electronics & circuits': ['circuit','electronic','electronics','solder','led','battery','switch','wire','motor','sensor','current','voltage','resistor','component','buzzer','pcb','microbit','micro:bit'],
    'Science & investigation': ['experiment','investigate','investigation','scientist','science','test','fair test','predict','prediction','observe','observation','evidence','result','variable','hypothesis','light','sound','force','forces','energy','heat','temperature','magnet','chemical','physics','microscope'],
    'Environment & nature': ['animal','animals','plant','plants','wildlife','habitat','species','tree','trees','leaf','seed','garden','gardener','pond','river','insect','minibeast','bird','birds','fish','conservation','environment','biodiversity','climate','weather','water','soil','ocean','forest','beach','recycling','pollution','litter','natural world','nature'],
    'Maths & data': ['measure','measurement','measuring','record','records','chart','graph','table','calculate','calculation','estimate','count','compare','sort','classify','classification','survey','scale','ratio','time','timing','distance','speed','angle','budget','cost','money','quantity','weight','mass','length','height','percentage','data'],
    'Engineering & design': ['design','build','building','built','construct','model','bridge','tower','structure','shelter','tent','tool','tools','repair','fix','improve','improvement','prototype','mechanism','machine','gear','pulley','wheel','pioneering','invent','invention'],
    'Materials & structures': ['material','materials','cardboard','wood','metal','plastic','clay','fabric','recycled','bridge','tower','shelter','structure','tent','rope','knot','knots','strong','stable','waterproof','load','loads','friction'],
    'Health, food & body science': ['cook','cooking','recipe','food','meal','nutrition','hygiene','heart','pulse','heartbeat','body','exercise','fitness','health','first aid','bacteria','disease','sleep','energy','diet'],
    'Mapping, navigation & spatial reasoning': ['map','maps','compass','grid','bearing','route','navigate','navigation','direction','directions','coordinates','journey','hike','trail','orienteering','gps','scale'],
    'Space, air, radio & communications': ['space','moon','planet','planets','star','stars','telescope','rocket','satellite','orbit','international space station','iss','radio','morse','signal','antenna','broadcast','transmitter','receiver','aircraft','aeroplane','airplane','flight','fly','flying','aviation'],
    'Safety systems & risk thinking': ['safety','hazard','risk','emergency','danger','control','safe','weather','fire','water safety','road safety','traffic','first aid','rescue','accident']
}
DOMAIN_CANON = list(DOMAINS.keys())

STRONG_ACTIONS = ['measure','record','monitor','investigate','experiment','test','compare','identify','classify','observe','survey','calculate','estimate','code','program','debug','map','compass','navigate','use a compass','plot','sample']
FRAMED_ACTIONS = ['design','build','make','construct','model','plan','cook','care','look after','find out','learn','research','explain','tell','show','create','prepare','repair','improve','explore','visit']
EXCLUDE_PHRASES = [
    'take part in a game','play a game','go for a short ride','visit a cub, scout or group camp','learn how to make a phone call','learn your phone number','make a bookmark','favourite book','play a wide game','sing songs','perform','dance','write a poem','write a story','read a book','favourite book',
    'greetings card','decorated book cover','decorate','decorated','poster','picture','painting','collage','scrapbook','display','draw a picture','make a card',
    'promise','law','prayer','faith','belief','fundraise','community event','help someone','good turn','friendship','teamwork challenge'
]
# Terms that rescue an otherwise creative requirement because communication/design is about STEM content.
RESCUE_STEM_CONTEXT = ['space','planet','animal','plant','wildlife','habitat','weather','map','route','experiment','science','data','model','bridge','tower','shelter','circuit','digital','code','food','health','nature','environment']

DOMAIN_THINKING = {
    'Computing & digital systems': ['model', 'debug', 'test', 'explain'],
    'Electronics & circuits': ['build', 'test', 'debug', 'explain'],
    'Science & investigation': ['predict', 'observe', 'test', 'explain'],
    'Environment & nature': ['observe', 'classify', 'compare', 'record'],
    'Maths & data': ['measure', 'record', 'calculate', 'compare'],
    'Engineering & design': ['design', 'build', 'test', 'improve'],
    'Materials & structures': ['compare', 'test', 'evaluate', 'improve'],
    'Health, food & body science': ['measure', 'control', 'compare', 'explain'],
    'Mapping, navigation & spatial reasoning': ['plan', 'measure', 'navigate', 'evaluate'],
    'Space, air, radio & communications': ['model', 'observe', 'compare', 'communicate'],
    'Safety systems & risk thinking': ['identify', 'predict', 'control', 'justify'],
}

DOMAIN_WHY_DIRECT = {
    'Computing & digital systems': 'young people work with digital systems, instructions, inputs/outputs or debugging rather than only using a device passively',
    'Electronics & circuits': 'young people build or reason about a working electrical system, components, connections and fault-finding',
    'Science & investigation': 'young people use scientific enquiry: observing, testing, predicting, comparing results or explaining evidence',
    'Environment & nature': 'young people investigate living things or environments through observation, identification, classification or records',
    'Maths & data': 'young people use numbers, measurements, records, graphs, estimates or comparisons to make sense of something',
    'Engineering & design': 'young people design, build, test or improve something against a purpose or constraint',
    'Materials & structures': 'young people compare materials, structures, strength, stability or how things behave under conditions',
    'Health, food & body science': 'young people connect practical activity to body science, nutrition, hygiene, variables, timing or cause-and-effect',
    'Mapping, navigation & spatial reasoning': 'young people use maps, scale, direction, route planning or spatial reasoning to solve a practical problem',
    'Space, air, radio & communications': 'young people explore real STEM systems such as space, flight, signals, communication or radio technology',
    'Safety systems & risk thinking': 'young people reason about hazards, causes, controls and how a system can be made safer',
}
DOMAIN_FRAME = {
    'Computing & digital systems': 'ask them to describe the process or algorithm, test it, find faults, and explain what changed',
    'Electronics & circuits': 'ask them to predict what should happen, test the circuit, find faults, and explain how the components work together',
    'Science & investigation': 'ask them to make a prediction, collect evidence, compare results, and explain what the evidence shows',
    'Environment & nature': 'ask them to observe carefully, identify or classify what they find, record evidence, and compare habitats or changes over time',
    'Maths & data': 'ask them to estimate first, measure or record accurately, compare values, and explain what the numbers show',
    'Engineering & design': 'give them a real constraint, ask them to test the result, compare options, and improve one feature',
    'Materials & structures': 'ask them to compare materials or structures, test strength/stability, and explain why one choice worked better',
    'Health, food & body science': 'ask them to control part of the process, measure or compare a result, and explain the science behind the change',
    'Mapping, navigation & spatial reasoning': 'ask them to plan the route, use scale/direction, check the result, and explain their navigation choices',
    'Space, air, radio & communications': 'ask them to model the system, compare examples, or explain how information, objects or signals move',
    'Safety systems & risk thinking': 'ask them to identify the hazard, explain the cause-and-effect, choose controls, and justify why those controls reduce risk',
}
DOMAIN_EVIDENCE = {
    'Computing & digital systems': 'flowchart, code, screenshot, test/debug notes, or explanation of input-process-output',
    'Electronics & circuits': 'completed circuit, wiring diagram, fault-finding notes, test result, or explanation of component roles',
    'Science & investigation': 'prediction, observation notes, results table, comparison, photo evidence, or short conclusion',
    'Environment & nature': 'identification record, field notes, photos, classification table, habitat comparison, or change-over-time record',
    'Maths & data': 'measurement table, graph, estimate-versus-result comparison, calculation, or explanation of the numbers',
    'Engineering & design': 'design sketch, prototype/photo, constraint list, test result, improvement note, or final explanation',
    'Materials & structures': 'material comparison, test result, labelled model, before/after improvement, or explanation of strength/stability',
    'Health, food & body science': 'recipe scaling, timing/temperature note, pulse/health data, hygiene explanation, or controlled comparison',
    'Mapping, navigation & spatial reasoning': 'route plan, map annotation, bearing/grid reference, distance estimate, or navigation reflection',
    'Space, air, radio & communications': 'model, labelled diagram, observation record, comparison table, signal/message test, or explanation',
    'Safety systems & risk thinking': 'hazard-control table, annotated plan, risk explanation, safety checklist, or justification of controls',
}
DOMAIN_CAUTION = {
    'Engineering & design': 'Do not count this as STEM if it is only decorative making; include a purpose, constraint, test or improvement.',
    'Materials & structures': 'Do not count this as STEM if materials are only chosen for appearance; compare behaviour, strength or suitability.',
    'Health, food & body science': 'Do not count this as STEM if it is only following instructions; include timing, measurement, comparison or explanation.',
    'Environment & nature': 'Do not count this as STEM if it is only a walk or chat; include observation, identification, records or comparison.',
    'Safety systems & risk thinking': 'Do not count this as STEM if it is only rule-following; include cause-and-effect and why the controls work.',
    'Computing & digital systems': 'Do not count this as STEM if the device is only used as a display tool; include process, testing or debugging.',
    'Maths & data': 'Do not count this as STEM if numbers are mentioned but not used; include measurement, comparison or interpretation.',
    'Science & investigation': 'Do not count this as STEM if it is only fact-finding; include evidence, comparison or explanation.',
    'Mapping, navigation & spatial reasoning': 'Do not count this as STEM if the route is simply followed; include map reading, scale, direction or route evaluation.',
    'Space, air, radio & communications': 'Do not count this as STEM if it is only a story or drawing; include a model, observation, signal idea or explanation.',
    'Electronics & circuits': 'Do not count this as STEM if it is only assembly; include testing, component roles or fault-finding.',
}

def detect_domains(text, badge):
    t=lower(text+' '+badge.get('badge_name','')+' '+badge.get('category',''))
    domains=[]
    for dom, words in DOMAINS.items():
        if contains_phrase(t, [w for w in words if ' ' in w]) or has_any(t, [w for w in words if ' ' not in w]):
            domains.append(dom)
    # badge-name based nudges
    name=lower(badge.get('badge_name',''))
    if 'space' in name or 'astronom' in name: domains += ['Space, air, radio & communications','Science & investigation']
    if 'digital' in name or 'computer' in name: domains += ['Computing & digital systems']
    if 'scientist' in name or 'experiment' in name: domains += ['Science & investigation']
    if 'naturalist' in name or 'gardener' in name or 'animal' in name: domains += ['Environment & nature','Science & investigation']
    if 'navigator' in name or 'orienteer' in name or 'hikes away' in name: domains += ['Mapping, navigation & spatial reasoning','Maths & data']
    if 'chef' in name or 'cook' in name or 'health' in name or 'fitness' in name: domains += ['Health, food & body science']
    if 'builder' in name or 'diy' in name or 'mechanic' in name or 'model maker' in name: domains += ['Engineering & design','Materials & structures']
    if 'radio' in name: domains += ['Space, air, radio & communications']
    # de-dup maintain order
    out=[]
    for d in domains:
        if d not in out: out.append(d)
    return out

def is_creative_only(t, domains):
    has_excl=contains_phrase(t, EXCLUDE_PHRASES) or has_any(t, ['poster','picture','poem','story','song','dance','decorated','decorate','painting','collage','scrapbook','display'])
    if not has_excl: return False
    # rescue if it clearly communicates STEM content or is a model/structure
    if contains_phrase(t, RESCUE_STEM_CONTEXT) or any(d in domains for d in ['Science & investigation','Environment & nature','Space, air, radio & communications','Engineering & design','Materials & structures','Electronics & circuits','Computing & digital systems']):
        # Still exclude decorative book cover/greetings card specifically unless explicit STEM terms beyond design.
        if ('book cover' in t or 'favourite book' in t or 'design a cover' in t or 'greetings card' in t or 'decorate' in t or 'decorated' in t) and not any(x in t for x in ['circuit','led','mechanism','moving','pop-up','model','space','animal','plant','data','map']):
            return True
        return False
    return True

def action_profile(t):
    strong=[]; framed=[]
    for w in STRONG_ACTIONS:
        if w in t: strong.append(w)
    for w in FRAMED_ACTIONS:
        if w in t: framed.append(w)
    return strong, framed

def choose_primary(domains):
    priority=['Electronics & circuits','Computing & digital systems','Mapping, navigation & spatial reasoning','Space, air, radio & communications','Science & investigation','Maths & data','Engineering & design','Materials & structures','Health, food & body science','Environment & nature','Safety systems & risk thinking']
    for p in priority:
        if p in domains: return p
    return domains[0] if domains else None

def include_and_relevance(req_text, badge, domains):
    t=lower(req_text)
    if not domains: return None
    if is_creative_only(t, domains): return None
    strong, framed = action_profile(t)
    primary=choose_primary(domains)
    # Strong direct domain special cases
    if any(d in domains for d in ['Electronics & circuits','Computing & digital systems']) and (strong or has_any(t,['build','make','create','use','explain','show','demonstrate','design'])):
        return 'direct'
    if 'Mapping, navigation & spatial reasoning' in domains and (strong or has_any(t,['route','journey','hike','trail','plan'])):
        return 'direct'
    if 'Space, air, radio & communications' in domains and (strong or has_any(t,['find','explore','learn','show','explain','model','build','make'])):
        # If merely craft a picture about space, framed
        return 'direct' if not is_creative_only(t, []) else 'framed'
    if 'Science & investigation' in domains and (strong or any(w in t for w in ['experiment','investigate','observe','test','record','monitor','compare','identify','classify'])):
        return 'direct'
    if 'Maths & data' in domains and (strong or any(w in t for w in ['measure','record','calculate','estimate','graph','chart','table','budget','scale','time','distance'])):
        return 'direct'
    if 'Environment & nature' in domains and any(w in t for w in ['observe','record','identify','classify','compare','survey','monitor','keep a note','keep a record']):
        return 'direct'
    if 'Engineering & design' in domains and any(w in t for w in ['design','build','construct','model','make','repair','fix','improve','test']):
        # Direct if functional object/structure or model; otherwise framed
        if any(w in t for w in ['model','bridge','tower','shelter','tent','machine','mechanism','tool','repair','fix','structure','build','construct','prototype','test','improve']):
            return 'direct'
        return 'framed'
    # Food/health can be direct only with measure/monitor/explain; cooking is framed
    if 'Health, food & body science' in domains:
        if any(w in t for w in ['monitor','measure','heartbeat','pulse','explain','understand','nutrition','hygiene','bacteria','compare']):
            return 'direct'
        if any(w in t for w in ['cook','recipe','meal','food','health','fitness','first aid','exercise']):
            return 'framed'
    if 'Safety systems & risk thinking' in domains:
        if any(w in t for w in ['hazard','risk','safety','weather','emergency','first aid','fire','water','road','traffic','helmet','reflective','lights','equipment','safe']):
            # Simple participation in a safe place is not enough; focus on explaining hazards/controls/equipment.
            if any(w in t for w in ['why','hazard','risk','explain','learn','find out','equipment','helmet','reflective','lights','control','weather','emergency','first aid','fire','road','traffic','water']):
                return 'framed'
    # General framed if there are domain and legitimate framed actions
    if framed and not (contains_phrase(t, ['tell others','talk about']) and len(domains)==1 and domains[0]=='Safety systems & risk thinking'):
        return 'framed'
    # Fact-finding in STEM domain is at least framed
    if any(w in t for w in ['find out','learn','research','explain','tell','show']) and not is_creative_only(t, domains):
        return 'framed'
    return None

def summarise(text, maxlen=190):
    s=clean(text)
    if len(s)<=maxlen: return s
    return s[:maxlen].rsplit(' ',1)[0]+'…'

def build_entry(badge, req, domains, relevance):
    primary=choose_primary(domains)
    domains=domains[:4]
    thinking=[]
    for d in domains:
        for x in DOMAIN_THINKING.get(d,[]):
            if x not in thinking: thinking.append(x)
    thinking=thinking[:6]
    text=clean(req.get('text',''))
    reqno=str(req.get('no') or req.get('id'))
    stem_opp = DOMAIN_WHY_DIRECT.get(primary, 'young people use STEM thinking as part of the activity')
    opp = re.sub(r'^young people\s+', '', stem_opp)
    focus = summarise(text, 90)
    if relevance=='direct':
        why=f"The STEM opportunity is in the requirement itself: \"{focus}\". Young people can be asked to {opp}."
    else:
        why=f"The badge task is \"{focus}\". It becomes STEM when the leader uses it to add chances for young people to {opp}."
    framing=DOMAIN_FRAME.get(primary,'ask them to use evidence, make choices, test an idea and explain what changed')
    evidence=DOMAIN_EVIDENCE.get(primary,'notes, photos, comparison, explanation or improved version')
    caution='' if relevance=='direct' else DOMAIN_CAUTION.get(primary,'Do not count this as STEM if it is only completed as a practical task without evidence, testing, measuring, comparing or explanation.')
    return {
        'rid': f"{badge['id']}::{reqno}",
        'ref': reqno,
        'requirement_summary': summarise(text),
        'text': text,
        'stem_relevance': relevance,
        'strength': relevance,
        'areas': domains,
        'stem_thinking': thinking,
        'why_stem': why,
        'leader_framing': framing[0].upper()+framing[1:] if framing else '',
        'evidence': evidence[0].upper()+evidence[1:] if evidence else '',
        'caution': caution,
    }

def build():
    arr=json.load(open(MASTER))
    out=[]
    stats=collections.Counter()
    for b in arr:
        if b.get('status')=='retired':
            continue
        req_entries=[]
        for r in b.get('requirements') or []:
            if r.get('kind')!='req': continue
            text=clean(r.get('text'))
            if not text: continue
            domains=detect_domains(text,b)
            rel=include_and_relevance(text,b,domains)
            if not rel: continue
            req_entries.append(build_entry(b,r,domains,rel))
            stats[rel]+=1
        if req_entries:
            out.append({
                'badge_id': b['id'],
                'title': b.get('badge_name') or b['id'],
                'section': b.get('section_label') or b.get('section'),
                'section_slug': b.get('section'),
                'category': b.get('category') or '',
                'badge_type': b.get('type') or b.get('badge_type') or '',
                'stem_requirements': req_entries
            })
    data={
        'schema_version':'2.1',
        'notes': 'First human-judgement pass. Direct links are intrinsic STEM. Framed links are realistic opportunities to put STEM into normal Scout activities when leaders add evidence, testing, measuring, comparison, design constraints or explanation.',
        'badges': out
    }
    OUT.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=110), encoding='utf-8')
    print('badges',len(out),'reqs',sum(len(b['stem_requirements']) for b in out),stats)
    return data
if __name__=='__main__': build()
