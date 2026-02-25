// =============================================
//  STATE
// =============================================
let fileCounter = 50;
let fileStart = 50;
let fileEnd = 104;
let schedulerTimer = null;
let countdownTimer = null;
let nextFetchTime = null;
let isRunning = false;

const CORS_PROXY = "https://corsproxy.io/?";

// =============================================
//  DOM REFERENCES
// =============================================
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");

const statusText = document.getElementById("statusText");
const currentFileEl = document.getElementById("currentFile");
const progressEl = document.getElementById("progress");
const nextFetchEl = document.getElementById("nextFetch");
const progressBar = document.getElementById("progressBar");
const logContainer = document.getElementById("logContainer");

// =============================================
//  EVENT LISTENERS
// =============================================
startBtn.addEventListener("click", startScraper);
stopBtn.addEventListener("click", stopScraper);
clearBtn.addEventListener("click", clearLog);

// =============================================
//  LOGGING
// =============================================
function log(message, type = "info") {
    const entry = document.createElement("div");
    const now = new Date().toLocaleTimeString();
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-timestamp">[$${now}]</span> $${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLog() {
    logContainer.innerHTML = "";
    log("Log cleared.", "info");
}

// =============================================
//  UI UPDATES
// =============================================
function updateProgress() {
    const total = fileEnd - fileStart + 1;
    const done = fileCounter - fileStart;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    progressEl.textContent = `$${done} / $${total}`;
    progressBar.style.width = `${percent}%`;
    currentFileEl.textContent = fileCounter <= fileEnd ? `${fileCounter}.xlsx` : "Done";
}

function startCountdown(minutes) {
    nextFetchTime = Date.now() + minutes * 60 * 1000;

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        const remaining = nextFetchTime - Date.now();
        if (remaining <= 0) {
            nextFetchEl.textContent = "Fetching...";
            clearInterval(countdownTimer);
            return;
        }
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        nextFetchEl.textContent = `$${mins}m $${secs}s`;
    }, 1000);
}

// =============================================
//  VALIDATION
// =============================================
function getConfig() {
    const apiUrl = document.getElementById("apiUrl").value.trim();
    const token = document.getElementById("bearerToken").value.trim();
    const start = parseInt(document.getElementById("fileStart").value);
    const end = parseInt(document.getElementById("fileEnd").value);
    const interval = parseInt(document.getElementById("interval").value);
    const useCors = document.getElementById("useCorsProxy").checked;

    if (!apiUrl) {
        log("❌ API URL is required.", "error");
        return null
