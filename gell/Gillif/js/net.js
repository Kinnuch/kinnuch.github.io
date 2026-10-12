import { Room, createMatch, acceptSnapshot } from './room.js';

export function normalizeRoomCode(value) {
  let code=String(value || '').trim().toLowerCase();
  if (/^[a-z2-9]{6}$/.test(code)) code='gillif-'+code;
  return /^gillif-[a-z2-9]{6}$/.test(code) ? code : null;
}

export function connectionError(error) {
  const messages={
    'peer-unavailable':'找不到这个房间。请检查房号，并确认房主仍开着游戏页面',
    'network':'无法连接公网房号服务，请检查网络后重试',
    'socket-error':'与公网房号服务的连接失败，请稍后重试',
    'socket-closed':'与公网房号服务的连接已断开，请重新建房或加入',
    'server-error':'公网房号服务暂时不可用，请稍后重试',
    'browser-incompatible':'当前浏览器不支持联机，请使用新版 Chrome、Edge 或 Firefox',
    'webrtc':'房号已找到，但两台设备无法建立直连。请尝试换网络后重试',
    'unavailable-id':'房号已被占用，请重新创建房间',
    'message-too-big':'同步消息超过通道限制，请刷新页面使用最新版本',
  };
  return messages[error?.type] || `联机失败：${error?.message || error?.type || '未知错误'}`;
}

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
    this.hooks.status?.('正在注册房号…');
    this.deadline(30000,'注册房号超时，请检查公网房号服务是否可访问');
    this.peer=new this.PeerClass(code);
    this.peer.on('open',id=>{
      if (this.closed) return;
      clearTimeout(this.joinTimer);
      this.id=id; this.room.join(id,name,0);
      this.hooks.open?.(id); this.hooks.game?.(this.G,0); this.publish();
    });
    this.peer.on('connection',c=>this.wireHost(c)); this.errors();
  }
  joinRoom(code,name) {
    code=normalizeRoomCode(code);
    if (!code) {this.hooks.error?.('房号格式不正确，请输入完整房号或末尾六位');return;}
    this.host=false; this.closed=false;
    this.hooks.status?.('正在连接公网房号服务…');
    this.deadline(30000,'无法连接公网房号服务，请检查网络后重试');
    this.peer=new this.PeerClass(); this.errors();
    this.peer.on('open',id=>{
      if (this.closed) return;
      this.id=id;
      this.hooks.status?.('正在查找房间并建立直连…');
      this.deadline(30000,'房号服务已连接，但与房主直连超时。请确认房主在线，或尝试换网络');
      // PeerJS 的 JSON serializer 在 16,300 字节处直接拒发；四方局开局快照就会超限。
      // binary serializer 会自动分片/重组，包含在途舰船的中后期大快照也能传送。
      const c=this.peer.connect(code,{reliable:true,serialization:'binary'});
      this.connection=c;
      c.on('open',()=>{
        if (this.closed) return;
        this.hooks.status?.('已连接房主，正在接收局面…');
        this.deadline(15000,'已连上房主，但未收到局面。请双方刷新游戏页面后重新建房');
        c.send({t:'hello',name});
      });
      c.on('data',m=>this.receive(m));
      c.on('close',()=>{if (!this.closed) {this.hooks.lost?.();this.close();}});
      c.on('error',e=>{if(!this.closed){this.hooks.error?.(connectionError(e));this.close();}});
    });
  }
  deadline(ms,message) {
    clearTimeout(this.joinTimer);
    this.joinTimer=setTimeout(()=>{if(!this.closed){this.hooks.error?.(message);this.close();}},ms);
  }
  errors() {
    this.peer.on('error',e=>{
      if (this.closed) return;
      // 一个加入者的协商失败不应该关闭所有人的房间。
      if(this.host && ['webrtc','peer-unavailable'].includes(e.type)) this.hooks.notice?.(connectionError(e));
      else {this.hooks.error?.(connectionError(e));this.close();}
    });
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
    c.on('close',drop);c.on('error',e=>{if(!this.closed)this.hooks.notice?.(connectionError(e));drop();});
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
    else if (m.t==='notice') (this.hooks.notice || this.hooks.error)?.(m.text);
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
