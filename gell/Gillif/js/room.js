// 房主权威房间，独立于 PeerJS；传输层与测试共用。
import { generateGalaxy, chooseHomes } from './galaxy.js';
import { buildGame, cleanDeck } from './state.js';
import { applyCommand, step } from './sim.js';
import { addShips, setOwner } from './core.js';
import { ABILITIES, CHALLENGES, PERSONALITIES } from './rules.js';

export function createMatch(o = {}) {
  const layout = o.layout || '4';
  const sizes = layout.includes('v') ? layout.split('v').map(Number) : Array(Number(layout)).fill(1);
  if (sizes.length < 2 || sizes.some(n => !Number.isInteger(n) || n < 1) || sizes.reduce((a,b) => a+b,0) > 6) throw Error('人数配置无效');
  const gal = generateGalaxy(o.galaxy || 'large', o.seed || 1);
  const slots = sizes.reduce((a,b) => a+b,0);
  if (slots > ({ small:3, medium:5, defensible:5 }[o.galaxy] || 6)) throw Error('星系容不下这些玩家');
  const homes = chooseHomes(gal, slots, o.seed || 1);
  const G = buildGame(gal, homes.slice(0, sizes.length), { ...o, humans: [], deck: [] });
  let extra = sizes.length;
  sizes.forEach((n,f) => {
    for (let k=1;k<n;k++) {
      const s = G.stars[homes[extra++]];
      s.control[f] = 100; setOwner(G,s,f); addShips(G,s,f,10);
    }
    G.factions[f].stats.captured = 0;
    G.factions[f].stats.created = 0;
    G.factions[f].stats.maxStars = n;
    G.factions[f].stars = n;
    G.factions[f].stats.maxShips = n * 10;
  });
  G.network = true;
  G.events = [];
  return G;
}

export class Room {
  constructor(G, restriction = 'free', deck = []) {
    this.G = G; this.restriction = restriction;
    this.deck = cleanDeck(deck); this.members = new Map(); this.seq = 0; this.paused = false;
  }
  join(id, name, faction = -1) {
    if (this.members.has(id)) return false;
    if (this.members.size >= 6) throw Error('房间已满');
    this.members.set(id, { id, name: String(name || '玩家').slice(0,16), faction:-1 });
    if (faction >= 0) this.choose(id,faction);
    return true;
  }
  choose(id, f) {
    const member = this.members.get(id), fac = this.G.factions[f];
    if (!member || this.G.over) return false;
    if (f === -1) {member.faction=-1;this.refresh();return true;}
    if (!Number.isInteger(f) || !fac || !fac.alive) return false;
    const others = [...this.members.values()].filter(m => m.id !== id && m.faction >= 0);
    if (this.restriction === 'coop' && others.some(m => m.faction !== f)) return false;
    if (this.restriction === 'deathmatch' && others.some(m => m.faction === f)) return false;
    member.faction = f; this.refresh(); return true;
  }
  leave(id) { this.members.delete(id); this.refresh(); }
  refresh() {
    for (const fac of this.G.factions) {
      const human = [...this.members.values()].some(m => m.faction === fac.id);
      if (human && !fac.human) {
        fac.deck = this.deck.slice(); fac.personality = null; fac.pace = 1;
        fac.ready = Object.fromEntries(fac.deck.map(c => [c,this.G.time+ABILITIES[c].cd]));
        fac.cdTotal = Object.fromEntries(fac.deck.map(c => [c,ABILITIES[c].cd]));
      } else if (!human && fac.human) {
        fac.personality = CHALLENGES[this.G.challenge].personalities ? 'offensive' : null;
        fac.pace = CHALLENGES[this.G.challenge].aiPace;
        fac.deck = fac.personality ? PERSONALITIES[fac.personality].deck.slice() : [];
        fac.ready = Object.fromEntries(fac.deck.map(c => [c,this.G.time+ABILITIES[c].cd]));
        fac.cdTotal = Object.fromEntries(fac.deck.map(c => [c,ABILITIES[c].cd]));
      }
      fac.human = human;
    }
  }
  command(id, cmd) {
    const m = this.members.get(id);
    if (!m || m.faction < 0 || !cmd || !['order','ping','ability'].includes(cmd.type)) return false;
    const clean = { type:cmd.type, f:m.faction };
    for (const k of ['star','target','src','dst']) if (Number.isInteger(cmd[k])) clean[k] = cmd[k];
    if (typeof cmd.card === 'string') clean.card = cmd.card;
    return applyCommand(this.G,clean);
  }
  tick() {
    if (this.paused || this.G.over) return;
    // 联机出局后允许观战，其他势力继续争夺。
    step(this.G);
  }
  snapshot(events = []) {
    const state = JSON.parse(JSON.stringify({ ...this.G, log:[], queue:[], events:[] }));
    return { t:'state', seq:++this.seq, state, events, paused:this.paused, members:[...this.members.values()] };
  }
}

export function acceptSnapshot(G, message, lastSeq) {
  if (message.t !== 'state' || !Number.isInteger(message.seq) || message.seq <= lastSeq || !message.state?.network) return false;
  Object.assign(G,message.state); G.events = message.events || [];
  return true;
}
