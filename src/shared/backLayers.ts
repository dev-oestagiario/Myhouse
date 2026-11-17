
type Layer = { priority: number; close: () => void };

export class BackLayers {
  private layers = new Map<symbol,Layer>();
  add(priority:number,close:()=>void){
    const key=Symbol();
    this.layers.set(key,{priority,close});
    return ()=>{this.layers.delete(key);};
  }
  handle():boolean{
    let winner:Layer|undefined;
    for(const layer of this.layers.values()){
      if(!winner||layer.priority>=winner.priority)winner=layer;
    }
    if(!winner)return false;
    winner.close(); // Cancellation or a busy dialog still consumes this back press.
    return true;
  }
}
export const backLayers = new BackLayers();
