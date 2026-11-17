import {useViewerDpr} from './viewerQuality';
import {useMemo} from 'react';
import {Canvas} from '@react-three/fiber';
import {Edges,OrbitControls} from '@react-three/drei';
import {DoubleSide,Shape} from 'three';
import type {ScenarioOutdoorArea} from '../types';
import {OUTDOOR_FINISHES,outdoorEdges,outdoorSignedArea} from '../features/projects/outdoorGeometry';

/** Visualização esquemática, sem cálculos estruturais ou instruções de obra. */
export default function OutdoorModel({area}:{area:ScenarioOutdoorArea}){
  const shape=useMemo(()=>{
    const value=new Shape();
    area.outline.forEach((p,i)=>{if(i)value.lineTo(p.x,-p.z);else value.moveTo(p.x,-p.z);});
    value.closePath();return value;
  },[area.outline]);
  const xs=area.outline.map(p=>p.x),zs=area.outline.map(p=>p.z);
  const cx=area.x+(Math.min(...xs)+Math.max(...xs))/2;
  const cz=area.z+(Math.min(...zs)+Math.max(...zs))/2;
  const size=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs),4);
  const edges=outdoorEdges(area.outline);
  const winding=Math.sign(outdoorSignedArea(area.outline))||1;
  const step=area.stepsEdge===null?null:edges[area.stepsEdge];
  const angle=step?-Math.atan2(step.to.z-step.from.z,step.to.x-step.from.x):0;
  const ux=step?(step.to.x-step.from.x)/step.length:0;
  const uz=step?(step.to.z-step.from.z)/step.length:0;
  const sx=step?area.x+(step.from.x+step.to.x)/2:0;
  const sz=step?area.z+(step.from.z+step.to.z)/2:0;
  return <Canvas frameloop="demand" camera={{position:[cx+size*1.2,area.level+size+2,cz+size*1.2],fov:43}}
    dpr={useViewerDpr()} gl={{antialias:true}}>
    <color attach="background" args={['#f3f7fc']}/>
    <ambientLight intensity={1.3}/><directionalLight position={[5,12,8]} intensity={1.7}/>
    <gridHelper args={[Math.max(20,size*3),20,'#bdccdc','#dde7f1']}
      position={[cx,area.level-0.1,cz]}/>
    <mesh position={[area.x,area.level,area.z]} rotation={[-Math.PI/2,0,0]}>
      <extrudeGeometry args={[shape,{depth:area.thickness,bevelEnabled:false}]}/>
      <meshStandardMaterial color={OUTDOOR_FINISHES[area.finish].color} side={DoubleSide}/>
      <Edges threshold={15} color="#68798a"/>
    </mesh>
    {area.railingEdges.map(i=>{
      const edge=edges[i],a=-Math.atan2(edge.to.z-edge.from.z,edge.to.x-edge.from.x);
      const y=area.level+area.thickness;
      return <group key={i}>
        <mesh position={[area.x+(edge.from.x+edge.to.x)/2,y+.88,area.z+(edge.from.z+edge.to.z)/2]}
          rotation={[0,a,0]}>
          <boxGeometry args={[edge.length,.045,.05]}/><meshStandardMaterial color="#59718a"/>
        </mesh>
        {[0,.5,1].map(t=><mesh key={t}
          position={[area.x+edge.from.x+(edge.to.x-edge.from.x)*t,y+.44,
            area.z+edge.from.z+(edge.to.z-edge.from.z)*t]}>
          <boxGeometry args={[.05,.88,.05]}/><meshStandardMaterial color="#59718a"/>
        </mesh>)}
      </group>;
    })}
    {step&&[0,1].map(i=><mesh key={i} rotation={[0,angle,0]}
      position={[sx+winding*uz*(.25+i*.34),area.level+area.thickness-.10-i*.10,
        sz-winding*ux*(.25+i*.34)]}>
      <boxGeometry args={[Math.min(1.5,step.length*.7),.12,.32]}/>
      <meshStandardMaterial color="#aaa39a"/><Edges color="#777e87"/>
    </mesh>)}
    <OrbitControls target={[cx,area.level,cz]} enablePan enableZoom minDistance={2}
      maxDistance={100} maxPolarAngle={Math.PI/2.05}/>
  </Canvas>;
}
