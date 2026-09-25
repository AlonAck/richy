// Real Excel 97-2003 files, written byte by byte: an OLE2 container holding a
// BIFF8 "Workbook" stream. Built here rather than committed as binaries, like
// the xlsx fixtures, so a diff of the test says what the file holds.
//
// A cell is one of:
//   "text"                 a shared string (LABELSST)
//   { n: 412.75 }          a NUMBER record
//   { rk: 342.9 }          an RK record - Excel's packed form for small numbers
//   { date: "2026-09-03" } a NUMBER carrying a date format
//   null / ""              nothing
import { serial1900 } from "./sheet-fixtures.mjs";

const u16 = (n) => new Uint8Array([n & 255, (n >> 8) & 255]);
const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; };
const f64 = (x) => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x, true); return b; };
function cat(...parts) {
  let n = 0;
  parts.forEach((p) => { n += p.length; });
  const out = new Uint8Array(n);
  let at = 0;
  parts.forEach((p) => { out.set(p, at); at += p.length; });
  return out;
}
function rec(type, data) {
  return cat(u16(type), u16(data.length), data);
}
const latin = (s) => /^[\x00-\xff]*$/.test(s);
function chars(s) {
  if (latin(s)) return Uint8Array.from(s, (c) => c.charCodeAt(0));
  const b = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) { b[i * 2] = s.charCodeAt(i) & 255; b[i * 2 + 1] = s.charCodeAt(i) >> 8; }
  return b;
}
// XLUnicodeString: 16-bit count, flags (bit 0 = two-byte characters), chars.
const xlString = (s) => cat(u16(s.length), new Uint8Array([latin(s) ? 0 : 1]), chars(s));
// ShortXLUnicodeString, for sheet names: 8-bit count.
const shortString = (s) => cat(new Uint8Array([s.length, latin(s) ? 0 : 1]), chars(s));

// RK: an integer (bit 1 set) or the top 30 bits of a double, optionally x100.
function rkEncode(x) {
  const c = Math.round(x * 100);
  if (Number.isInteger(x) && Math.abs(x) < 0x1fffffff) return ((x << 2) | 2) >>> 0;
  if (Math.abs(c - x * 100) < 1e-9 && Math.abs(c) < 0x1fffffff) return ((c << 2) | 3) >>> 0;
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, x, true);
  return (b.getUint32(4, true) & 0xfffffffc) >>> 0;
}

function workbookStream(sheets, opts) {
  const strings = [], index = new Map();
  const sidx = (s) => { if (!index.has(s)) { index.set(s, strings.length); strings.push(s); } return index.get(s); };
  sheets.forEach((sh) => sh.rows.forEach((r) => r.forEach((c) => { if (typeof c === "string" && c !== "") sidx(c); })));

  const bodies = sheets.map((sh) => {
    const parts = [rec(0x0809, cat(u16(0x0600), u16(0x0010), new Uint8Array(12)))];
    sh.rows.forEach((row, r) => row.forEach((c, col) => {
      if (c === null || c === undefined || c === "") return;
      if (typeof c === "string") parts.push(rec(0x00fd, cat(u16(r), u16(col), u16(0), u32(sidx(c)))));
      else if (c.date) parts.push(rec(0x0203, cat(u16(r), u16(col), u16(1), f64(serial1900(c.date)))));
      else if (c.rk !== undefined) parts.push(rec(0x027e, cat(u16(r), u16(col), u16(0), u32(rkEncode(c.rk)))));
      else parts.push(rec(0x0203, cat(u16(r), u16(col), u16(0), f64(c.n))));
    }));
    parts.push(rec(0x000a, new Uint8Array(0)));
    return cat(...parts);
  });

  // The shared-string table, optionally cut in the middle of one string's
  // characters into a CONTINUE record - which then opens with a fresh flags
  // byte, exactly as Excel writes a long table.
  const strBytes = strings.map(xlString);
  let sst;
  const head = cat(u32(strings.length), u32(strings.length));
  if (opts.splitSst !== undefined && strings.length > opts.splitSst) {
    const k = opts.splitSst;
    const before = cat(head, ...strBytes.slice(0, k));
    const s = strings[k];
    const wide = !latin(s);
    const half = Math.floor(s.length / 2);
    const first = cat(u16(s.length), new Uint8Array([wide ? 1 : 0]), chars(s.slice(0, half)));
    const rest = cat(new Uint8Array([wide ? 1 : 0]), chars(s.slice(half)), ...strBytes.slice(k + 1));
    sst = cat(rec(0x00fc, cat(before, first)), rec(0x003c, rest));
  } else {
    sst = rec(0x00fc, cat(head, ...strBytes));
  }

  const bof = rec(0x0809, cat(u16(0x0600), u16(0x0005), new Uint8Array(12)));
  const pre = cat(
    bof,
    rec(0x0022, u16(0)),                                        // DATEMODE: 1900
    rec(0x041e, cat(u16(164), xlString("dd/mm/yyyy"))),        // FORMAT 164
    rec(0x00e0, cat(u16(0), u16(0), new Uint8Array(16))),      // XF 0: General
    rec(0x00e0, cat(u16(0), u16(164), new Uint8Array(16)))     // XF 1: the date format
  );
  const boundLen = (sh) => 4 + 6 + shortString(sh.name).length;
  const eof = rec(0x000a, new Uint8Array(0));
  let offset = pre.length + sheets.reduce((s, sh) => s + boundLen(sh), 0) + sst.length + eof.length;
  const bounds = sheets.map((sh, i) => {
    const b = rec(0x0085, cat(u32(offset), new Uint8Array([0, 0]), shortString(sh.name)));
    offset += bodies[i].length;
    return b;
  });
  return cat(pre, ...bounds, sst, eof, ...bodies);
}

const FREE = 0xffffffff, END = 0xfffffffe, FATSECT = 0xfffffffd;
function dirEntry(name, type, start, size) {
  const e = new Uint8Array(128);
  const v = new DataView(e.buffer);
  for (let i = 0; i < name.length; i++) v.setUint16(i * 2, name.charCodeAt(i), true);
  v.setUint16(0x40, (name.length + 1) * 2, true);
  e[0x42] = type;
  e[0x43] = 1;
  v.setUint32(0x44, FREE, true); v.setUint32(0x48, FREE, true); v.setUint32(0x4c, type === 5 ? 1 : FREE, true);
  v.setUint32(0x74, start >>> 0, true);
  v.setUint32(0x78, size, true);
  return e;
}
// The OLE2 container. A stream of 4096 bytes or more sits in ordinary
// sectors; a smaller one lives in the mini stream, which is the other path a
// reader has to get right. opts.mini forces the small one.
function oleWrap(stream, opts) {
  const ssz = 512;
  let data = stream;
  const mini = !!opts.mini;
  if (!mini && data.length < 4096) data = cat(data, new Uint8Array(4096 - data.length));
  if (mini && data.length >= 4096) throw new Error("mini fixture must stay under 4096 bytes");
  const secs = (n) => Math.ceil(n / ssz);
  const header = new Uint8Array(512);
  const hv = new DataView(header.buffer);
  header.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
  hv.setUint16(0x18, 0x3e, true); hv.setUint16(0x1a, 3, true); hv.setUint16(0x1c, 0xfffe, true);
  hv.setUint16(0x1e, 9, true); hv.setUint16(0x20, 6, true);
  hv.setUint32(0x2c, 1, true);        // one FAT sector
  hv.setUint32(0x30, 1, true);        // directory at sector 1
  hv.setUint32(0x38, 4096, true);
  hv.setUint32(0x44, END, true);
  for (let i = 0; i < 109; i++) hv.setUint32(0x4c + i * 4, i === 0 ? 0 : FREE, true);
  const fat = new Uint32Array(128).fill(FREE);
  fat[0] = FATSECT; fat[1] = END;
  let next = 2;
  function chainOf(n) {
    const start = next;
    for (let i = 0; i < n; i++) { fat[next] = i === n - 1 ? END : next + 1; next++; }
    return start;
  }
  let dir, body;
  if (!mini) {
    hv.setUint32(0x3c, END, true); hv.setUint32(0x40, 0, true);
    const start = chainOf(secs(data.length));
    dir = cat(dirEntry("Root Entry", 5, END, 0), dirEntry("Workbook", 2, start, data.length), new Uint8Array(256));
    body = cat(data, new Uint8Array(secs(data.length) * ssz - data.length));
  } else {
    const msz = 64, nMini = Math.ceil(data.length / msz);
    const mfat = new Uint32Array(128).fill(FREE);
    for (let i = 0; i < nMini; i++) mfat[i] = i === nMini - 1 ? END : i + 1;
    const mfatSec = chainOf(1);
    hv.setUint32(0x3c, mfatSec, true); hv.setUint32(0x40, 1, true);
    const container = cat(data, new Uint8Array(nMini * msz - data.length));
    const rootStart = chainOf(secs(container.length));
    dir = cat(dirEntry("Root Entry", 5, rootStart, container.length), dirEntry("Workbook", 2, 0, data.length), new Uint8Array(256));
    body = cat(new Uint8Array(mfat.buffer), container, new Uint8Array(secs(container.length) * ssz - container.length));
  }
  return cat(header, new Uint8Array(fat.buffer), dir, body);
}

export function xlsBuild(sheets, opts) {
  opts = opts || {};
  return oleWrap(workbookStream(sheets, opts), opts);
}

// Bank Hapoalim-style current account, as a genuine .xls: a title row, the
// titles, dates as real date cells, money as NUMBER and RK records.
export const XLS_BANK_ROWS = [
  ["תנועות בחשבון עו\"ש"],
  ["תאריך", "הפעולה", "פרטים", "אסמכתא", "חובה", "זכות", "יתרה"],
  [{ date: "2026-09-01" }, "משכורת", "אקמה בע\"מ", { n: 552210 }, null, { n: 14250 }, { n: 16310.4 }],
  [{ date: "2026-09-02" }, "כרטיס אשראי", "ישראכרט", { n: 552211 }, { rk: 3894.2 }, null, { n: 12416.2 }],
  [{ date: "2026-09-04" }, "העברה", "לדנה לוי", { n: 552212 }, { rk: 250 }, null, { n: 12166.2 }],
  [{ date: "2026-09-09" }, "עמלה", "עמלת פעולה", { n: 552213 }, { rk: 6.9 }, null, { n: 12159.3 }]
];
export function xlsBank(opts) {
  return xlsBuild([{ name: "תנועות", rows: XLS_BANK_ROWS }], opts);
}

// Not a workbook at all: an OLE container holding a Word document's stream.
export function oleNotWorkbook() {
  const data = new Uint8Array(4096);
  const w = oleWrap(data, {});
  // rename the stream "WordDocument"
  const at = 512 + 512 + 128;
  const name = "WordDocument";
  for (let i = 0; i < 32; i++) w[at + i] = 0;
  for (let i = 0; i < name.length; i++) { w[at + i * 2] = name.charCodeAt(i); w[at + i * 2 + 1] = 0; }
  w[at + 0x40] = (name.length + 1) * 2;
  return w;
}
