// --- STATE ---
let fileCounter = 50;
let fileEnd = 104;
let schedulerInterval = null;
let countdownInterval = null;
let nextFetchTime = null;
let isRunning = false;

// --- CORS PROXY OPTIONS ---
// If the target API blocks browser requests, route through a proxy
const CORS_PROXIES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
];

// --- LOGGING ---
function log(message, type = "info") {
    const container = document.getElementById("logContainer");
    const entry = document.createElement("div");
    const now = new Date().toLocaleTimeString();

    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-timestamp">[$${now}]</span> $${message}`;

    container
