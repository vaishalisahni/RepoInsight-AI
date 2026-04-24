const Groq = require('groq-sdk');
const { embedSingle } = require('../embeddings/embedder');
const faissStore = require('../embeddings/faissStore');
const PROMPTS = require('./prompts');

const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.CHAT_MODEL || 'llama-3.3-70b-versatile';
const TOP_K = parseInt(process.env.TOP_K_RESULTS || '8');

async function llm(system, user, history=[]) {
  const res = await groq.chat.completions.create({
    model: MODEL, temperature: 0.2, max_tokens: parseInt(process.env.MAX_TOKENS||'4096'),
    messages: [{role:'system',content:system}, ...history, {role:'user',content:user}]
  });
  return res.choices[0].message.content;
}

async function retrieve(id, q) {
  const v=await embedSingle(q), idx=await faissStore.search(id,v,TOP_K), meta=faissStore.loadMeta(id);
  return idx.filter(i=>i>=0&&i<meta.length).map(i=>meta[i]).filter(Boolean);
}

async function query({faissIndexId,question,history,repoName}) {
  const chunks=await retrieve(faissIndexId,question);
  const ctx=chunks.map(c=>`// ${c.filePath}${c.startLine?` (lines ${c.startLine}-${c.endLine})`:''}\n${c.content}`).join('\n\n---\n\n');
  const answer=await llm(`You are an expert code assistant for "${repoName}". Cite file paths.`,PROMPTS.query(repoName,question,ctx),history);
  return {answer,sources:chunks.map(c=>({filePath:c.filePath,startLine:c.startLine,endLine:c.endLine,snippet:(c.content||'').slice(0,200)}))};
}

async function explain({filePath,selection,chunks,faissIndexId}) {
  const code=selection?.code||chunks.map(c=>c.content).join('\n\n');
  const rel=await retrieve(faissIndexId,`explain ${filePath}`);
  const relCtx=rel.filter(c=>c.filePath!==filePath).slice(0,3).map(c=>`// ${c.filePath}\n${(c.content||'').slice(0,300)}`).join('\n\n');
  const explanation=await llm('You are a senior engineer explaining code.',PROMPTS.explain(filePath,code.slice(0,4000),relCtx));
  return {explanation,filePath,relatedFiles:rel.filter(c=>c.filePath!==filePath).map(c=>c.filePath)};
}

async function trace({faissIndexId,entryPoint,functionName}) {
  const chunks=await retrieve(faissIndexId,`flow ${entryPoint} ${functionName||''}`);
  const ctx=chunks.map(c=>`// ${c.filePath}\n${(c.content||'').slice(0,500)}`).join('\n---\n');
  const result=await llm('Trace code execution. End with a Mermaid sequence diagram.',PROMPTS.trace(entryPoint,functionName,ctx));
  return {trace:result,sources:chunks.map(c=>c.filePath)};
}

async function impact({faissIndexId,filePath}) {
  const chunks=await retrieve(faissIndexId,`imports ${filePath}`);
  const ctx=chunks.map(c=>`// ${c.filePath}\n${(c.content||'').slice(0,400)}`).join('\n\n');
  const result=await llm('Senior architect: change impact analysis.',PROMPTS.impact(filePath,ctx));
  return {analysis:result,relatedFiles:chunks.map(c=>c.filePath)};
}

async function generateSummary(ctx) {
  return llm('Technical writer.',PROMPTS.summary(ctx.slice(0,6000)));
}

module.exports = {query,explain,trace,impact,generateSummary};
