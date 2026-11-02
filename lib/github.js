import {store as fallback} from '../data/store.js';
const path = 'data/store.js';
const base=()=>`https://api.github.com/repos/${encodeURIComponent(process.env.GITHUB_OWNER)}/${encodeURIComponent(process.env.GITHUB_REPO)}/contents/${path}`;
function config(){return ['GITHUB_TOKEN','GITHUB_OWNER','GITHUB_REPO'].every(k=>process.env[k]);}
function headers(){return {'Authorization':`Bearer ${process.env.GITHUB_TOKEN}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};}
async function request(url,options={}) { const r=await fetch(url,{...options,headers:headers(),cache:'no-store'});if(!r.ok) throw new Error(`GitHub API error ${r.status}`);return r.json(); }
export async function getFile(file){return request(base().replace(path,file)+`?ref=${encodeURIComponent(process.env.GITHUB_BRANCH || 'main')}`);}
export async function readStore(){if(!config())return fallback;try{const r=await getFile(path);const raw=Buffer.from(r.content,'base64').toString('utf8');return JSON.parse(raw.replace(/^export const store = /,'').replace(/;\s*$/,''));}catch(e){console.error('Store read failed:',e);return fallback;}}
export async function writeFile(file,content,message){if(!config())throw new Error('GitHub storage env variables not configured');let last;for(let i=0;i<3;i++){try{let sha;try{sha=(await getFile(file)).sha;}catch(e){if(!String(e.message).includes('404'))throw e;}return await request(base().replace(path,file),{method:'PUT',body:JSON.stringify({message,content:Buffer.from(content).toString('base64'),sha,branch:process.env.GITHUB_BRANCH || 'main'})});}catch(e){last=e;if(!String(e.message).includes('409'))break;}}throw last;}
export function storeSource(data){return `export const store = ${JSON.stringify(data,null,2)};\n`;}
export async function readOrders(){if(!config())return [];try{const r=await getFile('data/orders.json');return JSON.parse(Buffer.from(r.content,'base64').toString('utf8'));}catch(e){if(String(e.message).includes('404'))return [];throw e;}}
