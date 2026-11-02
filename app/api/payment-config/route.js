import {NextResponse} from 'next/server';
import {paymentConfig} from '../../../lib/upi-order';
export const dynamic='force-dynamic';
export function GET(){return NextResponse.json({enabled:paymentConfig().enabled,pixelId:/^\d{5,25}$/.test(process.env.META_PIXEL_ID||'')?process.env.META_PIXEL_ID:null},{headers:{'Cache-Control':'no-store'}});}
