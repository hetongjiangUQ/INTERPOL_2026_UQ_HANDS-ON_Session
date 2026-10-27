import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {networkInterfaces} from 'node:os';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
// Subprocesses must resolve the same Node installation, even when run from Finder.
const env={...process.env,PATH:dirname(process.execPath)+delimiter+(process.env.PATH||''),WRANGLER_WRITE_LOGS:'false',WRANGLER_LOG_PATH:resolve(root,'.wrangler/logs'),MINIFLARE_REGISTRY_PATH:resolve(root,'.wrangler/registry')};
const noOpen=process.argv.includes('--no-open'),localOnly=process.argv.includes('--local-only'),lan=!localOnly;
const lockPath=resolve(root,'.vinext/dev/lock.json');
const delay=ms=>new Promise(done=>setTimeout(done,ms));
function runningServer(){
  try{
    const lock=JSON.parse(readFileSync(lockPath,'utf8')),url=new URL(lock.appUrl);
    if(resolve(lock.cwd)!==root||!Number.isInteger(lock.pid)||lock.pid<1||url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password)return null;
    process.kill(lock.pid,0);
    return {pid:lock.pid,url:url.origin,lan:lock.hostname==='0.0.0.0'};
  }catch{return null;}
}
async function ready(url,timeoutMs=10000){
  try{
    const signal=AbortSignal.timeout(Math.max(1,timeoutMs));
    const response=await fetch(url+'/api/session',{signal});
    if(!response.ok)return false;
    const session=await response.json();
    if(typeof session.admin!=='boolean'||typeof session.localLogin!=='boolean')return false;
    const checks=await Promise.all(['/','/hands-on'].map(path=>fetch(url+path,{signal})));
    await Promise.all(checks.map(r=>r.body?.cancel()));
    return checks.every(r=>r.ok);
  }catch{return false;}
}
function show(url,shared=false){
  console.log('\nWebsite ready: '+url+'/');
  if(shared){
    const addresses=[...new Set(Object.values(networkInterfaces()).flat().filter(info=>info&&info.family==='IPv4'&&!info.internal&&!info.address.startsWith('169.254.')).map(info=>info.address))];
    for(const address of addresses)console.log('Audience link (same network): http://'+address+':'+new URL(url).port+'/');
    if(!addresses.length)console.log('No network address found. Connect this Mac to the workshop network.');
  }else console.log('This address works only on this Mac.');
  if(!noOpen&&process.platform==='darwin'){
    const opened=spawnSync('/usr/bin/open',[url+'/'],{stdio:'ignore'});
    if(opened.status!==0)console.log('Open the website address above in your browser.');
  }
}
function runLocalScript(file,args=[]){
  const result=spawnSync(process.execPath,[resolve(root,file),...args],{cwd:root,env,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error('Local setup failed. See the error above.');
}
async function start(){
  const [major,minor]=process.versions.node.split('.').map(Number);
  if(major<22||major===22&&minor<13)throw new Error('Node.js 22.13 or newer is required. Found '+process.versions.node+'.');
  const existing=runningServer();
  if(existing){
    if(lan!==existing.lan)throw new Error(existing.lan
      ? 'The current server is shared on the local network. Stop its terminal with Ctrl+C, then run this launcher again with --local-only.'
      : 'The current server is only available on this Mac. Stop its terminal with Ctrl+C, then run this launcher again; LAN sharing is now the default.');
    const until=Date.now()+30000;let available=false;
    while(Date.now()<until){if(await ready(existing.url,until-Date.now())){available=true;break;}if(runningServer()?.pid!==existing.pid)break;await delay(500);}
    if(!available)throw new Error('A server for this project is running but is not ready. Check its terminal at '+existing.url+'; stop it with Ctrl+C before restarting.');
    console.log('This website is already running. Reusing it.');show(existing.url,existing.lan);return;
  }
  for(const file of ['node_modules/vinext/dist/cli.js','node_modules/wrangler/bin/wrangler.js']){
    if(!existsSync(file))throw new Error('Project dependencies are missing. Restore/install dependencies before starting. No global pnpm installation is needed for an already installed checkout.');
  }
  // Initialise missing local settings without replacing an existing configuration.
  if(!existsSync('.dev.vars')||!existsSync('wrangler.local.jsonc'))runLocalScript('scripts/setup-local.mjs');
  console.log('Preparing the presentation download…');
  runLocalScript('node_modules/wrangler/bin/wrangler.js',[
    'r2','object','put','evidence-lab-files/workshop-slides/UQ_Deepfake_Slide.pptx',
    '--file','slides/UQ_Deepfake_Slide.pptx','--local','--config','wrangler.local.jsonc',
    '--content-type','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]);
  console.log('Preparing the local database…');
  runLocalScript('node_modules/wrangler/bin/wrangler.js',['d1','migrations','apply','DB','--local','--config','wrangler.local.jsonc']);
  console.log('\nStarting Evidence Lab. Keep this terminal open; press Ctrl+C to stop.');
  const child=spawn(process.execPath,[resolve(root,'node_modules/vinext/dist/cli.js'),'dev','--hostname',lan?'0.0.0.0':'127.0.0.1','--port','3001'],{cwd:root,env,stdio:'inherit'});
  let ended=false,stopping=false;
  function stop(){stopping=true;child.kill('SIGINT');}
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  const closed=new Promise(done=>{
    child.once('error',error=>{ended=true;console.error(error.message);done(1);});
    child.once('exit',(code,signal)=>{ended=true;done(stopping||signal==='SIGINT'?0:code??1);});
  });
  let shown=false;
  const until=Date.now()+60000;
  while(Date.now()<until&&!ended&&!stopping){
    const current=runningServer();
    if(current?.pid===child.pid&&await ready(current.url,until-Date.now())){show(current.url,current.lan);shown=true;break;}
    await delay(1000);
  }
  if(!shown&&!ended&&!stopping)console.error('Startup is taking longer than expected. Check the server messages above; the process is still running.');
  process.exitCode=await closed;
}
start().catch(error=>{console.error('\n'+error.message);process.exitCode=1;});
