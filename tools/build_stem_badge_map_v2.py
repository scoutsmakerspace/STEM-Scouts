import json, yaml, re, pathlib, textwrap, collections
root=pathlib.Path('/mnt/data/repo_check/STEM-Scouts-main')
master=json.load(open(root/'_data/badges_master.json'))

# Broad but disciplined STEM judgement model.
DOMAIN_LABELS = {
    'science_investigation': 'Science & investigation',
    'maths_data': 'Maths & data',
    'engineering_design': 'Engineering & design',
    'computing_digital': 'Computing & digital',
    'electronics_circuits': 'Electronics & circuits',
    'materials_structures': 'Materials & structures',
    'environment_nature': 'Environment & nature',
    'health_food_body': 'Health, food & body science',
    'mapping_navigation': 'Mapping, navigation & spatial reasoning',
    'space_radio': 'Space, air, radio & communications',
    'mechanisms_machines': 'Mechanisms & machines',
    'safety_systems': 'Safety systems & risk thinking',
}
THINKING_LABELS = {
    'observe': 'observe', 'measure': 'measure', 'compare': 'compare', 'classify': 'classify',
    'predict': 'predict', 'test': 'test', 'record': 'record', 'calculate': 'calculate',
    'design': 'design', 'build': 'build', 'debug': 'debug', 'improve': 'improve',
    'model': 'model', 'control': 'control', 'communicate': 'communicate', 'evaluate': 'evaluate',
    'explain': 'explain', 'plan': 'plan', 'map': 'map', 'research': 'research'
}

# Badge themes: these set the likely STEM pathway, but individual requirements can still be excluded.
THEMES = [
    (r'digital|coding|computer|online', 'direct', ['computing_digital'], ['debug','design','communicate','evaluate'], 'Digital skills naturally support computing, systems thinking and safe use of technology.'),
    (r'electronics|circuit|solder', 'direct', ['electronics_circuits','engineering_design'], ['build','test','debug','explain'], 'Electronics activities involve circuits, components, testing and troubleshooting.'),
    (r'scientist|experiment|science and technology|exciting experiments', 'direct', ['science_investigation'], ['observe','predict','test','record','explain'], 'This is directly about scientific investigation: asking questions, testing ideas and explaining results.'),
    (r'space|astronom|air research|air spotter|air activities|air or sea navigation', 'direct', ['space_radio','science_investigation'], ['observe','research','model','explain','communicate'], 'Space and air activities naturally link to observation, models, forces, flight, communications and real engineering systems.'),
    (r'navigator|navigation|orienteer|geocaching|hill walker|hikes away|local knowledge|explorer belt', 'framed', ['mapping_navigation','maths_data'], ['map','measure','plan','calculate','evaluate'], 'This can become STEM when young people use maps, scale, grid references, bearings, route planning or spatial reasoning.'),
    (r'pioneer|builder|model maker|diy|craft|brilliant builder|activity centre service', 'framed', ['engineering_design','materials_structures'], ['design','build','test','improve','evaluate'], 'This becomes STEM when young people design under constraints, choose materials, test what works and improve the result.'),
    (r'mechanic|cyclist|cycling|motor sports|mountain biking', 'framed', ['mechanisms_machines','safety_systems'], ['observe','test','explain','evaluate'], 'This can support STEM through mechanisms, maintenance, forces, friction, safety systems and cause-and-effect reasoning.'),
    (r'naturalist|gardener|let it grow|go wild|environment|earth tribe|conservation|farming|forester|angler|animal|equestrian', 'framed', ['environment_nature','science_investigation'], ['observe','classify','record','compare','explain'], 'This can become STEM through observation, classification, habitats, ecosystems, change over time and evidence-based explanation.'),
    (r'chef|cook|cooking|super chef|backwoods cooking', 'framed', ['health_food_body','maths_data','science_investigation'], ['measure','calculate','control','compare','explain'], 'Cooking can become STEM through ratios, timing, heat transfer, hygiene, nutrition, states of matter and process control.'),
    (r'health|fitness|athletics|sports|physical|martial arts|street sports|skater|swimmer|racquet', 'framed', ['health_food_body','maths_data'], ['measure','record','compare','evaluate'], 'Physical activity can support STEM when young people measure performance, compare data, understand the body or evaluate improvement.'),
    (r'money|fundraising', 'direct', ['maths_data'], ['calculate','record','compare','evaluate'], 'Money and fundraising activities naturally use calculation, data, budgeting and evidence-based decision making.'),
    (r'photographer|media|marketing', 'framed', ['computing_digital','science_investigation'], ['observe','compare','communicate','evaluate'], 'Media and photography can support STEM through optics, digital tools, image data, audience testing and evidence-based communication.'),
    (r'communicator|radio', 'framed', ['space_radio','computing_digital'], ['communicate','test','explain','evaluate'], 'Communication activities can support STEM through signals, protocols, clarity, error reduction and communication technology.'),
    (r'safety|fire safety|home safety|personal safety|lifesaver|emergency aid|survival', 'framed', ['safety_systems','science_investigation'], ['observe','evaluate','explain','control'], 'Safety activities can support STEM when young people identify hazards, understand cause and effect, and explain controls.'),
    (r'collector|hobbies', 'framed', ['science_investigation','maths_data'], ['classify','record','compare','communicate'], 'Collections and hobbies can become STEM when young people classify items, record evidence, compare patterns or explain how something works.'),
]

# Strong/direct keywords in the requirement text.
KW_DIRECT = [
    (r'\bexperiment|investigat|test\b|fair test|variables?|hypothesis|predict|observe|observation|evidence|result|conclusion', ['science_investigation'], ['predict','test','observe','record','explain']),
    (r'\b(measure|measurement|weigh|temperature|heart ?beat|pulse|timed|timing|speed|distance|height|length|volume|scale|ratio|budget|cost|money|calculate|data|graph|chart|record|keep a record)\b', ['maths_data'], ['measure','record','calculate','compare']),
    (r'\b(circuit|electronic|component|battery|led|resistor|solder|wire|switch|voltage|current)\b', ['electronics_circuits'], ['build','test','debug','explain']),
    (r'\b(code|program|algorithm|debug|computer|digital|app|website|online|simulation|spreadsheet)\b', ['computing_digital'], ['design','debug','evaluate','communicate']),
    (r'\bmap|grid reference|bearing|compass|route|navigate|navigation|scale|coordinates|gps|geocach', ['mapping_navigation'], ['map','measure','plan','calculate','evaluate']),
    (r'\b(space|planet|moon|sun|star|rocket|satellite|orbit|iss|aircraft|flight|aeroplane|cloud|wind|air pressure|atmosphere)\b', ['space_radio','science_investigation'], ['observe','research','model','explain']),
]

KW_FRAMED = [
    (r'\b(design|build|construct|model|prototype|repair|fix|improve|engineer|make a model|make .*model|make .*shelter|make .*structure|make .*vehicle|make .*device|make .*circuit|make .*machine)\b', ['engineering_design'], ['design','build','improve','evaluate']),
    (r'\b(materials?|wood|metal|plastic|fabric|rope|knot|lash|structure|bridge|tower|shelter|tent|fire|waterproof|strong|strength|stable|stability)\b', ['materials_structures'], ['design','build','test','evaluate']),
    (r'\banimal|plant|tree|leaf|habitat|species|wildlife|nature|garden|soil|water|light|grow|environment|conservation|biodiversity|fish|pond|river', ['environment_nature'], ['observe','classify','record','compare']),
    (r'\b(cook|meal|food|recipe|ingredient|hygiene|nutrition|balanced diet|heat|boil|bake|temperature)\b', ['health_food_body','maths_data'], ['measure','control','compare','explain']),
    (r'\b(safety|hazard|risk|danger|emergency|fire|first aid|road|cycle|weather|bad weather|stop|stopping distance)\b', ['safety_systems'], ['observe','evaluate','explain','control']),
    (r'\b(communicat|message|radio|signal|morse|phonetic|antenna|interference|media|photo|photograph|video|camera)\b', ['space_radio','computing_digital'], ['communicate','test','evaluate']),
]

# Phrases that normally signal the requirement is only evidence/show/tell/admin unless other STEM signals are present.
WEAK_OR_ADMIN = re.compile(r'\b(tell others|talk to|show that you know|take part|try\b|visit|attend|find out about|learn about|write about|draw|decorate|poster|display|sing|song|game|scarf|shoelace|make your bed|keep your bedroom|address and phone|prayer|faith|promise|ceremony|performance|perform|entertain)\b', re.I)

# Requirements containing these are often still useful even if they also have weak/admin words.
EVIDENCE_WORDS = re.compile(r'\b(measure|record|data|compare|test|design|build|model|map|grid|bearing|route|calculate|experiment|observe|identify|classify|explain how|repair|circuit|code|weather|habitat|species|nutrition|budget|cost|risk|hazard|signal|radio|prototype|material|stable|stability)\b', re.I)

# Badge-specific exclusions. This is where the human judgement starts.
EXCLUDE_BADGE_PATTERNS = [
    r'faith|world faiths|international|book reader|entertainer|writer|librarian|leadership|membership|nights away|musician|performing arts|circus|parascending|snowports|paddle sports|sailing|time on water',
]

# But allow these staged/outdoor badges if the requirement itself has clear map/navigation/data/safety wording.
ALLOW_BY_REQUIREMENT_EVIDENCE = re.compile(r'\b(map|grid|bearing|route|compass|navigate|weather|tide|signal|safety|hazard|risk|measure|record|calculate|environment|conservation|species|habitat|identify|classify|test|repair|circuit|code)\b', re.I)

SECTION_LABEL = {'squirrels':'Squirrels','beavers':'Beavers','cubs':'Cubs','scouts':'Scouts','explorers':'Explorers','staged':'Staged'}


def clean_text(t):
    return re.sub(r'\s+', ' ', str(t or '')).strip()

def add_unique(seq, items):
    for x in items:
        if x not in seq: seq.append(x)

def badge_theme(badge):
    name = (badge['badge_name'] + ' ' + badge.get('description','') + ' ' + badge.get('id','')).lower()
    out=[]
    for pat, rel, domains, think, why in THEMES:
        if re.search(pat, name, re.I):
            out.append((rel, domains, think, why))
    return out

def simple_summary(text, maxlen=135):
    text=clean_text(text)
    # Remove leading numbering duplicated by no/ref.
    text=re.sub(r'^\d+\.\s*','',text)
    if len(text)<=maxlen: return text
    cut=text[:maxlen].rsplit(' ',1)[0]
    return cut+'…'

def judgement(badge, req):
    text=clean_text(req.get('text',''))
    if not text: return None
    name=badge['badge_name']
    bid=badge['id']
    lower=(name+' '+text+' '+bid).lower()

    # Generic social, story, creative or teamwork requirements are not STEM just because they involve making or problem solving.
    if re.search(r'\b(superhero|story|storyteller|make up your own story|choice for yourself|local area|make a difference|celebrate|song|performance|role play|poster|display|book cover|greetings card|decorated|setting yourself a challenge|personal challenge|team challenge)\b', lower, re.I):
        if not re.search(r'\b(model|prototype|measure|data|test|experiment|circuit|code|map|grid|bearing|route|species|habitat|camera|video|technical|scale|material|stable|stability)\b', text, re.I):
            return None
    if 'disability-awareness' in bid and not re.search(r'\b(equipment|assistive technology|adaptation|accessible|accessibility|design|test|compare)\b', text, re.I):
        return None

    domains=[]; thinking=[]; reasons=[]
    relevance=None

    # Initial badge theme.
    themes=badge_theme(badge)
    for rel, ds, th, why in themes:
        if relevance is None or rel=='direct':
            relevance=rel
        add_unique(domains, ds); add_unique(thinking, th); reasons.append(why)

    # Requirement direct/framed keyword signals.
    direct_hit=False
    for pat, ds, th in KW_DIRECT:
        if re.search(pat, text, re.I):
            direct_hit=True
            relevance='direct'
            add_unique(domains, ds); add_unique(thinking, th)
    framed_hit=False
    for pat, ds, th in KW_FRAMED:
        if re.search(pat, text, re.I):
            framed_hit=True
            if relevance is None: relevance='framed'
            add_unique(domains, ds); add_unique(thinking, th)

    # Exclude obvious non-STEM badges unless requirement has clear evidence.
    if any(re.search(pat, lower, re.I) for pat in EXCLUDE_BADGE_PATTERNS):
        if not ALLOW_BY_REQUIREMENT_EVIDENCE.search(text):
            return None

    # Exclude pure performance/admin/show/tell unless there is a real STEM evidence hook.
    if WEAK_OR_ADMIN.search(text) and not EVIDENCE_WORDS.search(text):
        return None

    # Don't include generic designing/decorating/drawing as STEM unless it adds model/build/test/constraints/etc.
    if re.search(r'cover|card|poster|decorate|drawing|painting|artwork', text, re.I):
        # allow models/design+build, photography/media, or explicit data/science communication
        if not re.search(r'build|model|prototype|test|measure|data|diagram|technical|camera|photo|digital|scale', text, re.I):
            return None
        if relevance == 'direct': relevance='framed'

    # If only badge theme exists and text is too broad, keep only if the badge is very STEM-specific or requirement indicates action.
    if relevance and not (direct_hit or framed_hit):
        if re.search(r'digital|electronic|scientist|experiment|space|meteorologist|navigator|orienteer|geocaching|mechanic|model maker|pioneer|naturalist|environment|conservation|gardener|money|health|fitness|athletics|chef|cook|safety|communicator|photographer', lower, re.I):
            # but avoid vague 'find out about' with no output for framed themes except direct science/space/digital
            if WEAK_OR_ADMIN.search(text) and relevance!='direct' and not EVIDENCE_WORDS.search(text):
                return None
        else:
            return None

    if not relevance:
        return None

    # Strength: direct/framed. Current page uses strong/borderline. Use direct/framed, but JS/CSS handles. For backwards filters, framed is visible when borderline included? We'll map in JS.
    if relevance == 'direct':
        strength = 'direct'
    else:
        strength = 'framed'

    if not domains:
        domains=['engineering_design'] if relevance=='framed' else ['science_investigation']
    if not thinking:
        thinking=['observe','explain'] if relevance=='direct' else ['design','evaluate']


    # Clean up accidental matches: 'Code' in Highway Code is safety/rules, not computing.
    if re.search(r'Highway Code|Code of Conduct', text, re.I) and 'computing_digital' in domains:
        domains=[d for d in domains if d!='computing_digital']
    # Compass contains no electronics; avoid stray circuit labels from substring matches in older rules.
    if not re.search(r'\b(circuit|electronic|component|battery|led|resistor|solder|wire|switch|voltage|current)\b', text, re.I):
        domains=[d for d in domains if d!='electronics_circuits']

    # Build a fresh human explanation based on domains and relevance.
    domset=set(domains)
    thset=set(thinking)
    if relevance=='direct':
        why = 'This is a direct STEM link because young people use STEM knowledge or methods as part of the requirement.'
    else:
        why = 'This can become meaningful STEM when the leader frames it around evidence, choices, constraints or explanation rather than just completing the task.'
    details=[]
    if 'science_investigation' in domset: details.append('asking questions, observing, testing ideas and explaining results')
    if 'maths_data' in domset: details.append('measuring, recording, comparing or calculating')
    if 'engineering_design' in domset or 'materials_structures' in domset: details.append('designing, building, testing and improving')
    if 'computing_digital' in domset: details.append('using digital systems, algorithms, debugging or online tools')
    if 'electronics_circuits' in domset: details.append('building and testing circuits or electronic systems')
    if 'environment_nature' in domset: details.append('observing, classifying and comparing living things or environments')
    if 'health_food_body' in domset: details.append('thinking about the body, nutrition, heat, hygiene or controlled processes')
    if 'mapping_navigation' in domset: details.append('using maps, scale, direction, routes or spatial reasoning')
    if 'space_radio' in domset: details.append('understanding signals, space, flight, radio or communication systems')
    if 'mechanisms_machines' in domset: details.append('exploring mechanisms, maintenance, forces or cause-and-effect')
    if 'safety_systems' in domset: details.append('identifying hazards, controls and why safer systems work')
    if details:
        why += ' In practice, this might involve ' + '; '.join(details[:3]) + '.'

    # Leader framing based on relevance/domains.
    if relevance=='direct':
        framing='Ask young people to explain the STEM idea they used, show evidence from the activity, and compare what they expected with what happened.'
    else:
        framing='Add a simple STEM frame: give a constraint, ask for a prediction or comparison, collect evidence, then ask what they would change or improve.'
    if 'environment_nature' in domset:
        framing='Turn this into STEM by asking young people to observe carefully, identify or classify what they find, record evidence, and compare habitats or changes over time.'
    elif 'health_food_body' in domset:
        framing='Turn this into STEM by asking young people to measure, time, compare or control part of the process, then explain what changed and why.'
    elif 'mapping_navigation' in domset:
        framing='Turn this into STEM by using grid references, scale, bearings, route choices, timing or distance estimates, then review how accurate the plan was.'
    elif 'engineering_design' in domset or 'materials_structures' in domset:
        framing='Turn this into STEM by setting a design constraint, testing the result, comparing materials or methods, and making one improvement.'
    elif 'safety_systems' in domset:
        framing='Turn this into STEM by asking young people to identify the hazard, explain the cause-and-effect, choose controls, and justify why those controls reduce risk.'

    evidence='Evidence could be a drawing, model, measurement, data table, photo, test result, comparison, route plan, explanation, or improved version.'
    if relevance=='direct':
        caution='Keep the focus on the STEM method or concept, not just completing the badge task.'
    else:
        caution='Do not count this as STEM if it is only completed as a practical, decorative or discussion task without evidence, testing, measuring, comparing or explanation.'

    return {
        'rid': f"{bid}::{req.get('id') or req.get('no') or ''}",
        'ref': str(req.get('no') or req.get('id') or ''),
        'requirement_summary': simple_summary(text, 150),
        # keep text for backwards compatibility/search but page can display summary.
        'text': simple_summary(text, 180),
        'stem_relevance': relevance,
        'strength': strength,
        'stem_domains': domains,
        'areas': [DOMAIN_LABELS[d] for d in domains],
        'stem_thinking': thinking,
        'why_stem': why,
        'leader_framing': framing,
        'evidence': evidence,
        'caution': caution,
        'leader_prompts': [framing, 'Ask: What evidence do you have? What changed? What would you try next?'],
    }

out=[]; review_excluded=[]
for b in master:
    reqs=[]
    for req in b.get('requirements',[]):
        if req.get('kind') not in (None,'req'): continue
        j=judgement(b, req)
        if j: reqs.append(j)
        else:
            # record excluded but don't overdo in public data
            pass
    if reqs:
        out.append({
            'badge_id': b['id'],
            'title': b['badge_name'],
            'section': b.get('section_label') or SECTION_LABEL.get(b.get('section'), b.get('section','').title()),
            'section_slug': b.get('section'),
            'category': b.get('category'),
            'badge_type': b.get('type'),
            'stem_requirements': reqs,
        })

# Sort section order, then category, title
order={'squirrels':0,'beavers':1,'cubs':2,'scouts':3,'explorers':4,'staged':5}
out.sort(key=lambda b:(order.get(b.get('section_slug'),9), b.get('category') or '', b['title']))

print('badges', len(out), 'requirements', sum(len(b['stem_requirements']) for b in out))
print(collections.Counter(b['section_slug'] for b in out))
print(collections.Counter(r['stem_relevance'] for b in out for r in b['stem_requirements']))
# dump samples
for b in out[:20]: print(b['section_slug'], b['title'], len(b['stem_requirements']), [r['stem_relevance'] for r in b['stem_requirements']][:5])

path=pathlib.Path('/mnt/data/stem_badge_map_v2.yml')
with path.open('w', encoding='utf-8') as f:
    f.write('# STEM Badge Map V2 - first-pass curated map.\n')
    f.write('# Built from _data/badges_master.json with a judgement framework: direct STEM + STEM through leader framing.\n')
    yaml.safe_dump({'schema_version':'2.0','curation_note':'First-pass curated map. Includes direct STEM and realistic STEM-through-framing opportunities; excludes weak/decorative/admin-only links.','badges':out}, f, sort_keys=False, allow_unicode=True, width=110)
print(path)
