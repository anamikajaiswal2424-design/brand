import './globals.css';
import Analytics from './analytics';
export const metadata={title:'NORTHLINE — Elevated Everyday Wear',description:'Discover thoughtfully designed everyday essentials.'};
export default function Layout({children}){return <html lang="en"><body>{children}<Analytics/></body></html>}
