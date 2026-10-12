import { Room, createMatch, acceptSnapshot } from './room.js';

export class Network {
  constructor(hooks = {}, PeerClass = globalThis.Peer) {
    this.hooks=hooks; this.PeerClass=PeerClass; this.peer=null; this.links=new Map();
    this.room=null; this.G=null; this.seq=0; this.events=[]; this.host=false; this.closed=false;
    this.timer=null; this.joinTimer=null; this.lastPublish=0;
  }
  hostRoom(name, options, restriction, deck) {
    this.host=true; this.closed=false;
    this.room=new Room(createMatch(options),restriction,deck); this.G=this.room.G; this.room.paused=true;
    const bytes=crypto.getRandomValues(new Uint8Array(6));
    const code='gillif-'+Array.from(bytes,b=>'abcdefghjkmnpqrstuvwxyz23456789'[b%29]).join('');
    this.peer=new this.PeerClass(code);
    this.peer.on('open',id=>{
      this.id=id; this.room.join(id,name,0);
      this.hooks.open?.(id); this.hooks.game?.(this.G,0); this.publish();
    });
    this.peer.on('connection',c=>this.wireHost(c)); this.errors();
  }
  joinRoom(code,name) {
    this.host=false; this.closed=false;
    this.peer=new this.PeerClass(); this.errors();
    this.joinTimer=setTimeout(()=>{ this.hooks.error?.('连接超时，请检查房号或网络后重试'); this.close(); },15000);
    this.peer.on('open',id=>{
      this.id=id;
      const c=this.peer.connect(code.trim().toLowerCase(),{reliable:true,serialization:'json'});
      this.connection=c;
      c.on('open',()=>{c.send({t:'hello',name});});
      c.on('data',m=>this.receive(m));
      c.on('close',()=>{if (!this.closed) {this.hooks.lost?.();this.close();}});
      c.on('error',()=>{this.hooks.error?.('与房主的连接中断');this.close();});
    });
  }
  errors() {
    this.peer.on('error',e=>{ if (!this.closed) {this.hooks.error?.(`联机失败：${e.type || e.message}`);this.close();} });
    this.peer.on('disconnected',()=>{if (!this.closed) this.peer.reconnect();});
  }
  wireHost(c) {
    let authenticated=false, count=0, since=Date.now();
    const expiry=setTimeout(()=>{if (!authenticated) c.close();},10000);
    c.on('data',m=>{
      if (!m || typeof m!=='object' || this.closed) return;
      if (Date.now()-since>1000) {since=Date.now();count=0;} if (++count>50) return;
      if (!authenticated) {
        if (m.t!=='hello') return;
        try {
          this.room.join(c.peer,m.name); authenticated=true;clearTimeout(expiry);
          this.links.set(c.peer,c);this.publish();
        } catch (e) {c.send({t:'error',text:e.message});setTimeout(()=>c.close(),100);}
        return;
      }
      if (m.t==='command') this.room.command(c.peer,m.cmd);
      else if (m.t==='choose') {if (!this.room.choose(c.peer,m.f)) c.send({t:'notice',text:'这个势力不可加入，请检查房间的加入规则'});this.publish();}
      else if (m.t==='chat') this.chatFrom(c.peer,m.text);
    });
    const drop=()=>{clearTimeout(expiry);if (this.links.delete(c.peer)) {this.room.leave(c.peer);this.publish();}};
    c.on('close',drop);c.on('error',drop);
  }
  receive(m) {
    if (!m || this.closed) return;
    if (m.t==='state') {
      if (!this.G) {
        if (!m.state?.network) return;
        this.G={}; clearTimeout(this.joinTimer);
        this.hooks.open?.(this.connection.peer);
      }
      if (!acceptSnapshot(this.G,m,this.seq)) return;
      const first=this.seq===0;this.seq=m.seq;
      this.members=m.members;this.paused=m.paused;
      const f=m.members.find(p=>p.id===this.id)?.faction ?? -1;
      if (first) this.hooks.game?.(this.G,f);
      this.hooks.state?.(m,f);
    } else if (m.t==='chat') this.hooks.chat?.(m);
    else if (m.t==='error') {this.hooks.error?.(m.text);this.close();}
    else if (m.t==='notice') this.hooks.error?.(m.text);
  }
  publish() {
    if (!this.host || this.closed || !this.id) return;
    const m=this.room.snapshot(this.events.splice(0));
    this.members=m.members;this.paused=m.paused;
    for (const c of this.links.values()) if(c.open) c.send(m);
    this.hooks.state?.(m,this.room.members.get(this.id)?.faction ?? -1);
  }
  tick() {if(this.host && !this.closed) {const n=this.G.events.length;this.room.tick();this.events.push(...this.G.events.slice(n));}}
  pump(now) {if (this.host && now-this.lastPublish>=0.1) {this.lastPublish=now;this.publish();}}
  command(cmd) {if(this.closed)return;if(this.host) {const n=this.G.events.length;this.room.command(this.id,cmd);this.events.push(...this.G.events.slice(n));} else this.connection?.send({t:'command',cmd});}
  choose(f) {if(this.closed)return;if(this.host){this.room.choose(this.id,f);this.publish();}else this.connection?.send({t:'choose',f});}
  pause(p) {if(this.host && !this.closed){this.room.paused=p;this.publish();}}
  chat(text) {if(this.host)this.chatFrom(this.id,text);else this.connection?.send({t:'chat',text});}
  chatFrom(id,text) {
    const p=this.room.members.get(id); if(!p || typeof text!=='string' || !text.trim())return;
    const m={t:'chat',name:p.name,text:text.trim().slice(0,240)};
    this.hooks.chat?.(m);for(const c of this.links.values())if(c.open)c.send(m);
  }
  close() {this.closed=true;clearTimeout(this.joinTimer);clearInterval(this.timer);for(const c of this.links.values())c.close();this.peer?.destroy();this.links.clear();}
}
