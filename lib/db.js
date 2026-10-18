// Tiny JSON-file database. Good enough for a single clinic and needs no setup.
// Writes are atomic (write to temp file, then rename) and debounced.

const fs = require('fs');
const path = require('path');
const seed = require('./seed');

class DB {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Fill in keys added in newer versions without touching existing content.
      const defaults = seed();
      for (const key of Object.keys(defaults)) {
        if (this.data[key] === undefined) this.data[key] = defaults[key];
      }
      for (const key of Object.keys(defaults.settings)) {
        if (this.data.settings[key] === undefined) this.data.settings[key] = defaults.settings[key];
      }
    } else {
      this.data = seed();
      this.flush();
    }
    this.timer = null;
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 150);
  }

  flush() {
    clearTimeout(this.timer);
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}

module.exports = DB;
