"""Prompt templates — identical to Node version."""


def query_prompt(repo_name: str, question: str, context: str) -> str:
    return f"""You are an expert code assistant with deep knowledge of the "{repo_name}" codebase.
Using the code snippets below, answer the developer's question accurately.
Always cite specific file paths and line numbers. Format code in markdown code blocks.

--- Retrieved Code Context ---
{context}
--- End Context ---

Developer Question: {question}

Answer:"""


def explain_prompt(file_path: str, code: str, related_context: str = "") -> str:
    related = f"Related context:\n{related_context}\n" if related_context else ""
    return f"""You are a senior engineer explaining code to a developer.
Explain the code from "{file_path}":
1. **Purpose** — what it does and why it exists
2. **Logic walkthrough** — how it works step by step
3. **Key dependencies** — what it imports/calls
4. **Important patterns or gotchas** — things to watch out for

{related}
Code:
```
{code}
```

Explanation:"""


def trace_prompt(entry_point: str, function_name: str, context: str) -> str:
    fn_part = f', function "{function_name}"' if function_name else ""
    return f"""Trace execution flow starting from "{entry_point}"{fn_part}.

For each step provide:
- File path
- Function/method name
- What it does
- What it calls next

End with a Mermaid sequence diagram showing the full flow.

Context:
{context}

Execution Trace:"""


def summary_prompt(context: str, stack_info: str, lang_info: str) -> str:
    return f"""Analyze this codebase and provide a concise developer onboarding summary:

{f"**Stack:** {stack_info}" if stack_info else ""}
{f"**Languages:** {lang_info}" if lang_info else ""}

Provide:
1. **Main purpose** (2-3 sentences)
2. **Architecture pattern**
3. **Key entry points**
4. **Main technologies & frameworks**
5. **Quick start tip**

Code samples:
{context}

Summary:"""


def impact_prompt(file_path: str, context: str) -> str:
    return f"""Perform change impact analysis for file "{file_path}":

1. **Direct dependents** — which files import this file?
2. **Downstream effects** — which components could be affected?
3. **Tests to update** — what test files would need changes?
4. **Risk assessment** — LOW / MEDIUM / HIGH with justification

Context:
{context}

Impact Analysis:"""