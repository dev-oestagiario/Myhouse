/**
 * Instala o código-fonte ARCore opcional no projeto Android gerado pelo Capacitor.
 * Executado APÓS npx cap sync android. Não exige Android Studio no computador local.
 * É idempotente: alterações condicionais, sem duplicar dependências/manifest.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'android/app';
const javaDir = join(root, 'src/main/java/com/myhouse/app');
mkdirSync(javaDir, { recursive: true });

for (const name of ['RoomARPlugin.java', 'RoomArMeasureActivity.java']) {
  copyFileSync(join('native/arcore/java', name), join(javaDir, name));
}

function changeFile(path, transform) {
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (!after || after === before) return;
  writeFileSync(path, after, 'utf8');
}

changeFile(join(root, 'build.gradle'), file => {
  if (file.includes("com.google.ar:core:1.56.0")) return file;
  if (!/dependencies\s*\{/.test(file)) throw new Error('Bloco dependencies não encontrado no Gradle Android');
  return file.replace(/dependencies\s*\{/, "dependencies {\n    implementation 'com.google.ar:core:1.56.0'");
});

changeFile(join(javaDir, 'MainActivity.java'), file => {
  if (file.includes('registerPlugin(RoomARPlugin.class)')) return file;
  if (!file.includes('extends BridgeActivity')) throw new Error('Não foi possível localizar BridgeActivity');
  const name = 'public class MainActivity extends BridgeActivity {';
  if (!file.includes(name)) throw new Error('Não foi possível localizar MainActivity gerada pelo Capacitor');
  return file.replace(name, name + `
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(RoomARPlugin.class);
        super.onCreate(savedInstanceState);
    }
`);
});

changeFile(join(root, 'src/main/AndroidManifest.xml'), file => {
  let manifest = file;
  if (!manifest.includes('android.permission.CAMERA')) {
    manifest = manifest.replace('<application', `
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.ar" android:required="false" />
    <application`);
  }
  if (!manifest.includes('android:name="com.google.ar.core"')) {
    manifest = manifest.replace(/<application\b[^>]*>/, match => match + `
        <meta-data android:name="com.google.ar.core" android:value="optional" />`);
  }
  if (!manifest.includes('android:name=".RoomArMeasureActivity"')) {
    manifest = manifest.replace('</application>', `
        <activity android:name=".RoomArMeasureActivity"
            android:exported="false"
            android:screenOrientation="portrait"
            android:label="Medir com ARCore" />
    </application>`);
  }
  if (!manifest.includes('android:required="false"') || !manifest.includes('RoomArMeasureActivity')) {
    throw new Error('Falha ao configurar ARCore opcional no AndroidManifest');
  }
  return manifest;
});

console.log('ARCore 1.56.0 instalado como recurso Android opcional; app sem ARCore permanece compatível.');
