const PROMPTS = {
  query: (repoName, question, context) => `
You are an expert code assistant with deep knowledge of the "${repoName}" codebase.
Using the code snippets below, answer the developer's question accurately.
Always cite specific file paths and line numbers. Format code in markdown code blocks.
When referencing multiple languages or frameworks, be specific about which one you're discussing.

--- Retrieved Code Context ---
${context}
--- End Context ---

Developer Question: ${question}

Answer:`,

  explain: (filePath, code, relatedContext) => `
You are a senior engineer explaining code to a developer.
Explain the code from "${filePath}":
1. **Purpose** — what it does and why it exists
2. **Logic walkthrough** — how it works step by step
3. **Key dependencies** — what it imports/calls
4. **Important patterns or gotchas** — things to watch out for

${relatedContext ? `Related context:\n${relatedContext}\n` : ''}

Code:
\`\`\`
${code}
\`\`\`

Explanation:`,

  trace: (entryPoint, functionName, context) => `
Trace execution flow starting from "${entryPoint}"${functionName ? `, function "${functionName}"` : ''}.

For each step provide:
- File path
- Function/method name  
- What it does
- What it calls next

End with a Mermaid sequence diagram showing the full flow.

Context:
${context}

Execution Trace:`,

  summary: (context, stackInfo, langInfo) => `
Analyze this codebase and provide a concise developer onboarding summary:

${stackInfo ? `**Stack:** ${stackInfo}` : ''}
${langInfo  ? `**Languages:** ${langInfo}` : ''}

Provide:
1. **Main purpose** (2-3 sentences)
2. **Architecture pattern** (MVC, microservices, monolith, etc.)
3. **Key entry points** (main files to understand first)
4. **Main technologies & frameworks** (be specific)
5. **Quick start tip** (what should a new developer do first?)

Code samples:
${context}

Summary:`,

  impact: (filePath, context) => `
Perform change impact analysis for file "${filePath}":

1. **Direct dependents** — which files import this file?
2. **Downstream effects** — which components could be affected?
3. **Tests to update** — what test files would need changes?
4. **Risk assessment** — LOW / MEDIUM / HIGH with justification

Context:
${context}

Impact Analysis:`,
};

module.exports = PROMPTS;