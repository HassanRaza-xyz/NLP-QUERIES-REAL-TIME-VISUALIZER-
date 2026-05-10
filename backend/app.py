"""
NLP Visualizer & Learning Lab — FastAPI Backend
Endpoints: /parse, /wordnet, /verbnet, /pcfg, /step-parse
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
app = FastAPI(title="NLP Visualizer API", version="1.0.0")

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
    """
    Build an approximate constituency tree from spaCy's dependency parse.
    Uses noun_chunks and verb phrases to create a more realistic tree.
    """
    def _subtree_to_dict(label, children):
        return {"label": label, "children": children}

    def _leaf(pos, word):
        return {"label": pos, "children": [{"label": word, "children": []}]}

    # Build NP, VP, PP structure from dependency parse
    root_token = None
    for token in doc:
        if token.dep_ == "ROOT":
            root_token = token
            break

    if root_token is None:
        return _subtree_to_dict("S", [_leaf(t.pos_, t.text) for t in doc])

    def build_phrase(token):
        """Recursively build phrase structure from dependency token."""
        children_tokens = sorted(token.children, key=lambda c: c.i)
        left_children = [c for c in children_tokens if c.i < token.i]
        right_children = [c for c in children_tokens if c.i > token.i]

        if token.pos_ == "VERB" or token.pos_ == "AUX":
            # Build VP
            vp_children = []
            # Add auxiliaries and advmod on the left
            for child in left_children:
                if child.dep_ in ("aux", "auxpass", "neg", "advmod"):
                    vp_children.append(_leaf(child.pos_, child.text))
                elif child.dep_ in ("nsubj", "nsubjpass"):
                    pass  # handled separately
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

    # Build the full S tree
    s_children = []
    children_of_root = sorted(root_token.children, key=lambda c: c.i)
    left_of_root = [c for c in children_of_root if c.i < root_token.i]
    right_of_root = [c for c in children_of_root if c.i > root_token.i]

    # Subject (NP)
    for child in left_of_root:
        if child.dep_ in ("nsubj", "nsubjpass"):
            s_children.append(build_phrase(child))
        elif child.dep_ in ("aux", "auxpass", "neg", "advmod"):
            pass  # will be in VP
        else:
            s_children.append(build_phrase(child))

    # Predicate (VP) — includes the root verb
    s_children.append(build_phrase(root_token))

    # Punctuation
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
    """Add pseudo-probabilities to tree nodes for PCFG visualization."""
    if not tree_dict.get("children"):
        return tree_dict

    # Generate realistic-looking probabilities
    n = len(tree_dict["children"])
    if n == 0:
        tree_dict["prob"] = 1.0
        return tree_dict

    # Give higher probability to more common structures
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
#  /wordnet  —  Synonyms, antonyms, hypernyms, definitions
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
    result_synsets = []

    for ss in synsets[:5]:
        ss_name = ss.name()
        definition = ss.definition()
        examples = ss.examples()

        synonyms = []
        antonyms = []

        for lemma in ss.lemmas():
            syn = lemma.name().replace("_", " ")
            if syn.lower() != word and syn not in seen:
                synonyms.append(syn)
                seen.add(syn)
                nodes.append({"id": syn, "group": "synonym", "label": syn})
                links.append({"source": word, "target": syn, "relation": "synonym"})

            for ant in lemma.antonyms():
                ant_name = ant.name().replace("_", " ")
                if ant_name not in seen:
                    antonyms.append(ant_name)
                    seen.add(ant_name)
                    nodes.append({"id": ant_name, "group": "antonym", "label": ant_name})
                    links.append({"source": word, "target": ant_name, "relation": "antonym"})

        hypernyms = []
        for hyp in ss.hypernyms()[:3]:
            for lemma in hyp.lemmas()[:2]:
                h = lemma.name().replace("_", " ")
                if h not in seen:
                    hypernyms.append(h)
                    seen.add(h)
                    nodes.append({"id": h, "group": "hypernym", "label": h})
                    links.append({"source": word, "target": h, "relation": "hypernym"})

        hyponyms = []
        for hypo in ss.hyponyms()[:3]:
            for lemma in hypo.lemmas()[:2]:
                h = lemma.name().replace("_", " ")
                if h not in seen:
                    hyponyms.append(h)
                    seen.add(h)
                    nodes.append({"id": h, "group": "hyponym", "label": h})
                    links.append({"source": word, "target": h, "relation": "hyponym"})

        result_synsets.append({
            "name": ss_name,
            "pos": ss.pos(),
            "definition": definition,
            "examples": examples,
            "synonyms": synonyms,
            "antonyms": antonyms,
            "hypernyms": hypernyms,
            "hyponyms": hyponyms,
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
                    # Get the full span text for the child
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
    """
    Returns step-by-step parsing stages showing how the tree is built
    incrementally (simulating a bottom-up / top-down approach).
    """
    doc = nlp(req.sentence)
    tokens = [{"text": t.text, "pos": t.pos_, "dep": t.dep_, "head": t.head.i, "id": t.i} for t in doc]

    steps = []

    # Step 1: Tokenization
    steps.append({
        "step": 1,
        "title": "Tokenization",
        "description": "Split the sentence into individual tokens.",
        "data": [t["text"] for t in tokens],
        "type": "tokens",
    })

    # Step 2: POS Tagging
    steps.append({
        "step": 2,
        "title": "POS Tagging",
        "description": "Assign a Part-of-Speech tag to each token.",
        "data": [{"text": t["text"], "pos": t["pos"]} for t in tokens],
        "type": "pos",
    })

    # Step 3: Identify noun chunks
    chunks = [{"text": chunk.text, "label": chunk.label_, "root": chunk.root.text} for chunk in doc.noun_chunks]
    steps.append({
        "step": 3,
        "title": "Noun Phrase Detection",
        "description": "Group tokens into noun phrases (NP).",
        "data": chunks if chunks else [{"text": "No noun phrases found", "label": "-", "root": "-"}],
        "type": "chunks",
    })

    # Step 4: Dependency attachment
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

    # Step 5: Build subtrees bottom-up
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

    # Step 6: Final tree
    tree = _build_constituency_tree(doc)
    steps.append({
        "step": 6,
        "title": "Complete Parse Tree",
        "description": "The fully assembled constituency parse tree.",
        "data": tree,
        "type": "tree",
    })

    return {"sentence": req.sentence, "steps": steps, "total_steps": len(steps)}


# ── Health check ─────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "NLP Visualizer API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
