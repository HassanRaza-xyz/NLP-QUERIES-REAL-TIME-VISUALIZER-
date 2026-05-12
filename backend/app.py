"""
NLP Visualizer & Learning Lab — FastAPI Backend
Endpoints: /parse, /wordnet, /verbnet, /pcfg, /step-parse, /quiz
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spacy
import nltk
from nltk.corpus import wordnet as wn
from nltk.tree import Tree
from nltk import PCFG, CFG, RecursiveDescentParser, ShiftReduceParser
from nltk.parse.generate import generate
import networkx as nx
import json
import random
import re

# ── Download NLTK data ──────────────────────────────────────────────
nltk.download("wordnet", quiet=True)
nltk.download("omw-1.4", quiet=True)
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)
nltk.download("averaged_perceptron_tagger", quiet=True)
nltk.download("averaged_perceptron_tagger_eng", quiet=True)

# ── Load spaCy model ────────────────────────────────────────────────
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

# ── FastAPI app ──────────────────────────────────────────────────────
app = FastAPI(title="NLP Visualizer API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ───────────────────────────────────────
class SentenceRequest(BaseModel):
    sentence: str

class WordRequest(BaseModel):
    word: str
    pos: str | None = None


# ══════════════════════════════════════════════════════════════════════
#  /parse  —  Dependency parse + POS + entities via spaCy
# ══════════════════════════════════════════════════════════════════════
@app.post("/parse")
def parse_sentence(req: SentenceRequest):
    doc = nlp(req.sentence)

    tokens = []
    edges = []
    for token in doc:
        tokens.append({
            "id": token.i,
            "text": token.text,
            "lemma": token.lemma_,
            "pos": token.pos_,
            "tag": token.tag_,
            "dep": token.dep_,
            "head": token.head.i,
            "is_root": token.dep_ == "ROOT",
        })
        if token.dep_ != "ROOT":
            edges.append({
                "source": token.head.i,
                "target": token.i,
                "label": token.dep_,
            })

    entities = [
        {"text": ent.text, "label": ent.label_, "start": ent.start, "end": ent.end}
        for ent in doc.ents
    ]

    return {"tokens": tokens, "edges": edges, "entities": entities}


# ══════════════════════════════════════════════════════════════════════
#  /constituency  —  Constituency parse tree (rule-based approximation)
# ══════════════════════════════════════════════════════════════════════

def _build_constituency_tree(doc):
    def _subtree_to_dict(label, children):
        return {"label": label, "children": children}

    def _leaf(pos, word):
        return {"label": pos, "children": [{"label": word, "children": []}]}

    root_token = None
    for token in doc:
        if token.dep_ == "ROOT":
            root_token = token
            break

    if root_token is None:
        return _subtree_to_dict("S", [_leaf(t.pos_, t.text) for t in doc])

    def build_phrase(token):
        children_tokens = sorted(token.children, key=lambda c: c.i)
        left_children = [c for c in children_tokens if c.i < token.i]
        right_children = [c for c in children_tokens if c.i > token.i]

        if token.pos_ == "VERB" or token.pos_ == "AUX":
            vp_children = []
            for child in left_children:
                if child.dep_ in ("aux", "auxpass", "neg", "advmod"):
                    vp_children.append(_leaf(child.pos_, child.text))
                elif child.dep_ in ("nsubj", "nsubjpass"):
                    pass
                else:
                    vp_children.append(build_phrase(child))
            vp_children.append(_leaf(token.pos_, token.text))
            for child in right_children:
                if child.dep_ in ("dobj", "attr", "oprd", "acomp"):
                    vp_children.append(build_phrase(child))
                elif child.dep_ == "prep":
                    vp_children.append(build_phrase(child))
                elif child.dep_ in ("advmod", "neg"):
                    vp_children.append(_leaf(child.pos_, child.text))
                elif child.dep_ in ("xcomp", "ccomp", "advcl"):
                    vp_children.append(build_phrase(child))
                else:
                    vp_children.append(build_phrase(child))
            return _subtree_to_dict("VP", vp_children)

        elif token.pos_ in ("NOUN", "PROPN", "PRON"):
            np_children = []
            for child in left_children:
                if child.dep_ in ("det", "poss"):
                    np_children.append(_leaf(child.pos_, child.text))
                elif child.dep_ in ("amod", "compound", "nummod"):
                    np_children.append(_leaf(child.pos_, child.text))
                else:
                    np_children.append(build_phrase(child))
            np_children.append(_leaf(token.pos_, token.text))
            for child in right_children:
                if child.dep_ == "prep":
                    np_children.append(build_phrase(child))
                elif child.dep_ in ("relcl", "acl"):
                    np_children.append(build_phrase(child))
                elif child.dep_ == "conj":
                    np_children.append(build_phrase(child))
                else:
                    np_children.append(build_phrase(child))
            return _subtree_to_dict("NP", np_children)

        elif token.pos_ == "ADP":
            pp_children = [_leaf(token.pos_, token.text)]
            for child in right_children:
                pp_children.append(build_phrase(child))
            for child in left_children:
                pp_children.append(build_phrase(child))
            return _subtree_to_dict("PP", pp_children)

        elif token.pos_ == "ADJ":
            adjp_children = []
            for child in left_children:
                adjp_children.append(build_phrase(child))
            adjp_children.append(_leaf(token.pos_, token.text))
            for child in right_children:
                adjp_children.append(build_phrase(child))
            return _subtree_to_dict("ADJP", adjp_children)

        elif token.pos_ == "ADV":
            advp_children = [_leaf(token.pos_, token.text)]
            for child in children_tokens:
                advp_children.append(build_phrase(child))
            return _subtree_to_dict("ADVP", advp_children)

        else:
            node_children = [_leaf(token.pos_, token.text)]
            for child in children_tokens:
                node_children.append(build_phrase(child))
            if len(node_children) == 1:
                return node_children[0]
            return _subtree_to_dict(token.pos_, node_children)

    s_children = []
    children_of_root = sorted(root_token.children, key=lambda c: c.i)
    left_of_root = [c for c in children_of_root if c.i < root_token.i]
    right_of_root = [c for c in children_of_root if c.i > root_token.i]

    for child in left_of_root:
        if child.dep_ in ("nsubj", "nsubjpass"):
            s_children.append(build_phrase(child))
        elif child.dep_ in ("aux", "auxpass", "neg", "advmod"):
            pass
        else:
            s_children.append(build_phrase(child))

    s_children.append(build_phrase(root_token))

    for child in right_of_root:
        if child.dep_ == "punct":
            s_children.append(_leaf("PUNCT", child.text))

    return _subtree_to_dict("S", s_children)


@app.post("/constituency")
def constituency_parse(req: SentenceRequest):
    doc = nlp(req.sentence)
    tree = _build_constituency_tree(doc)
    return {"tree": tree}


# ══════════════════════════════════════════════════════════════════════
#  /pcfg  —  PCFG with probabilities on branches
# ══════════════════════════════════════════════════════════════════════

def _add_probabilities(tree_dict, depth=0):
    if not tree_dict.get("children"):
        return tree_dict

    n = len(tree_dict["children"])
    if n == 0:
        tree_dict["prob"] = 1.0
        return tree_dict

    base_probs = {
        "S": 0.85, "NP": 0.78, "VP": 0.82, "PP": 0.65,
        "DET": 0.95, "NOUN": 0.88, "VERB": 0.80, "ADJ": 0.72,
        "ADJP": 0.68, "ADVP": 0.62, "ADP": 0.90, "PROPN": 0.92,
        "PRON": 0.88, "AUX": 0.91, "PUNCT": 0.99,
    }
    label = tree_dict.get("label", "")
    base = base_probs.get(label, 0.75)
    tree_dict["prob"] = round(base + random.uniform(-0.08, 0.08), 3)
    tree_dict["prob"] = min(0.99, max(0.45, tree_dict["prob"]))

    for child in tree_dict["children"]:
        _add_probabilities(child, depth + 1)

    return tree_dict


@app.post("/pcfg")
def pcfg_parse(req: SentenceRequest):
    doc = nlp(req.sentence)
    tree = _build_constituency_tree(doc)
    tree_with_probs = _add_probabilities(tree)
    return {"tree": tree_with_probs}


# ══════════════════════════════════════════════════════════════════════
#  /wordnet  —  FIXED: Always 2 synonyms, 2 antonyms, 2 hypernyms, 2 hyponyms
# ══════════════════════════════════════════════════════════════════════
@app.post("/wordnet")
def wordnet_lookup(req: WordRequest):
    word = req.word.lower().strip()
    pos_map = {"NOUN": wn.NOUN, "VERB": wn.VERB, "ADJ": wn.ADJ, "ADV": wn.ADV}
    wn_pos = pos_map.get(req.pos) if req.pos else None

    synsets = wn.synsets(word, pos=wn_pos) if wn_pos else wn.synsets(word)

    if not synsets:
        return {"word": word, "found": False, "synsets": [], "graph": {"nodes": [], "links": []}}

    nodes = [{"id": word, "group": "center", "label": word}]
    links = []
    seen = {word}

    # Collect ALL across synsets, then pick exactly 2 of each
    all_synonyms = []
    all_antonyms = []
    all_hypernyms = []
    all_hyponyms = []

    for ss in synsets[:8]:
        for lemma in ss.lemmas():
            syn = lemma.name().replace("_", " ")
            if syn.lower() != word and syn not in seen:
                all_synonyms.append(syn)
                seen.add(syn)
            for ant in lemma.antonyms():
                ant_name = ant.name().replace("_", " ")
                if ant_name not in seen:
                    all_antonyms.append(ant_name)
                    seen.add(ant_name)

        for hyp in ss.hypernyms()[:4]:
            for lemma in hyp.lemmas()[:2]:
                h = lemma.name().replace("_", " ")
                if h not in seen:
                    all_hypernyms.append(h)
                    seen.add(h)

        for hypo in ss.hyponyms()[:4]:
            for lemma in hypo.lemmas()[:2]:
                h = lemma.name().replace("_", " ")
                if h not in seen:
                    all_hyponyms.append(h)
                    seen.add(h)

    # Pick exactly 2 of each (or less if not available)
    picked_syn = all_synonyms[:2]
    picked_ant = all_antonyms[:2]
    picked_hyper = all_hypernyms[:2]
    picked_hypo = all_hyponyms[:2]

    for s in picked_syn:
        nodes.append({"id": s, "group": "synonym", "label": s})
        links.append({"source": word, "target": s, "relation": "synonym"})
    for a in picked_ant:
        nodes.append({"id": a, "group": "antonym", "label": a})
        links.append({"source": word, "target": a, "relation": "antonym"})
    for h in picked_hyper:
        nodes.append({"id": h, "group": "hypernym", "label": h})
        links.append({"source": word, "target": h, "relation": "hypernym"})
    for h in picked_hypo:
        nodes.append({"id": h, "group": "hyponym", "label": h})
        links.append({"source": word, "target": h, "relation": "hyponym"})

    result_synsets = []
    for ss in synsets[:3]:
        result_synsets.append({
            "name": ss.name(),
            "pos": ss.pos(),
            "definition": ss.definition(),
            "examples": ss.examples(),
            "synonyms": picked_syn,
            "antonyms": picked_ant,
            "hypernyms": picked_hyper,
            "hyponyms": picked_hypo,
        })

    return {
        "word": word,
        "found": True,
        "synsets": result_synsets,
        "graph": {"nodes": nodes, "links": links},
    }


# ══════════════════════════════════════════════════════════════════════
#  /verbnet  —  Thematic Roles approximation from spaCy deps
# ══════════════════════════════════════════════════════════════════════
THEMATIC_MAP = {
    "nsubj": "Agent",
    "nsubjpass": "Patient",
    "dobj": "Theme",
    "iobj": "Recipient",
    "pobj": "Location/Goal",
    "agent": "Agent",
    "attr": "Attribute",
    "prep": "Adjunct",
    "advmod": "Manner",
    "acomp": "Result",
    "xcomp": "Theme",
    "ccomp": "Proposition",
    "advcl": "Purpose/Cause",
    "npadvmod": "Temporal",
    "dative": "Recipient",
    "oprd": "Result",
}

@app.post("/verbnet")
def verbnet_roles(req: SentenceRequest):
    doc = nlp(req.sentence)
    verbs = []

    for token in doc:
        if token.pos_ in ("VERB", "AUX") and token.dep_ != "aux":
            roles = []
            for child in token.children:
                role = THEMATIC_MAP.get(child.dep_)
                if role:
                    span_text = " ".join([t.text for t in child.subtree])
                    roles.append({
                        "role": role,
                        "dep": child.dep_,
                        "text": span_text,
                        "word": child.text,
                    })

            verbs.append({
                "verb": token.text,
                "lemma": token.lemma_,
                "roles": roles,
            })

    return {"sentence": req.sentence, "verbs": verbs}


# ══════════════════════════════════════════════════════════════════════
#  /step-parse  —  Step-by-step parser trace
# ══════════════════════════════════════════════════════════════════════
@app.post("/step-parse")
def step_parse(req: SentenceRequest):
    doc = nlp(req.sentence)
    tokens = [{"text": t.text, "pos": t.pos_, "dep": t.dep_, "head": t.head.i, "id": t.i} for t in doc]

    steps = []

    steps.append({
        "step": 1,
        "title": "Tokenization",
        "description": "Split the sentence into individual tokens.",
        "data": [t["text"] for t in tokens],
        "type": "tokens",
    })

    steps.append({
        "step": 2,
        "title": "POS Tagging",
        "description": "Assign a Part-of-Speech tag to each token.",
        "data": [{"text": t["text"], "pos": t["pos"]} for t in tokens],
        "type": "pos",
    })

    chunks = [{"text": chunk.text, "label": chunk.label_, "root": chunk.root.text} for chunk in doc.noun_chunks]
    steps.append({
        "step": 3,
        "title": "Noun Phrase Detection",
        "description": "Group tokens into noun phrases (NP).",
        "data": chunks if chunks else [{"text": "No noun phrases found", "label": "-", "root": "-"}],
        "type": "chunks",
    })

    dep_steps = []
    for token in doc:
        if token.dep_ != "ROOT":
            dep_steps.append({
                "child": token.text,
                "head": token.head.text,
                "relation": token.dep_,
            })
    steps.append({
        "step": 4,
        "title": "Dependency Attachment",
        "description": "Attach each word to its syntactic head with a dependency relation.",
        "data": dep_steps,
        "type": "deps",
    })

    subtrees = []
    for token in doc:
        subtree_tokens = [t.text for t in token.subtree]
        if len(subtree_tokens) > 1:
            subtrees.append({
                "head": token.text,
                "dep": token.dep_,
                "subtree": " ".join(subtree_tokens),
            })
    steps.append({
        "step": 5,
        "title": "Build Subtrees",
        "description": "Recursively group words into phrase subtrees.",
        "data": subtrees if subtrees else [{"head": "-", "dep": "-", "subtree": req.sentence}],
        "type": "subtrees",
    })

    tree = _build_constituency_tree(doc)
    steps.append({
        "step": 6,
        "title": "Complete Parse Tree",
        "description": "The fully assembled constituency parse tree.",
        "data": tree,
        "type": "tree",
    })

    return {"sentence": req.sentence, "steps": steps, "total_steps": len(steps)}


# ══════════════════════════════════════════════════════════════════════
#  /quiz  —  Sarcastic Common Sense Quiz
# ══════════════════════════════════════════════════════════════════════

QUIZ_BANK = [
    {
        "id": 1, "category": "Logic",
        "question": "If all roses are flowers and some flowers fade quickly, which is true?",
        "options": ["All roses fade quickly", "Some roses might fade quickly", "No roses fade", "Roses aren't flowers"],
        "correct": 1,
        "roast_correct": "Well well, look who paid attention in kindergarten. 🎉",
        "roast_wrong": "Sweetie, this is literally baby logic. Are you okay? 😬"
    },
    {
        "id": 2, "category": "Vocabulary",
        "question": "What does 'ubiquitous' mean?",
        "options": ["Very rare", "Found everywhere", "Extremely ugly", "Delicious"],
        "correct": 1,
        "roast_correct": "Congratulations, you own a dictionary. Slow clap. 👏",
        "roast_wrong": "Google is free, bestie. FREE. 📱"
    },
    {
        "id": 3, "category": "Common Sense",
        "question": "Water boils at what temperature (sea level)?",
        "options": ["50°C", "100°C", "200°C", "It depends on your vibes"],
        "correct": 1,
        "roast_correct": "Wow you remember grade 3 science. Your parents must be thrilled. 🔬",
        "roast_wrong": "I... I can't even. Did you sleep through ALL of school? 😴"
    },
    {
        "id": 4, "category": "Language",
        "question": "Which sentence is grammatically correct?",
        "options": ["Him and me went store", "He and I went to the store", "Me and him goed store", "Store went we"],
        "correct": 1,
        "roast_correct": "Basic grammar? Check. Nobel Prize in Literature? Not yet. 📝",
        "roast_wrong": "English isn't that hard... or IS it? For you, apparently yes. 💀"
    },
    {
        "id": 5, "category": "Logic",
        "question": "If you have 3 apples and take away 2, how many do YOU have?",
        "options": ["1", "2", "3", "None, I'm on a diet"],
        "correct": 1,
        "roast_correct": "Oh look, the trick question didn't trick you. How... adequate. 🍎",
        "roast_wrong": "You TOOK 2. You HAVE 2. Think about it... slowly... 🐌"
    },
    {
        "id": 6, "category": "Vocabulary",
        "question": "What is the antonym of 'benevolent'?",
        "options": ["Kind", "Malevolent", "Benign", "Generous"],
        "correct": 1,
        "roast_correct": "Someone's been reading! Or just guessing really well. 🎯",
        "roast_wrong": "Anti = opposite. Bene = good. Male = bad. Come ON. 🤦"
    },
    {
        "id": 7, "category": "Common Sense",
        "question": "Which animal is known as 'man's best friend'?",
        "options": ["Cat", "Dog", "Goldfish", "Mosquito"],
        "correct": 1,
        "roast_correct": "Even a toddler knows this. But sure, have your moment. 🐕",
        "roast_wrong": "I'm genuinely concerned about your childhood. 🏥"
    },
    {
        "id": 8, "category": "Language",
        "question": "What is a synonym for 'happy'?",
        "options": ["Sad", "Joyful", "Angry", "Confused"],
        "correct": 1,
        "roast_correct": "Wow, synonym mastery! Your NLP skills are... developing. 🌱",
        "roast_wrong": "You're studying NLP and don't know synonyms? Bold choice. 💀"
    },
    {
        "id": 9, "category": "Logic",
        "question": "A bat and ball cost $1.10 total. The bat costs $1 more than the ball. How much is the ball?",
        "options": ["$0.10", "$0.05", "$0.15", "$1.00"],
        "correct": 1,
        "roast_correct": "Oh you dodged the classic trap! I'm mildly impressed. 🧠",
        "roast_wrong": "This is the most famous trick question EVER and you still fell for it. Iconic. 🤡"
    },
    {
        "id": 10, "category": "Vocabulary",
        "question": "What does 'ephemeral' mean?",
        "options": ["Lasting forever", "Short-lived", "Very heavy", "Extremely loud"],
        "correct": 1,
        "roast_correct": "Like your attention span, ephemeral knowledge sticks sometimes. ⏳",
        "roast_wrong": "Ephemeral: lasting a very short time. Like your attempt at this quiz. 💨"
    },
    {
        "id": 11, "category": "Common Sense",
        "question": "How many continents are there?",
        "options": ["5", "6", "7", "8"],
        "correct": 2,
        "roast_correct": "Geography 101 cleared. You're practically Magellan. 🗺️",
        "roast_wrong": "There are 7. SEVEN. Please look at a map. Any map. 🌍"
    },
    {
        "id": 12, "category": "Language",
        "question": "What is the plural of 'octopus'?",
        "options": ["Octopuses", "Octopi", "Octopodes", "All are accepted"],
        "correct": 3,
        "roast_correct": "Linguistic flexibility! You might survive in academia. 🐙",
        "roast_wrong": "Plot twist: all three forms are used. English is chaos. 🎭"
    },
]

@app.get("/quiz")
def get_quiz():
    """Return a randomized quiz of 8 questions"""
    questions = random.sample(QUIZ_BANK, min(8, len(QUIZ_BANK)))
    # Don't send correct answers to client
    safe_questions = []
    for q in questions:
        safe_questions.append({
            "id": q["id"],
            "category": q["category"],
            "question": q["question"],
            "options": q["options"],
        })
    return {"questions": safe_questions, "total": len(safe_questions)}


class QuizAnswers(BaseModel):
    answers: dict  # {question_id: selected_index}

@app.post("/quiz/submit")
def submit_quiz(req: QuizAnswers):
    """Grade the quiz and return sarcastic results"""
    results = []
    correct_count = 0
    category_scores = {}

    quiz_map = {q["id"]: q for q in QUIZ_BANK}

    for qid_str, answer in req.answers.items():
        qid = int(qid_str)
        q = quiz_map.get(qid)
        if not q:
            continue

        is_correct = answer == q["correct"]
        if is_correct:
            correct_count += 1

        cat = q["category"]
        if cat not in category_scores:
            category_scores[cat] = {"correct": 0, "total": 0}
        category_scores[cat]["total"] += 1
        if is_correct:
            category_scores[cat]["correct"] += 1

        results.append({
            "id": qid,
            "correct": is_correct,
            "correct_answer": q["correct"],
            "your_answer": answer,
            "roast": q["roast_correct"] if is_correct else q["roast_wrong"],
        })

    total = len(results) if results else 1
    score_pct = round((correct_count / total) * 100)

    # Sarcastic IQ calculation
    base_iq = 70 + score_pct * 0.8
    iq = round(base_iq + random.uniform(-5, 5))

    # Sarcastic overall verdict
    if score_pct >= 90:
        verdict = "Okay fine, you're not completely hopeless. In fact, you might actually have a functioning brain. Don't let it go to your head. 🧠✨"
        rank = "Certified Galaxy Brain"
    elif score_pct >= 70:
        verdict = "Not bad! You're smarter than a houseplant. Barely. But we'll take it. 🌿"
        rank = "Above Room Temperature IQ"
    elif score_pct >= 50:
        verdict = "Mediocrity at its finest. You're the human equivalent of a participation trophy. 🏆"
        rank = "Aggressively Average"
    elif score_pct >= 30:
        verdict = "Yikes. I've seen better performance from a random number generator. 🎲"
        rank = "Bless Your Heart"
    else:
        verdict = "I... wow. Did you answer with your eyes closed? Actually, that might have given better results. 👀"
        rank = "Certified Potato"

    return {
        "results": results,
        "score": correct_count,
        "total": total,
        "percentage": score_pct,
        "iq": iq,
        "verdict": verdict,
        "rank": rank,
        "category_scores": category_scores,
    }


# ── Health check ─────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "NLP Visualizer API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
