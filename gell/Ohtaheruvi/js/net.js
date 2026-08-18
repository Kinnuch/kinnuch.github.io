// 联机传输层（PeerJS，本地 vendor，无 CDN 依赖）
//
// 房主定序：客户端把操作发给房主，房主赋序号后广播（含发回自己），
// 各端严格按序号顺序应用。回合制不需要同步状态，只需要同步**指令流** ——
// 随机数是种子化的、AI 是确定性的，同一串指令各端推演出同一个局面。
//
// 房主每条指令都带上自己的局面指纹；客户端一比对就知道有没有失步，
// 失步了就向房主要一份完整存档重来。
/* global Peer */

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

export class Net {
  constructor() {
    this.peer = null;
    this.conns = [];          // 房主：全部客户端连接；客户端：[到房主的连接]
    this.isHost = false;
    this.handlers = {};
    this.seq = 0;             // 房主定序计数
    this.recvSeq = 0;         // 期望的下一个序号
    this.buffer = {};         // 乱序缓冲
    this.myName = '';
    this.closed = false;
  }

  on(t, fn) { this.handlers[t] = fn; }
  _fire(msg, conn) { const h = this.handlers[msg.t]; if (h) h(msg, conn); }

  makeCode() {
    let s = 'ohta-';
    for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  host(name, onOpen, onError) {
    this.isHost = true;
    this.myName = name;
    const code = this.makeCode();
    this.peer = new Peer(code);
    this.peer.on('open', (id) => onOpen(id));
    this.peer.on('error', (e) => onError(e.type || String(e)));
    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.conns.push(conn);
        conn.on('data', (msg) => this._hostRecv(msg, conn));
        conn.on('close', () => this._connClosed(conn));
        conn.on('error', () => this._connClosed(conn));
      });
    });
  }

  join(code, name, onOpen, onError) {
    this.isHost = false;
    this.myName = name;
    this.peer = new Peer();
    this.peer.on('error', (e) => onError(e.type || String(e)));
    this.peer.on('open', () => {
      const conn = this.peer.connect(code, { reliable: true });
      conn.on('open', () => {
        this.conns = [conn];
        conn.on('data', (msg) => this._clientRecv(msg));
        conn.on('close', () => this._fire({ t: 'hostLost' }));
        conn.send({ t: 'hello', name });
        onOpen();
      });
      conn.on('error', () => onError('连接失败'));
    });
  }

  _connClosed(conn) {
    this.conns = this.conns.filter((c) => c !== conn);
    this._fire({ t: 'peerLost', conn });
  }

  // ── 房主侧 ────────────────────────────────────────────
  _hostRecv(msg, conn) {
    if (msg.t === 'act') { this.orderCmd(msg.cmd); return; }
    this._fire(msg, conn);
  }

  /** 定序并广播一条指令；房主自己的操作也走这里，保证两边顺序一致 */
  orderCmd(cmd, checksumFn) {
    const item = { t: 'stream', seq: this.seq++, cmd };
    this._applyStream(item, true);          // 房主先算，才有指纹可带
    if (checksumFn) item.sum = checksumFn();
    this.broadcast(item);
  }

  broadcast(msg) {
    for (const c of this.conns) {
      try { c.send(msg); } catch (err) { /* 掉线走 close 事件 */ }
    }
  }

  // ── 客户端侧 ──────────────────────────────────────────
  _clientRecv(msg) {
    if (msg.t === 'stream') { this._applyStream(msg, false); return; }
    this._fire(msg);
  }

  /** 严格按序应用；PeerJS 的 reliable 通道一般有序，这里再上一道保险 */
  _applyStream(item, local) {
    if (local) { this._fire({ t: 'cmd', cmd: item.cmd, seq: item.seq, local: true }); return; }
    this.buffer[item.seq] = item;
    while (this.buffer[this.recvSeq]) {
      const it = this.buffer[this.recvSeq];
      delete this.buffer[this.recvSeq];
      this.recvSeq++;
      this._fire({ t: 'cmd', cmd: it.cmd, seq: it.seq, sum: it.sum });
    }
  }

  /** 客户端：把自己的操作发给房主（房主直接调 orderCmd） */
  sendCmd(cmd) {
    if (this.isHost) return;
    try { this.conns[0]?.send({ t: 'act', cmd }); } catch (err) { /* ignore */ }
  }

  sendToHost(msg) { try { this.conns[0]?.send(msg); } catch (err) { /* ignore */ } }

  close() {
    this.closed = true;
    try { this.peer?.destroy(); } catch (err) { /* ignore */ }
    this.peer = null;
    this.conns = [];
  }
}
