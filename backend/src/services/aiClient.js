const axios = require('axios');
const logger = require('../utils/logger');

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: AI_BASE,
  timeout: 600000
});

module.exports = {
  async ingest(repoId, localPath, faissIndexId, repoUrl, branch, githubToken) {
    logger.info(`[aiClient] Ingesting repo ${repoId}`);
    const { data } = await client.post('/ingest', {
      repoId, localPath, faissIndexId, repoUrl, branch, githubToken
    });
    return data;
  },
  async query({ faissIndexId, question, history, repoName }) {
    const { data } = await client.post('/query', { faissIndexId, question, history, repoName });
    return data;
  },
  async explain({ filePath, selection, chunks, faissIndexId, repoName }) {
    const { data } = await client.post('/explain', { filePath, selection, chunks, faissIndexId, repoName });
    return data;
  },
  async trace({ faissIndexId, graph, entryPoint, functionName, repoName }) {
    const { data } = await client.post('/trace', { faissIndexId, graph, entryPoint, functionName, repoName });
    return data;
  },
  async impact({ faissIndexId, filePath, repoName }) {
    const { data } = await client.post('/impact', { faissIndexId, filePath, repoName });
    return data;
  }
};