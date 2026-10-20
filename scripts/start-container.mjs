import {spawn,spawnSync} from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {dirname,isAbsolute,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isIP} from 'node:net';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const persistPath='/data/wrangler';
const runtimeDirectory='/run/evidence-lab';
const runtimeEnvironmentPath=resolve(runtimeDirectory,'runtime.env');

const placeholderPasscodes=new Set([
  'a',
  'changeme',
  'changeit',
  'deepfake',
  'demo',
  'example',
  'passcode',
  'password',
  'secret',
  'workshop',
]);

function fail(message){throw new Error(`Deployment configuration error: ${message}`);}

export function validateAdminKey(value){
  if(typeof value!=='string'||value!==value.trim()||/[\r\n\0]/u.test(value)||value.length<12||value.length>128)
    fail('LOCAL_ADMIN_KEY must be a single trimmed line of 12–128 characters.');
  return value;
}

export function validateParticipantPasscode(value){
  if(typeof value!=='string'||value!==value.trim()||/[\r\n\0]/u.test(value))
    fail('the participant passcode must be a single trimmed line.');
  const length=Array.from(value).length;
  const folded=value.toLocaleLowerCase('en').replace(/[^a-z0-9]/gu,'');
  if(length<8||length>64||placeholderPasscodes.has(folded))
    fail('the participant passcode must be 8–64 characters and not a placeholder (including "a").');
  return value;
}

export function validatePublicOrigin(value){
  let url;
  try{url=new URL(value);}catch{fail('PUBLIC_ORIGIN must be an absolute http(s) origin.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)
    fail('PUBLIC_ORIGIN must contain only an http(s) scheme, host and optional port.');
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(url.protocol!=='https:'&&!loopback)
    fail('PUBLIC_ORIGIN must use HTTPS unless it is a loopback address.');
  return url.origin;
}

export function validatePublicIpOrigin(value){
  if(!value?.trim())return '';
  const origin=validatePublicOrigin(value);
  const url=new URL(origin);
  if(url.protocol!=='https:'||!isIP(url.hostname.replace(/^\[|\]$/gu,'')))
    fail('PUBLIC_IP_ORIGIN must be an HTTPS origin with a literal IP address.');
  return origin;
}

export function renderRuntimeEnvironment({adminKey,participantPasscode,publicOrigin,publicIpOrigin=''}){
  return [
    'WORKSHOP_OPEN_ACCESS=false',
    `LOCAL_ADMIN_KEY=${JSON.stringify(adminKey)}`,
    `WORKSHOP_PARTICIPANT_PASSCODE=${JSON.stringify(participantPasscode)}`,
    `PUBLIC_ORIGIN=${JSON.stringify(publicOrigin)}`,
    `PUBLIC_IP_ORIGIN=${JSON.stringify(publicIpOrigin)}`,
    '',
  ].join('\n');
}

function configuredSecret(environment,valueName,fileName){
  const direct=environment[valueName];
  const file=environment[fileName];
  if(direct&&file)fail(`set only ${valueName} or ${fileName}, not both.`);
  if(file){
    if(!isAbsolute(file))fail(`${fileName} must be an absolute container path.`);
    let details;
    try{details=statSync(file);}catch{fail(`${fileName} does not point to a readable secret file.`);}
    if(!details.isFile()||details.size<1||details.size>4096)
      fail(`${fileName} must identify a non-empty regular file no larger than 4 KiB.`);
    let value;
    try{value=readFileSync(file,'utf8').replace(/\r?\n$/u,'');}
    catch{fail(`${fileName} does not point to a readable UTF-8 secret file.`);}
    return value;
  }
  if(direct)return direct;
  fail(`provide ${fileName} (recommended) or ${valueName}.`);
}

function checkedDeploymentConfiguration(environment){
  if(environment.WORKSHOP_OPEN_ACCESS!=='false')
    fail('WORKSHOP_OPEN_ACCESS must be explicitly set to false.');
  return {
    adminKey:validateAdminKey(configuredSecret(environment,'LOCAL_ADMIN_KEY','LOCAL_ADMIN_KEY_FILE')),
    participantPasscode:validateParticipantPasscode(configuredSecret(
      environment,
      'WORKSHOP_PARTICIPANT_PASSCODE',
      'WORKSHOP_PARTICIPANT_PASSCODE_FILE',
    )),
    publicOrigin:validatePublicOrigin(environment.PUBLIC_ORIGIN),
    publicIpOrigin:validatePublicIpOrigin(environment.PUBLIC_IP_ORIGIN),
  };
}

function runMigrations(environment){
  console.log('Applying database migrations to the persistent workshop state…');
  const result=spawnSync('wrangler',[
    'd1','migrations','apply','DB',
    '--local',
    '--config','wrangler.docker.jsonc',
    '--persist-to',persistPath,
  ],{cwd:root,env:environment,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`Database migration failed with exit code ${result.status??'unknown'}.`);
}

async function serve(environment){
  console.log('Starting Evidence Lab on container port 3001…');
  const child=spawn('wrangler',[
    'dev',
    '--local',
    '--config','dist/server/wrangler.json',
    '--ip','0.0.0.0',
    '--port','3001',
    '--persist-to',persistPath,
    '--env-file',runtimeEnvironmentPath,
    '--show-interactive-dev-session=false',
  ],{cwd:root,env:environment,stdio:'inherit'});

  let stopping=false;
  const forward=signal=>{
    stopping=true;
    if(child.exitCode===null&&!child.killed)child.kill(signal);
  };
  process.once('SIGINT',()=>forward('SIGINT'));
  process.once('SIGTERM',()=>forward('SIGTERM'));

  return await new Promise((done,reject)=>{
    child.once('error',reject);
    child.once('exit',(code,signal)=>done(stopping||signal==='SIGINT'||signal==='SIGTERM'?0:code??1));
  });
}

async function main(){
  process.umask(0o077);
  process.chdir(root);
  for(const path of ['dist/server/wrangler.json','wrangler.docker.jsonc','drizzle'])
    if(!existsSync(resolve(root,path)))throw new Error(`Required runtime artifact is missing: ${path}`);

  const configuration=checkedDeploymentConfiguration(process.env);
  mkdirSync(persistPath,{recursive:true});
  mkdirSync(runtimeDirectory,{recursive:true});
  mkdirSync(process.env.HOME||'/tmp/evidence-lab-home',{recursive:true});
  writeFileSync(runtimeEnvironmentPath,renderRuntimeEnvironment(configuration),{encoding:'utf8',mode:0o600});
  chmodSync(runtimeEnvironmentPath,0o600);

  const childEnvironment={
    ...process.env,
    CI:'true',
    WORKSHOP_OPEN_ACCESS:'false',
    WRANGLER_SEND_METRICS:'false',
    WRANGLER_WRITE_LOGS:'false',
  };
  delete childEnvironment.LOCAL_ADMIN_KEY;
  delete childEnvironment.WORKSHOP_PARTICIPANT_PASSCODE;

  try{
    runMigrations(childEnvironment);
    process.exitCode=await serve(childEnvironment);
  }finally{
    rmSync(runtimeEnvironmentPath,{force:true});
  }
}

const invokedPath=process.argv[1]?resolve(process.argv[1]):'';
if(invokedPath===fileURLToPath(import.meta.url))
  main().catch(error=>{
    rmSync(runtimeEnvironmentPath,{force:true});
    console.error(error instanceof Error?error.message:'Container startup failed.');
    process.exitCode=1;
  });
