import {useViewerDpr} from './viewerQuality';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';
import { DoubleSide, Shape } from 'three';
import type { Direction, Room, ScenarioFurniture } from '../types';
import Furniture3D from './Furniture3D';
import { getFootprint, getWallSegments, layoutWallPieces } from './geometry';

function RoomFloor({ room, selected, color }: { room: Room; selected: boolean; color: string }) {
  const shape = useMemo(() => {
    const vertices = getFootprint(room);
    const result = new Shape();
    result.moveTo(vertices[0].x, -vertices[0].z);
    for (let i = 1; i < vertices.length; i++) result.lineTo(vertices[i].x, -vertices[i].z);
    result.closePath();
    return result;
  }, [room]);
  return <mesh position={[room.x, -0.03, room.z]} rotation={[-Math.PI / 2, 0, 0]}>
    <shapeGeometry args={[shape]}/>
    <meshStandardMaterial color={selected ? '#e2edff' : color} side={DoubleSide}/>
    <Edges color="#b6c8e4" threshold={12}/>
  </mesh>;
}

function RoomBoundary({ room, selectedRoomId, selectedWall, onSelect }: {
  room: Room;
  selectedRoomId: string;
  selectedWall: Direction;
  onSelect: (id: string, direction: Direction) => void;
}) {
  const walls=useMemo(()=>getWallSegments(room).map(segment=>({segment,pieces:layoutWallPieces(room,segment.edge)})),[room]);
  return <group>
    {walls.map(({segment,pieces}) => {
      const ux = (segment.to.x - segment.from.x) / segment.length;
      const uz = (segment.to.z - segment.from.z) / segment.length;
      const angle = -Math.atan2(uz, ux);
      const active = selectedRoomId === room.id && selectedWall === segment.direction;
      return <group key={segment.edge}>{pieces.map((piece, i) => {
        const mid = (piece.start + piece.end) / 2;
        return <mesh key={i} position={[room.x + segment.from.x + ux * mid, (piece.bottom + piece.top) / 2, room.z + segment.from.z + uz * mid]} rotation={[0, angle, 0]}
          onClick={event => { event.stopPropagation(); onSelect(room.id, segment.direction); }}>
          <boxGeometry args={[piece.end - piece.start, piece.top - piece.bottom, 0.08]}/>
          <meshStandardMaterial color={active ? '#7fb1f5' : '#9eafc7'} transparent opacity={active ? 0.76 : 0.42} depthWrite={false}/>
          <Edges color={active ? '#2d63ad' : '#8da5c9'} threshold={15}/>
        </mesh>;
      })}</group>;
    })}
  </group>;
}

/** Interactive viewer remains presentation-only; geometry editing lives in the 2D editor. */
export default function HouseModel({ rooms, selectedRoomId, selectedWall, onSelect, furniture=[], selectedFurnitureId='', onSelectFurniture }: {
  rooms: Room[];
  selectedRoomId: string;
  selectedWall: Direction;
  onSelect: (id: string, direction: Direction) => void;
  furniture?: ScenarioFurniture[];
  selectedFurnitureId?: string;
  onSelectFurniture?: (id:string)=>void;
}) {
  const roomById=useMemo(()=>new Map(rooms.map(room=>[room.id,room])),[rooms]);
  const minX = Math.min(...rooms.map(r => r.x));
  const maxX = Math.max(...rooms.map(r => r.x + r.width));
  const minZ = Math.min(...rooms.map(r => r.z));
  const maxZ = Math.max(...rooms.map(r => r.z + r.length));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const size = Math.max(maxX - minX, maxZ - minZ, 4);
  const height = Math.max(...rooms.map(r => r.height));

  return <Canvas frameloop="demand" camera={{ position: [cx + size * 1.15, height + size * 1.22, cz + size * 1.22], fov: 43 }}
    dpr={useViewerDpr()} gl={{ antialias: true }}>
    <color attach="background" args={['#f4f7fc']}/>
    <ambientLight intensity={1.25}/>
    <directionalLight position={[7, 12, 8]} intensity={1.8}/>
    <gridHelper args={[Math.max(30, size * 3), 30, '#cedbea', '#e2eaf6']} position={[cx, -0.11, cz]}/>
    {rooms.map((room, i) => <group key={room.id}>
      <RoomFloor room={room} selected={selectedRoomId === room.id} color={i % 2 ? '#e6eef9' : '#f1f5fb'}/>
      <RoomBoundary room={room} selectedRoomId={selectedRoomId} selectedWall={selectedWall} onSelect={onSelect}/>
    </group>)}
    {furniture.map(item=>{
      const room=roomById.get(item.roomId);
      return room?<group key={item.id} position={[room.x,0,room.z]}>
        <Furniture3D item={item} selected={selectedFurnitureId===item.id} onSelect={onSelectFurniture}/>
      </group>:null;
    })}
    <OrbitControls target={[cx, 0, cz]} enablePan enableZoom minDistance={2} maxDistance={120} maxPolarAngle={Math.PI / 2.05}/>
  </Canvas>;
}
