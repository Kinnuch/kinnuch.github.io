class Events {constructor(){this.handlers={};}on(t,cb){(this.handlers[t]??=[]).push(cb);}emit(t,v){for(const cb of this.handlers[t]||[])cb(v);}}
const peers=new Map();let next=1;
class Link extends Events {
  constructor(peer,pc){super();this.peer=peer;this.pc=pc;this.open=false;}
  channel(ch){this.ch=ch;ch.onopen=()=>{this.open=true;this.emit('open');};ch.onmessage=e=>this.emit('data',JSON.parse(e.data));ch.onclose=()=>{this.open=false;this.emit('close');};}
  send(m){this.ch.send(JSON.stringify(m));}close(){this.ch?.close();this.pc.close();}
}
export class LocalPeer extends Events {
  constructor(id){super();this.id=id||`guest-${next++}`;peers.set(this.id,this);setTimeout(()=>this.emit('open',this.id),0);this.links=[];}
  connect(id){const target=peers.get(id);const a=new RTCPeerConnection({iceServers:[]}),b=new RTCPeerConnection({iceServers:[]});
    const left=new Link(id,a),right=new Link(this.id,b);this.links.push(left);target.links.push(right);
    a.onicecandidate=e=>{if(e.candidate)b.addIceCandidate(e.candidate).catch(()=>{});};
    b.onicecandidate=e=>{if(e.candidate)a.addIceCandidate(e.candidate).catch(()=>{});};
    left.channel(a.createDataChannel('gillif'));b.ondatachannel=e=>right.channel(e.channel);
    target.emit('connection',right);
    (async()=>{await a.setLocalDescription(await a.createOffer());await b.setRemoteDescription(a.localDescription);await b.setLocalDescription(await b.createAnswer());await a.setRemoteDescription(b.localDescription);})();
    return left;
  }
  destroy(){for(const c of this.links)c.close();peers.delete(this.id);}reconnect(){}
}
