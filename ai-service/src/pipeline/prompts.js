const PROMPTS = {
  query: (repoName, question, context) => `
You are an expert code assistant with deep knowledge of the "${repoName}" codebase.
Using the following code snippets retrieved from the codebase, answer the developer's question accurately.
Always cite the specific file path and line numbers when referencing code.
Be concise but comprehensive. Format code examples in markdown code blocks.

--- Retrieved Code Context ---
${context}
--- End Context ---

Developer Question: ${question}

Answer:`,

  explain: (filePath, code, relatedContext) => `
You are a senior engineer explaining code to a developer.
Explain the following code from "${filePath}" clearly:
1. What it does (purpose)
2. How it works (logic walkthrough)
3. Key dependencies / what it calls
4. Any important patterns or gotchas

${relatedContext ? `Related codebase context:\n${relatedContext}\n` : ''}

Code to explain:
\`\`\`
${code}
\`\`\`

Explanation:`,

  trace: (entryPoint, functionName, context) => `
You are tracing execution flow in a codebase.
Starting from "${entryPoint}"${functionName ? `, function "${functionName}"` : ''}, trace the full execution path.

For each step, provide:
- File path
- Function/method name
- What it does
- What it calls next

Also generate a Mermaid sequence diagram at the end.

Codebase context:
${context}

Execution Trace:`,

  summary: (context) => `
Analyze this codebase and provide a concise developer summary:
1. Main purpose of the codebase (2-3 sentences)
2. Architecture pattern used (MVC, microservices, etc.)
3. Key entry points
4. Main technologies/frameworks detected

Code samples:
${context}

Summary:`,

  impact: (filePath, context) => `
Analyze the potential change impact for file "${filePath}" in this codebase.
Based on the dependency graph and code context:
1. Which files directly import this file?
2. Which downstream services/components could be affected?
3. What tests would need to be updated?
4. Risk level: LOW / MEDIUM / HIGH

Context:
${context}

Impact Analysis:`
};

module.exports = PROMPTS;