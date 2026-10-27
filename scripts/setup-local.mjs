import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
if(!existsSync(resolve(root,'.dev.vars'))){
  const key='interpol2026';
  writeFileSync(resolve(root,'.dev.vars'),`WORKSHOP_OPEN_ACCESS=false\nLOCAL_ADMIN_KEY=${key}\nWORKSHOP_PARTICIPANT_PASSCODE=${key}\n`,{mode:0o600});
}
if(!existsSync(resolve(root,'wrangler.local.jsonc')))writeFileSync(resolve(root,'wrangler.local.jsonc'),JSON.stringify({name:'evidence-lab-local',main:'vinext/server/fetch-handler',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],d1_databases:[{binding:'DB',database_name:'evidence-lab-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:'drizzle'}],r2_buckets:[{binding:'FILES',bucket_name:'evidence-lab-files'}]},null,2));
console.log('Local settings ready. The website passcode is configured; existing settings have been preserved.');
