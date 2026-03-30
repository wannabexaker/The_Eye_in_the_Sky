const net = require("net");

const HOST = "127.0.0.1";
const PORTS = [3000, 3001];
const TIMEOUT_MS = 350;

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (value) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(value);
      }
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, HOST);
  });
}

async function main() {
  const openPorts = [];

  for (const port of PORTS) {
    // Sequential checks keep output deterministic and easy to read.
    const open = await isPortOpen(port);
    if (open) {
      openPorts.push(port);
    }
  }

  if (openPorts.length > 0) {
    console.error(
      "\nBuild blocked: detected active local dev server port(s): " +
        openPorts.join(", ") +
        "\nStop dev first (Ctrl+C) and retry build to avoid .next cache corruption.\n"
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Build guard failed:", err);
  process.exit(1);
});
