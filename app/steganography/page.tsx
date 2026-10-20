import {WatermarkLab} from '@/components/watermark-lab';
export const metadata={title:'Image watermark lab | Evidence Lab'};
import {readWorkshop} from '@/lib/workshop-config.server';
import {db} from '@/lib/server';
import {notFound} from 'next/navigation';
import {WorkshopGate} from '@/components/workshop-provider';
export const dynamic='force-dynamic';
export default async function Page(){if(!(await readWorkshop(db())).config.watermark.enabled)notFound();return <WorkshopGate><WatermarkLab/></WorkshopGate>;}
