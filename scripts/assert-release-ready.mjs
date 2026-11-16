/** Impede releases automáticos sem validação real, evidenciada e recente. */
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const path=resolve('docs/release-evidence/F6.8-approved.json');
if(!existsSync(path)){
  console.error('F6.8 bloqueado: falta o arquivo de aprovação com evidências verificáveis. Veja docs/F6_8_RELEASE_GATE.md.');
  process.exit(1);
}
let doc;
try{doc=JSON.parse(readFileSync(path,'utf8'));}
catch{console.error('F6.8 bloqueado: aprovação JSON inválida.');process.exit(1);}
const keys=[
  'backupsVerified','homeDataV2Applied','migrationRollbackReviewed',
  'storageRlsTwoAccountTest','privateFileCRUDVerified',
  'e2eAndTypecheckGreen','androidBuildGreen',
  'androidARCoreDeviceTest','androidNoARCoreDeviceTest',
  'cameraPermissionsPhysicalTest','offlineRestorePhysicalTest',
  'accessibilityManualReview','releaseSigningVerified',
];
const age=new Date(doc.approvedAt).getTime();
const approved=typeof doc.approvedBy==='string'&&doc.approvedBy.trim().length>=3
  &&Number.isFinite(age)&&age<=Date.now()&&Date.now()-age<=14*86400000
  &&typeof doc.releaseVersion==='string'&&/^v\d+\.\d+\.\d+$/.test(doc.releaseVersion);
const missing=keys.filter(k=>!doc.gates||doc.gates[k]!==true
  ||typeof doc.evidence?.[k]!=='string'||!/^https:\/\/|^docs\/release-evidence\//.test(doc.evidence[k]));
if(!approved||missing.length){
  console.error('F6.8 bloqueado: aprovação ausente, vencida ou sem evidências de: '+missing.join(', '));
  process.exit(1);
}
console.log('Aprovação F6.8 registrada para '+doc.releaseVersion+' por '+doc.approvedBy+'; mantenha a revisão humana antes da publicação.');
