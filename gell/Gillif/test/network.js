import assert from 'node:assert/strict';
import { Room, createMatch, acceptSnapshot } from '../js/room.js';
import { recount } from '../js/sim.js';
import { Network, normalizeRoomCode, connectionError } from '../js/net.js';
let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;};
for(const layout of ['2','3','4','5','6','2v2','3v3','2v2v2']) {
  const G=createMatch({layout,seed:77,galaxy:'large',challenge:'hard'});
  const sizes=layout.includes('v')?layout.split('v').map(Number):Array(+layout).fill(1);
  check(sizes.every((n,f)=>G.stars.filter(s=>s.owner===f).length===n),`${layout} 母星按队伍配置`);
  check(recount(G).every((n,f)=>n===G.factions[f].total),`${layout} 舰船总数`);
}
assert.throws(()=>createMatch({layout:'3v3',galaxy:'small'}));checks++;
const G=createMatch({layout:'2v2',seed:7,challenge:'hard'});
const room=new Room(G,'free',['defense','teleport']);
room.join('host','房主',0);room.join('friend','队友',0);room.join('enemy','对手',1);
check(G.factions[0].human&&G.factions[1].human,'玩家接管');
const home=G.factions[0].home, other=G.factions[1].home;
check(!room.command('enemy',{type:'order',f:0,star:home,target:G.stars[home].links[0]}),'不能冒充势力');
check(!room.command('unknown',{type:'order',star:home,target:-1}),'未加入者不能操作');
check(room.command('friend',{type:'order',star:home,target:G.stars[home].links[0]}),'队友可以调兵');
check(room.command('host',{type:'order',star:home,target:-1}),'另一位队友可停止同一星的调度');
room.leave('friend');check(G.factions[0].human,'还有队友则不交给 AI');
room.leave('enemy');check(!G.factions[1].human&&G.factions[1].personality,'断线 AI 接管');
room.paused=true;room.tick();check(G.tick===0,'暂停不推进');room.paused=false;
for(let i=0;i<1200;i++){room.tick();G.events=[];}
check(recount(G).every((n,f)=>n===G.factions[f].total),'一分钟舰船守恒');
G.factions[0].ready.teleport=0;
check(room.command('host',{type:'ability',card:'teleport',src:home,dst:other}),'主机校验能力');
const snap=room.snapshot();const clone={};
check(acceptSnapshot(clone,snap,0),'中途加入快照');
check(JSON.stringify(clone.transit)===JSON.stringify(G.transit)&&JSON.stringify(clone.effects)===JSON.stringify(G.effects),'在途舰船和效果完整同步');
check(!acceptSnapshot(clone,snap,snap.seq),'拒绝旧快照');
clone.stars[home].ships[0]++;check(clone.stars[home].ships[0]!==G.stars[home].ships[0],'快照独立');
for(const restriction of ['coop','deathmatch']) {
  const r=new Room(createMatch({layout:'4'}),restriction,[]);r.join('a','a',0);r.join('b','b');
  check(r.choose('b',restriction==='coop'?0:1),'允许的势力');
  check(!r.choose('b',restriction==='coop'?1:0),'拒绝冲突势力');
  check(r.choose('b',-1),'退回观战');
}
check(normalizeRoomCode(' ABCD23 ')==='gillif-abcd23','六位短房号自动补前缀并忽略大小写');
check(normalizeRoomCode(' GILLIF-ABCD23 ')==='gillif-abcd23','完整房号忽略首尾空格');
check(normalizeRoomCode('abcdefg')===null,'拒绝无效房号');
check(connectionError({type:'peer-unavailable'}).includes('找不到这个房间'),'不存在的房间给出明确提示');
check(connectionError({type:'message-too-big'}).includes('通道限制'),'消息超限可诊断');
class Events {
  constructor(){this.handlers={};}
  on(t,fn){this.handlers[t]=fn;}
  fire(t,data){this.handlers[t]?.(data);}
}
class FakePeer extends Events {
  connect(id,options){this.target=id;this.options=options;this.c=new Events();this.c.peer=id;this.c.send=m=>{this.sent=m;};return this.c;}
  destroy(){this.destroyed=true;}
}
const stages=[];const net=new Network({status:text=>stages.push(text)},FakePeer);
net.joinRoom(' ABCD23 ','玩家');net.peer.fire('open','guest');
check(net.peer.target==='gillif-abcd23','传输层也接受规范化房号');
check(net.peer.options.serialization==='binary','真实 PeerJS 必须选择自动分片的 binary serializer');
net.peer.c.fire('open');
check(net.peer.sent.t==='hello'&&stages.at(-1).includes('接收局面'),'通道打开后发送身份并显示接收阶段');
net.receive(room.snapshot());net.close();check(net.peer.destroyed,'关闭连接释放资源');
console.log(`联机与组队 ${checks} 项通过`);
