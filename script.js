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
    entry.innerHTML = `<span class="log-timestamp">[${now}]</span> ${message}`;
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

    progressEl.textContent = `${done} / ${total}`;
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
        nextFetchEl.textContent = `${mins}m ${secs}s`;
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
        return null;
    }
    if (!token) {
        log("❌ Bearer Token is required.", "error");
        return null;
    }
    if (isNaN(start) || isNaN(end) || start > end) {
        log("❌ Invalid file range.", "error");
        return null;
    }
    if (isNaN(interval) || interval < 1) {
        log("❌ Interval must be at least 1 minute.", "error");
        return null;
    }

    return { apiUrl, token, start, end, interval, useCors };
}

// =============================================
//  DOWNLOAD HELPER
// =============================================
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =============================================
//  CORE FETCH FUNCTION
// =============================================
async function fetchAndSave() {
    const config = getConfig();
    if (!config) return;

    if (fileCounter > fileEnd) {
        log("✅ All files have been downloaded! Stopping scraper.", "success");
        stopScraper();
        return;
    }

    const filename = `${fileCounter}.xlsx`;
    log(`📥 Fetching data → saving as ${filename} ...`, "info");
    currentFileEl.textContent = filename;
    nextFetchEl.textContent = "Fetching...";

    try {
        let url = config.apiUrl;
        if (config.useCors) {
            url = CORS_PROXY + encodeURIComponent(config.apiUrl);
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${config.token}`,
                "Accept": "*/*"
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                log("🔒 Error 401: Unauthorized. Your token has expired. Paste a new one!", "error");
            } else {
                log(`❌ HTTP Error ${response.status}: ${response.statusText}`, "error");
            }
            return;
        }

        // Get the response as raw bytes
        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
            log("⚠️ Empty response received.", "warning");
            return;
        }

        // Read the Excel data
        const data = new Uint8Array(arrayBuffer);
        let workbook;

        try {
            workbook = XLSX.read(data, { type: "array" });
        } catch (e) {
            log("⚠️ Response is not valid Excel. Saving raw data instead.", "warning");
            // Save raw response as-is
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            downloadBlob(blob, filename);
            fileCounter++;
            updateProgress();
            log(`✅ Saved raw response as ${filename}`, "success");
            return;
        }

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON to add timestamp column
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Add timestamp to each row
        const timestamp = new Date().toLocaleString();
        jsonData.forEach(row => {
            row["Scraped_Timestamp"] = timestamp;
        });

        // Convert back to sheet
        const newSheet = XLSX.utils.json_to_sheet(jsonData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);

        // Generate file and download
        const excelBuffer = XLSX.write(newWorkbook, {
            bookType: "xlsx",
            type: "array"
        });

        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        downloadBlob(blob, filename);

        const total = fileEnd - fileStart + 1;
        const done = fileCounter - fileStart + 1;
        log(`✅ Success! Saved ${filename} (${done}/${total}) — ${jsonData.length} rows`, "success");

        fileCounter++;
        updateProgress();

    } catch (error) {
        if (error.name === "TypeError" && error.message.includes("fetch")) {
            log("❌ Network error. The API may be blocking browser requests. Try enabling CORS Proxy.", "error");
        } else {
            log(`❌ Unexpected error: ${error.message}`, "error");
        }
        console.error("Fetch error:", error);
    }
}

// =============================================
//  SCHEDULER
// =============================================
async function scheduledFetch() {
    await fetchAndSave();

    // Schedule next if still running and files remain
    if (isRunning && fileCounter <= fileEnd) {
        const config = getConfig();
        if (config) {
            startCountdown(config.interval);
            schedulerTimer = setTimeout(scheduledFetch, config.interval * 60 * 1000);
            log(`⏰ Next fetch in ${config.interval} minute(s).`, "info");
        }
    }
}

function startScraper() {
    const config = getConfig();
    if (!config) return;

    // Set state from config
    fileStart = config.start;
    fileEnd = config.end;
    fileCounter = config.start;
    isRunning = true;

    // Update UI
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = "🟢 Running";
    updateProgress();

    log("🚀 Scraper started!", "success");
    log(`📁 Files: ${config.start}.xlsx → ${config.end}.xlsx`, "info");
    log(`⏱️ Interval: every ${config.interval} minute(s)`, "info");
    log(`🌐 CORS Proxy: ${config.useCors ? "Enabled" : "Disabled"}`, "info");

    // Run first fetch immediately then schedule the rest
    scheduledFetch();
}

function stopScraper() {
    isRunning = false;

    if (schedulerTimer) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
    }
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    // Update UI
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusText.textContent = "⏸️ Stopped";
    nextFetchEl.textContent = "—";

    log("⏹️ Scraper stopped.", "warning");
}

// =============================================
//  INIT
// =============================================
updateProgress();
log("👋 Welcome! Paste your API URL and token, then click Start.", "info");
