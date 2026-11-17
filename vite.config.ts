import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {gzipSync} from 'node:zlib';

function mobileEntryBudget():Plugin{
  return {
    name:'myhouse-mobile-entry-budget',apply:'build',
    generateBundle(_options,bundle){
      const visited=new Set<string>();
      const heavy:string[]=[];
      let bytes=0,gzipBytes=0;
      const walk=(name:string)=>{
        if(visited.has(name))return;visited.add(name);
        const chunk=bundle[name];
        if(!chunk||chunk.type!=='chunk')return;
        bytes+=Buffer.byteLength(chunk.code);
        gzipBytes+=gzipSync(chunk.code).byteLength;
        for(const id of Object.keys(chunk.modules)){
          if(/(?:node_modules\/(?:three\/|@react-three\/)|\/scan\/(?:RoomScanPreview|GuidedRoomScan|LiveCameraPreview)\.tsx$)/.test(id.replaceAll('\\','/')))heavy.push(id);
        }
        for(const ref of chunk.imports)walk(ref);
      };
      for(const asset of Object.values(bundle))if(asset.type==='chunk'&&asset.isEntry)walk(asset.fileName);
      const report={entryJavaScriptBytes:bytes,entryGzipBytes:gzipBytes,budgetGzipBytes:350*1024,entryChunks:visited.size,heavyModules:heavy.length};
      this.info('MYHOUSE_ENTRY_BUDGET '+JSON.stringify(report));
      if(heavy.length)this.error('Motor 3D ou scanner chegou ao bundle inicial: '+heavy.slice(0,4).join(', '));
      if(gzipBytes>report.budgetGzipBytes)this.error('Bundle inicial excedeu orçamento de 350 KiB gzip.');
      this.emitFile({type:'asset',fileName:'build-performance.json',source:JSON.stringify(report,null,2)});
    },
  };
}
export default defineConfig({plugins:[react(),mobileEntryBudget()],base:'./'});
