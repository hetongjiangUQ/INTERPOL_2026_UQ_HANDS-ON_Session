import {
  DEFAULT_WORKSHOP,
  practiceDefaults,
  validateWorkshop,
  type WorkshopConfig,
  type WorkshopSnapshot,
} from './workshop-config.ts';
import {replaceRetiredQuiz8} from './quiz8-replacement.ts';

const TEN_CASE_DEFAULT_UPDATE = 'default-session-seven-to-ten-v1';
const PREVIOUS_DEFAULT_PRACTICES = [
  ['quiz-first-look', true],
  ['quiz-video-authentic-hard', true],
  ['quiz-video-synthetic-hard', true],
  ['quiz-image-five', true],
  ['quiz-portrait-d', true],
  ['quiz-portrait-e', true],
  ['quiz-faceswap-still-v3', true],
] as const;
const NEW_DEFAULT_PRACTICES = [
  'quiz-faceswap-video-v1',
  'quiz-user-image-a-v1',
  'quiz-user-image-b-v2',
] as const;

type SavedWorkshop = {revision:number;content:string};

function isPreviousSevenCaseDefault(config:WorkshopConfig) {
  return JSON.stringify(config.practices.map(({id,enabled})=>[id,enabled]))===
    JSON.stringify(PREVIOUS_DEFAULT_PRACTICES);
}

async function upgradePreviousSevenCaseDefault(
  db:D1Database,
  row:SavedWorkshop,
  config:WorkshopConfig,
) {
  if(!isPreviousSevenCaseDefault(config))return;
  const revision=row.revision+1;
  const content=JSON.stringify({
    ...config,
    practices:[
      ...config.practices,
      ...NEW_DEFAULT_PRACTICES.map(id=>({...practiceDefaults(id),enabled:true})),
    ],
  });
  const appliedAt=new Date().toISOString();
  await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO workshop_config_versions(revision,content,created_at)
      SELECT ?,?,?
      WHERE ?=(SELECT COALESCE(MAX(revision),0) FROM workshop_config_versions)
        AND EXISTS (
          SELECT 1 FROM workshop_config_versions
          WHERE revision=? AND content=?
        )
        AND NOT EXISTS (SELECT 1 FROM workshop_updates WHERE id=?)
    `).bind(
      revision,
      content,
      appliedAt,
      row.revision,
      row.revision,
      row.content,
      TEN_CASE_DEFAULT_UPDATE,
    ),
    db.prepare(`
      INSERT OR IGNORE INTO workshop_updates(id,applied_at)
      SELECT ?,?
      WHERE EXISTS (
        SELECT 1 FROM workshop_config_versions
        WHERE revision=? AND content=?
      )
    `).bind(TEN_CASE_DEFAULT_UPDATE,appliedAt,revision,content),
  ]);
}

export async function readWorkshop(db:D1Database):Promise<WorkshopSnapshot> {
  let row=await db.prepare('SELECT revision,content FROM workshop_config_versions ORDER BY revision DESC LIMIT 1').first<SavedWorkshop>();
  if(!row)return {revision:0,config:replaceRetiredQuiz8(structuredClone(DEFAULT_WORKSHOP))};
  let config=validateWorkshop(JSON.parse(row.content));
  await upgradePreviousSevenCaseDefault(db,row,config);
  row=await db.prepare('SELECT revision,content FROM workshop_config_versions ORDER BY revision DESC LIMIT 1').first<SavedWorkshop>();
  if(!row)return {revision:0,config:replaceRetiredQuiz8(structuredClone(DEFAULT_WORKSHOP))};
  config=validateWorkshop(JSON.parse(row.content));
  return {revision:row.revision,config:replaceRetiredQuiz8(config)};
}
