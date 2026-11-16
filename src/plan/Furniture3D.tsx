import { Edges } from '@react-three/drei';
import type { ScenarioFurniture } from '../types';
import { FURNITURE_COLORS } from '../features/projects/furnitureGeometry';

/** Volumetrias parametrizadas; não são arquivos CAD nem modelos fotorealistas. */
export default function Furniture3D({item,selected,onSelect}:{item:ScenarioFurniture;selected:boolean;onSelect?:(id:string)=>void}){
  const {width:w,depth:d,height:h}=item;
  const color=FURNITURE_COLORS[item.color].hex;
  const dark=item.color==='branco'?'#899cb0':'#576c83';
  const legW=Math.min(.085,w*.13),legD=Math.min(.085,d*.13);
  const slab=(y:number,thickness:number,pigment=color)=><mesh position={[0,y,0]}>
    <boxGeometry args={[w,thickness,d]}/><meshStandardMaterial color={pigment}/></mesh>;
  const legs=(top:number)=><>{[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={x+':'+z}
    position={[x*(w/2-legW),top/2,z*(d/2-legD)]}>
    <boxGeometry args={[legW,top,legD]}/><meshStandardMaterial color={dark}/></mesh>))}</>;
  return <group position={[item.x,0,item.z]} rotation={[0,-item.rotation*Math.PI/180,0]}
    onClick={event=>{event.stopPropagation();onSelect?.(item.id);}}>
    {selected&&<mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[w+.12,d+.12]}/><meshBasicMaterial color="#2563eb" transparent opacity={.21} depthWrite={false}/></mesh>}
    {['sofa','poltrona'].includes(item.kind)&&<>
      {slab(h*.31,Math.max(.14,h*.36))}
      <mesh position={[0,h*.72,d*.39]}><boxGeometry args={[w,h*.5,d*.22]}/><meshStandardMaterial color={color}/></mesh>
      {[-1,1].map(side=><mesh key={side} position={[side*(w/2-w*.08),h*.53,0]}>
        <boxGeometry args={[w*.16,h*.43,d]}/><meshStandardMaterial color={dark}/></mesh>)}
    </>}
    {item.kind==='cama'&&<>
      {slab(h*.31,.2,dark)}
      <mesh position={[0,h*.66,0]}><boxGeometry args={[w*.95,h*.3,d*.95]}/><meshStandardMaterial color="#e5ebf4"/></mesh>
      <mesh position={[0,h*.91,-d*.35]}><boxGeometry args={[w*.56,.08,d*.2]}/><meshStandardMaterial color="#ffffff"/></mesh>
    </>}
    {['mesa','escrivaninha','cadeira'].includes(item.kind)&&<>
      {slab(h*.85,Math.max(.04,h*.12))}{legs(h*.79)}
      {item.kind==='cadeira'&&<mesh position={[0,h*.77,d*.43]}>
        <boxGeometry args={[w,h*.44,Math.max(.055,d*.12)]}/><meshStandardMaterial color={color}/></mesh>}
    </>}
    {['guarda-roupa','armario','estante'].includes(item.kind)&&<>
      <mesh position={[0,h/2,0]}><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={color}/></mesh>
      <mesh position={[0,h*.5,d/2+.01]}><boxGeometry args={[.025,h*.84,.012]}/><meshStandardMaterial color={dark}/></mesh>
      {item.kind==='estante'&&[.22,.44,.66,.88].map(level=><mesh key={level} position={[0,h*level,d/2+.019]}>
        <boxGeometry args={[w*.94,.025,.025]}/><meshStandardMaterial color={dark}/></mesh>)}
    </>}
    {item.kind==='tapete'&&<mesh position={[0,.012,0]}>
      <boxGeometry args={[w,.024,d]}/><meshStandardMaterial color={color} roughness={1}/></mesh>}
    {item.kind==='planta'&&<>
      <mesh position={[0,h*.15,0]}><cylinderGeometry args={[w*.3,w*.22,h*.3,12]}/><meshStandardMaterial color="#bd967c"/></mesh>
      {[0,.16,-.14].map((offset,i)=><mesh key={i} position={[offset*w*.9,h*(.55+i*.1),0]}>
        <sphereGeometry args={[w*.42,12,9]}/><meshStandardMaterial color={i%2?'#77b48c':'#4d966c'}/></mesh>)}
    </>}
    {item.kind==='luminaria'&&<>
      <mesh position={[0,.06,0]}><cylinderGeometry args={[w*.35,w*.35,.12,12]}/><meshStandardMaterial color={dark}/></mesh>
      <mesh position={[0,h*.47,0]}><cylinderGeometry args={[.02,.02,h*.83,10]}/><meshStandardMaterial color={dark}/></mesh>
      <mesh position={[0,h*.86,0]}><cylinderGeometry args={[w*.4,w*.23,h*.24,14]}/><meshStandardMaterial color={color}/></mesh>
    </>}
    {selected&&<mesh position={[0,h/2,0]}>
      <boxGeometry args={[w,h,d]}/><meshBasicMaterial color="#2563eb" transparent opacity={.08} depthWrite={false}/>
      <Edges color="#1d57a8" threshold={1}/></mesh>}
  </group>;
}
