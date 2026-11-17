import {Component,Suspense,type ReactNode} from 'react';
import {Feedback,LoadingState} from './UiState';
type Props={title:string;children:ReactNode;onBack?:()=>void;backLabel?:string};
class ViewBoundary extends Component<Props,{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(!this.state.failed)return this.props.children;
    return <Feedback tone="error" actions={this.props.onBack?<button type="button" className="btn btn-outline" onClick={this.props.onBack}>{this.props.backLabel??'Voltar'}</button>:undefined}>
      Não foi possível abrir esta visualização. Os dados continuam disponíveis. Use outra aba ou volte à tela anterior.
    </Feedback>;
  }
}
export function DeferredView(props:Props){
  return <ViewBoundary {...props}><Suspense fallback={<LoadingState title={props.title} compact action={props.onBack?<button type="button" className="btn btn-outline" onClick={props.onBack}>{props.backLabel??'Voltar'}</button>:undefined}/>}>{props.children}</Suspense></ViewBoundary>;
}
