import assert from 'node:assert/strict';
import { Room, createMatch, acceptSnapshot } from '../js/room.js';
import { recount } from '../js/sim.js';
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
console.log(`联机与组队 ${checks} 项通过`);
