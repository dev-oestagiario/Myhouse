import {useMemo} from 'react';
import {Canvas} from '@react-three/fiber';
import {DoubleSide,Shape} from 'three';
import {Edges,OrbitControls} from '@react-three/drei';
import {getFootprint} from '../plan/geometry';
import {useViewerDpr} from '../plan/viewerQuality';
import type {RoomScanDraft} from './roomScan';
export default function RoomScanPreview({ draft }: { draft: RoomScanDraft }) {
  const w = draft.width, l = draft.length, h = draft.height;
  const radius = Math.max(w,l,h);
  const vertices = getFootprint(draft);
  const shape = useMemo(() => {
    const floor = new Shape();
    vertices.forEach((p,i)=>{if(i===0)floor.moveTo(p.x,p.z);else floor.lineTo(p.x,p.z);});
    floor.closePath();
    return floor;
  },[draft.footprint,w,l]);
  return <div className="scan-3d" role="img" aria-label={'Prévia do cômodo 3D: '+w.toFixed(2)+' por '+l.toFixed(2)+' por '+h.toFixed(2)+' metros'}>
    <Canvas frameloop="demand" camera={{ position: [w*1.4,h*2,l*1.65],fov:45 }} dpr={useViewerDpr()}>
      <color attach="background" args={['#f4f7fc']}/>
      <ambientLight intensity={1.4}/>
      <directionalLight position={[6,9,7]} intensity={1.6}/>
      <mesh position={[-w/2,-0.03,-l/2]} rotation={[Math.PI/2,0,0]}>
        <shapeGeometry args={[shape]}/>
        <meshStandardMaterial color="#dbeafe" side={DoubleSide}/>
      </mesh>
      {vertices.map((p,i)=>{
        const n=vertices[(i+1)%vertices.length], dx=n.x-p.x, dz=n.z-p.z;
        return <mesh key={i} position={[(p.x+n.x)/2-w/2,h/2,(p.z+n.z)/2-l/2]} rotation={[0,-Math.atan2(dz,dx),0]}>
          <boxGeometry args={[Math.hypot(dx,dz),h,0.04]}/>
          <meshStandardMaterial color="#9db9de" transparent opacity={0.26} depthWrite={false} side={DoubleSide}/>
          <Edges color="#567ba9"/>
        </mesh>;
      })}
      <OrbitControls target={[0,h/2,0]} enablePan={false} minDistance={Math.max(1.5,radius)} maxDistance={Math.max(15,radius*5)} maxPolarAngle={Math.PI/2.05}/>
    </Canvas>
  </div>;
}

