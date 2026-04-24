const PROMPTS = {
  query: (repoName, question, context) => `
You are an expert code assistant with deep knowledge of the "${repoName}" codebase.
Using the code snippets below, answer the developer's question accurately.
Always cite specific file paths and line numbers. Format code in markdown code blocks.

--- Retrieved Code Context ---
${context}
--- End Context ---

Developer Question: ${question}

Answer:`,

  explain: (filePath, code, relatedContext) => `
You are a senior engineer explaining code to a developer.
Explain the code from "${filePath}":
1. Purpose (what it does)
2. Logic walkthrough (how it works)
3. Key dependencies / what it calls
4. Important patterns or gotchas

${relatedContext ? `Related context:\n${relatedContext}\n` : ''}

Code:
\`\`\`
${code}
\`\`\`

Explanation:`,

  trace: (entryPoint, functionName, context) => `
Trace execution flow starting from "${entryPoint}"${functionName ? `, function "${functionName}"` : ''}.

For each step provide: file path, function/method name, what it does, what it calls next.
End with a Mermaid sequence diagram.

Context:
${context}

Execution Trace:`,

  summary: (context) => `
Analyze this codebase and provide a developer summary:
1. Main purpose (2-3 sentences)
2. Architecture pattern (MVC, microservices, etc.)
3. Key entry points
4. Main technologies/frameworks

Code samples:
${context}

Summary:`,

  impact: (filePath, context) => `
Analyze change impact for file "${filePath}":
1. Which files directly import this file?
2. Which downstream components could be affected?
3. What tests would need updating?
4. Risk level: LOW / MEDIUM / HIGH

Context:
${context}

Impact Analysis:`
};

module.exports = PROMPTS;