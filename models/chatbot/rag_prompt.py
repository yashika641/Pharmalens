from typing import List, Dict


def build_rag_prompt(query: str, docs: List[Dict]) -> str:
    context = "\n\n".join(
        f"- {d['payload']['text']}"
        for d in docs
        if d.get("payload") and "text" in d["payload"]
    )

    return f"""
You are PharmaLens, an AI pharmacist assistant.

Rules:
- Answer ONLY using the context
- Be concise and medically accurate at least answer in a paragraph or LESS

### Context:
{context}

### Question:
{query}

### Answer:
"""
