/** UI gate only; the backend independently validates saved answers. */
export function submissionReady(state:{started:boolean;submitted:boolean;revealed:boolean;completed:string[];total:number}|null,dirty:boolean){
 return !!state && state.started && !state.submitted && !state.revealed && !dirty && state.total>0 && new Set(state.completed).size===state.total;
}
