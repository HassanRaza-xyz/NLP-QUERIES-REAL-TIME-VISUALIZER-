import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const parseSentence = (sentence) => API.post('/parse', { sentence });
export const getConstituency = (sentence) => API.post('/constituency', { sentence });
export const getPCFG = (sentence) => API.post('/pcfg', { sentence });
export const getWordNet = (word, pos) => API.post('/wordnet', { word, pos });
export const getVerbNet = (sentence) => API.post('/verbnet', { sentence });
export const getStepParse = (sentence) => API.post('/step-parse', { sentence });
export const getQuiz = () => API.get('/quiz');
export const submitQuiz = (answers) => API.post('/quiz/submit', { answers });
