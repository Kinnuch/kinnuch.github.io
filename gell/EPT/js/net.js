// EPT · 联机传输层（PeerJS，本地 vendor，无 CDN 依赖）
// 房主权威定序：客户端操作发给房主，房主赋序号后广播（含发回自己），各端严格按序应用。
/* global Peer */

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

export class Net {
  constructor() {
    this.peer = null;
    this.conns = [];          // 房主：所有客户端连接；客户端：[到房主的连接]
    this.isHost = false;
    this.handlers = {};       // t -> fn(msg, conn)
    this.seq = 0;             // 房主定序计数
    this.recvSeq = 0;         // 期望的下一个序号
    this.buffer = {};         // 乱序缓冲
    this.myName = '';
    this.closed = false;
  }

  on(t, fn) { this.handlers[t] = fn; }
  _fire(msg, conn) { const h = this.handlers[msg.t]; if (h) h(msg, conn); }

  makeCode() {
    let s = 'ept-';
    for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  host(name, onOpen, onError) {
    this.isHost = true;
    this.myName = name;
    const code = this.makeCode();
    this.peer = new Peer(code);
    this.peer.on('open', id => onOpen(id));
    this.peer.on('error', e => onError(e.type || String(e)));
    this.peer.on('connection', conn => {
      conn.on('open', () => {
        this.conns.push(conn);
        conn.on('data', msg => this._hostRecv(msg, conn));
        conn.on('close', () => this._connClosed(conn));
        conn.on('error', () => this._connClosed(conn));
      });
    });
  }

  join(code, name, onOpen, onError) {
    this.isHost = false;
    this.myName = name;
    this.peer = new Peer();
    this.peer.on('error', e => onError(e.type || String(e)));
    this.peer.on('open', () => {
      const conn = this.peer.connect(code, { reliable: true });
      conn.on('open', () => {
        this.conns = [conn];
        conn.on('data', msg => this._clientRecv(msg));
        conn.on('close', () => this._fire({ t: 'hostLost' }));
        conn.send({ t: 'hello', name });
        onOpen();
      });
      conn.on('error', () => onError('连接失败'));
    });
  }

  _connClosed(conn) {
    this.conns = this.conns.filter(c => c !== conn);
    this._fire({ t: 'peerLost', conn });
  }

  // ---- 房主侧 ----
  _hostRecv(msg, conn) {
    if (msg.t === 'act') { this.orderAction(conn._pi, msg.a); return; }
    this._fire(msg, conn);
  }
  // 定序并广播一个操作（pi=玩家序号；房主自己的操作也走这里）
  orderAction(pi, a) {
    if (pi === undefined || pi === null) return;
    const item = { t: 'stream', seq: this.seq++, pi, a };
    this.broadcast(item);
    this._applyStream(item);
  }
  broadcast(msg) { for (const c of this.conns) { try { c.send(msg); } catch (err) { /* 掉线走 close */ } } }

  // ---- 客户端侧 ----
  _clientRecv(msg) {
    if (msg.t === 'stream') { this._applyStream(msg); return; }
    this._fire(msg);
  }

  // 严格按序应用操作流（乱序缓冲；PeerJS reliable 通道一般有序，双保险）
  _applyStream(item) {
    this.buffer[item.seq] = item;
    while (this.buffer[this.recvSeq]) {
      const it = this.buffer[this.recvSeq];
      delete this.buffer[this.recvSeq];
      this.recvSeq++;
      this._fire({ t: 'streamItem', pi: it.pi, a: it.a });
    }
  }

  // 客户端：把自己的操作发给房主
  sendAction(a) {
    if (this.isHost) return; // 房主直接 orderAction
    try { this.conns[0]?.send({ t: 'act', a }); } catch (err) { /* ignore */ }
  }

  sendToHost(msg) { try { this.conns[0]?.send(msg); } catch (err) { /* ignore */ } }

  close() {
    this.closed = true;
    try { this.peer?.destroy(); } catch (err) { /* ignore */ }
    this.peer = null; this.conns = [];
  }
}
