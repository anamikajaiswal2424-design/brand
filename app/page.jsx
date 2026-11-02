import {readStore} from '../lib/github';
import Storefront from './storefront';
export const dynamic='force-dynamic';
export default async function Home(){return <Storefront initialStore={await readStore()}/>;}
