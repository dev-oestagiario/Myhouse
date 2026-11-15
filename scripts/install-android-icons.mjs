// Instala um ícone vetorial minimalista azul-escuro no projeto Android gerado pelo Capacitor.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'android/app/src/main/res';
const write = (dir, filename, content) => {
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, filename), content, 'utf8');
};

write('drawable', 'myhouse_launcher_foreground.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#FFFFFFFF" android:pathData="M24,51 L54,26 L84,51 L79,57 L76,54 L76,79 Q76,83 72,83 L36,83 Q32,83 32,79 L32,54 L29,57 Z"/>
  <path android:fillColor="#FF14283F" android:pathData="M48,81 L48,63 L60,63 L60,81 Z"/>
  <path android:fillColor="#FF14283F" android:pathData="M43,51 L49,57 L64,42 L68,46 L49,65 L39,55 Z"/>
</vector>`);
write('values', 'myhouse_icon_background.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="myhouse_icon_background">#14283F</color></resources>`);
for (const name of ['ic_launcher', 'ic_launcher_round']) {
  write('mipmap-anydpi-v26', `${name}.xml`, `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
 <background android:drawable="@color/myhouse_icon_background"/>
 <foreground android:drawable="@drawable/myhouse_launcher_foreground"/>
</adaptive-icon>`);
}
console.log('Ícones Android adaptativos configurados.');
