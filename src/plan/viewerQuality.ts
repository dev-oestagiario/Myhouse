import {useEffect,useState} from 'react';
import {useMobileLayout} from '../shared/layoutMode';
export function viewerDpr(compact:boolean):[number,number]{return compact?[1,1.25]:[1,1.7];}
export function useViewerDpr(){
  const mobileLayout=useMobileLayout();
  const query='(max-width: 820px), (pointer: coarse)';
  const [compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.matchMedia(query).matches);
  useEffect(()=>{
    const media=window.matchMedia(query);
    const update=()=>setCompact(media.matches);
    update();media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  return viewerDpr(mobileLayout||compact);
}
