const fs = require("node:fs");
const path = require("node:path");

function acquireProcessLock(lockPath, label) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  if (fs.existsSync(lockPath)) {
    throw new Error(`Lock exists: ${lockPath}`);
  }

  const payload = {
    pid: process.pid,
    started_at: new Date().toISOString(),
    label,
  };

  const fd = fs.openSync(lockPath, "wx");
  let released = false;

  try {
    fs.writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } finally {
    fs.closeSync(fd);
  }

  const release = () => {
    if (released) {
      return;
    }
    released = true;
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  };

  return release;
}

module.exports = {
  acquireProcessLock,
};
