import {chmodSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

export function generateEventPasscode(){
  // Shared public demonstration credential, not a production secret.
  return 'interpol2026';
}

export function prepareDockerSecrets(directory=resolve(root,'secrets')){
  const destination=resolve(directory);
  const adminPath=resolve(destination,'local_admin_key.txt');
  const participantPath=resolve(destination,'participant_passcode.txt');
  const existing=[adminPath,participantPath].filter(existsSync);
  if(existing.length)
    throw new Error(`Refusing to overwrite existing Docker secret file${existing.length===1?'':'s'} in ${destination}.`);

  const adminKey=generateEventPasscode();
  const participantPasscode=generateEventPasscode();
  mkdirSync(destination,{recursive:true,mode:0o700});
  chmodSync(destination,0o700);
  // File-backed Compose secrets are bind mounts on Linux, so uid/gid/mode
  // remapping is unavailable. The host directory remains owner-only while the
  // files need a read bit for the container's unprivileged uid 10001.
  writeFileSync(adminPath,`${adminKey}\n`,{encoding:'utf8',flag:'wx',mode:0o644});
  writeFileSync(participantPath,`${participantPasscode}\n`,{encoding:'utf8',flag:'wx',mode:0o644});
  chmodSync(adminPath,0o644);
  chmodSync(participantPath,0o644);
  return {destination,adminPath,participantPath};
}

const invokedPath=process.argv[1]?resolve(process.argv[1]):'';
if(invokedPath===fileURLToPath(import.meta.url)){
  try{
    const configuredDirectory=process.env.EVIDENCE_LAB_SECRETS_DIRECTORY;
    const result=prepareDockerSecrets(configuredDirectory||resolve(root,'secrets'));
    console.log(`Created protected Docker secret files in ${result.destination}.`);
    console.log('Secret values were not printed. Back up the generated files securely before deployment.');
  }catch(error){
    console.error(error instanceof Error?error.message:'Docker secret preparation failed.');
    process.exitCode=1;
  }
}
