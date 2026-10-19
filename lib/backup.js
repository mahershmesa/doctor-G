// Backups as standard .tar.gz files (open with 7-Zip, WinRAR, or `tar -xzf` on Mac/Linux).
// - Daily automatic backup: database + private files (receipts, chat images). Kept for KEEP_DAYS.
// - Full backup on demand: the same plus all uploaded photos and videos.
// No dependencies: a tiny tar writer + Node's built-in gzip.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

function tarHeader(name, size, mtime) {
  const h = Buffer.alloc(512, 0);
  const put = (str, off, len) => h.write(str, off, len, 'utf8');
  const oct = (num, len) => num.toString(8).padStart(len - 1, '0') + '\0';
  put(name, 0, 100);
  put(oct(0o644, 8), 100, 8);
  put(oct(0, 8), 108, 8);
  put(oct(0, 8), 116, 8);
  put(oct(size, 12), 124, 12);
  put(oct(Math.floor(mtime / 1000), 12), 136, 12);
  h.fill(' ', 148, 156); // checksum placeholder
  put('0', 156, 1);
  put('ustar\0', 257, 6);
  put('00', 263, 2);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return h;
}

// entries: [{ name: 'data/db.json', file: '/abs/path' } | { name, buffer }]
async function* tarStream(entries) {
  for (const e of entries) {
    let size, mtime;
    if (e.buffer) {
      size = e.buffer.length;
      mtime = Date.now();
    } else {
      let st;
      try {
        st = fs.statSync(e.file);
      } catch {
        continue; // file vanished meanwhile
      }
      if (!st.isFile()) continue;
      size = st.size;
      mtime = st.mtimeMs;
    }
    yield tarHeader(e.name, size, mtime);
    if (e.buffer) yield e.buffer;
    else {
      let read = 0;
      for await (const chunk of fs.createReadStream(e.file, { end: size - 1 })) {
        read += chunk.length;
        yield chunk;
      }
      if (read < size) yield Buffer.alloc(size - read); // file shrank: keep tar valid
    }
    const pad = (512 - (size % 512)) % 512;
    if (pad) yield Buffer.alloc(pad);
  }
  yield Buffer.alloc(1024);
}

const listFiles = (dir, prefix) => {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => !f.startsWith('.'))
      .map((f) => ({ name: `${prefix}/${f}`, file: path.join(dir, f) }));
  } catch {
    return [];
  }
};

function createBackupService({ db, dataDir, uploadDir, privateDir, backupDir, keepDays = 14, log = console }) {
  fs.mkdirSync(backupDir, { recursive: true });

  const entries = (full) => {
    db.flush();
    const list = [
      { name: 'data/db.json', buffer: fs.readFileSync(path.join(dataDir, 'db.json')) },
      ...listFiles(privateDir, 'data/private'),
    ];
    if (full) list.push(...listFiles(uploadDir, 'uploads'));
    return list;
  };

  const stream = (full) => Readable.from(tarStream(entries(full))).pipe(zlib.createGzip());

  const list = () =>
    fs
      .readdirSync(backupDir)
      .filter((f) => /^backup-\d{4}-\d{2}-\d{2}\.tar\.gz$/.test(f))
      .sort()
      .reverse()
      .map((f) => ({ name: f, size: fs.statSync(path.join(backupDir, f)).size, date: f.slice(7, 17) }));

  const today = () => new Date().toISOString().slice(0, 10);

  async function runDaily(force = false) {
    const name = `backup-${today()}.tar.gz`;
    const target = path.join(backupDir, name);
    if (!force && fs.existsSync(target)) return null;
    const tmp = target + '.tmp';
    await pipeline(stream(false), fs.createWriteStream(tmp, { mode: 0o600 }));
    fs.renameSync(tmp, target);
    // Remove backups older than keepDays.
    for (const b of list().slice(keepDays)) fs.unlink(path.join(backupDir, b.name), () => {});
    log.log?.(`Backup saved: ${name}`);
    return name;
  }

  let timer = null;
  function start() {
    const tick = () => runDaily().catch((e) => log.error?.('Backup failed:', e.message));
    tick();
    timer = setInterval(tick, 60 * 60 * 1000); // check hourly, writes once per day
    timer.unref();
  }

  const fileFor = (name) => (/^backup-\d{4}-\d{2}-\d{2}\.tar\.gz$/.test(name) ? path.join(backupDir, name) : null);

  return { start, runDaily, list, stream, fileFor, stop: () => clearInterval(timer) };
}

module.exports = { createBackupService, tarStream };
