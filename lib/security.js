import { createHmac, timingSafeEqual } from 'node:crypto';
const secret = () => { if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters'); return process.env.SESSION_SECRET; };
export function sign(value) { return createHmac('sha256',secret()).update(value).digest('hex'); }
export function validCookie(req) { const raw = req.cookies.get('nl_admin')?.value || ''; const [expires,sig] = raw.split('.'); if(!expires || !sig || !/^\d+$/.test(expires) || +expires < Date.now()) return false; const expected = sign(expires); return sig.length === expected.length && timingSafeEqual(Buffer.from(sig),Buffer.from(expected)); }
export function passwordMatches(input) {const expected=process.env.ADMIN_PASSWORD || ''; if(expected.length < 12) return false; const a=Buffer.from(sign(String(input)));const b=Buffer.from(sign(expected));return timingSafeEqual(a,b);}
export const secureHeaders = {'Cache-Control':'no-store'};
