/**
 * Production signing is opt-in and requires a persistent keystore kept ONLY in
 * GitHub Actions Secrets. Never create or reuse a random debug keystore here.
 * This script runs after npm run android:prepare (which generates android/).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const names = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
];
const missing = names.filter(key => !process.env[key]);
if (missing.length) throw new Error(
  'Assinatura não configurada: defina os Secrets de Actions: ' + missing.join(', '),
);
const versionCode = Number(process.env.MYHOUSE_RELEASE_CODE);
if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
  throw new Error('MYHOUSE_RELEASE_CODE deve ser inteiro crescente de 1 até 2100000000.');
}
const keystore = Buffer.from(process.env.ANDROID_KEYSTORE_BASE64, 'base64');
if (keystore.length < 100) throw new Error('O conteúdo do keystore não é válido.');
const gradle = join('android', 'app', 'build.gradle');
let source = readFileSync(gradle, 'utf8');
if (!source.includes('android {') || !/buildTypes\s*\{\s*release\s*\{/.test(source)) {
  throw new Error('Estrutura Android não reconhecida; não é seguro injetar assinatura.');
}
if (source.includes('signingConfigs.myHouseRelease')) {
  throw new Error('Assinatura já configurada; execução interrompida para evitar duplicidade.');
}
source = source.replace('android {', `android {
    signingConfigs {
        myHouseRelease {
            storeFile file('myhouse-release.jks')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }`);
source = source.replace(/buildTypes\s*\{\s*release\s*\{/,
  matched => matched + '\n            signingConfig signingConfigs.myHouseRelease');
if (!/versionCode\s+\d+/.test(source) || !/versionName\s+["'][^"']+["']/.test(source)) {
  throw new Error('Não foi possível identificar versionCode/versionName no Gradle gerado.');
}
source = source.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode);
source = source.replace(/versionName\s+["'][^"']+["']/, 'versionName "1.0.' + versionCode + '"');
writeFileSync(join('android','app','myhouse-release.jks'), keystore, { mode: 0o600 });
writeFileSync(gradle, source, 'utf8');
console.log('Assinatura Android persistente configurada no projeto gerado (sem expor segredos).');
