import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

function createFixture(){
  const root=mkdtempSync(join(tmpdir(),'evidence-local-setup-'));
  mkdirSync(join(root,'scripts'));
  const script=join(root,'scripts/setup-local.mjs');
  copyFileSync(new URL('../scripts/setup-local.mjs',import.meta.url),script);
  return {root,script};
}

function setup(script){const result=spawnSync(process.execPath,[script],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}

function variables(root){
  return Object.fromEntries(readFileSync(join(root,'.dev.vars'),'utf8').trimEnd().split('\n').map(line=>{const separator=line.indexOf('=');return [line.slice(0,separator),line.slice(separator+1)];}));
}

test('local setup creates a protected participant and instructor configuration',()=>{
  const first=createFixture(),second=createFixture();
  setup(first.script);setup(second.script);
  const firstVars=variables(first.root),secondVars=variables(second.root);
  assert.equal(firstVars.WORKSHOP_OPEN_ACCESS,'false');
  assert.equal(firstVars.WORKSHOP_PARTICIPANT_PASSCODE,'interpol2026');
  assert.equal(firstVars.LOCAL_ADMIN_KEY,'interpol2026');
  assert.equal(secondVars.LOCAL_ADMIN_KEY,'interpol2026');
  assert.equal(secondVars.WORKSHOP_PARTICIPANT_PASSCODE,'interpol2026');
  const original=JSON.parse(readFileSync(join(first.root,'wrangler.local.jsonc'),'utf8'));
  assert.equal(original.d1_databases[0].binding,'DB');
  assert.equal(original.d1_databases[0].database_name,'evidence-lab-d1');
  assert.equal(original.r2_buckets[0].binding,'FILES');
  assert.equal(original.r2_buckets[0].bucket_name,'evidence-lab-files');
});

test('local setup preserves existing secrets and bindings byte-for-byte',()=>{
  const {root,script}=createFixture();
  setup(script);
  const configPath=join(root,'wrangler.local.jsonc');
  const original=JSON.parse(readFileSync(configPath,'utf8'));assert.equal(original.d1_databases[0].binding,'DB');
  const retainedConfig=JSON.stringify({...original,name:'retained-workshop-settings'});
  const retainedVars='WORKSHOP_OPEN_ACCESS=true\r\nLOCAL_ADMIN_KEY=retained-test-key\r\nCUSTOM_BINDING=retain this exactly\r\n';
  writeFileSync(configPath,retainedConfig);writeFileSync(join(root,'.dev.vars'),retainedVars);
  setup(script);
  assert.equal(readFileSync(configPath,'utf8'),retainedConfig);
  assert.equal(readFileSync(join(root,'.dev.vars'),'utf8'),retainedVars);
});

test('local launcher shares on the LAN by default and keeps a loopback override',()=>{
  const launcher=readFileSync(new URL('../scripts/start-local.mjs',import.meta.url),'utf8');
  assert.match(launcher,/localOnly=process\.argv\.includes\('--local-only'\),lan=!localOnly/);
  assert.match(launcher,/'dev','--hostname',lan\?'0\.0\.0\.0':'127\.0\.0\.1','--port','3001'/);
  const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(packageJson.scripts.dev,'node scripts/start-local.mjs --no-open');
});
