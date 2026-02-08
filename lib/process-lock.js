const fs = require("node:fs");
const path = require("node:path");

function acquireProcessLock(lockPath, label) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  if (fs.existsSync(lockPath)) {
    const raw = fs.readFileSync(lockPath, "utf8");
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(`Lock exists (invalid JSON): ${lockPath}`);
    }

    const pid = payload?.pid;
    if (!Number.isInteger(pid) || !Number.isFinite(pid)) {
      throw new Error(`Lock exists (missing pid): ${lockPath}`);
    }

    try {
      process.kill(pid, 0);
      throw new Error(`Lock exists (pid running): ${lockPath}`);
    } catch (error) {
      if (error?.code === "ESRCH") {
        fs.unlinkSync(lockPath);
      } else if (error?.code === "EPERM") {
        throw new Error(`Lock exists (pid not accessible): ${lockPath}`);
      } else if (error?.message?.includes("pid running")) {
        throw error;
      } else {
        throw error;
      }
    }
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
