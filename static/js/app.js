document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const urlForm = document.getElementById("urlForm");
    const videoUrlInput = document.getElementById("videoUrl");
    const pasteBtn = document.getElementById("pasteBtn");
    const submitBtn = document.getElementById("submitBtn");
    const btnText = document.getElementById("btnText");

    const alertBox = document.getElementById("alertBox");
    const alertMsg = document.getElementById("alertMsg");

    const resultCard = document.getElementById("resultCard");
    const videoThumb = document.getElementById("videoThumb");
    const videoTitle = document.getElementById("videoTitle");
    const videoDuration = document.getElementById("videoDuration");
    const videoAuthor = document.getElementById("videoAuthor");
    const videoViews = document.getElementById("videoViews");

    const tabMp3 = document.getElementById("tabMp3");
    const tabMp4 = document.getElementById("tabMp4");
    const mp3Section = document.getElementById("mp3Section");
    const mp4Section = document.getElementById("mp4Section");
    const resolutionList = document.getElementById("resolutionList");
    const startConvertBtn = document.getElementById("startConvertBtn");

    const progressCard = document.getElementById("progressCard");
    const progressBar = document.getElementById("progressBar");
    const progressPercent = document.getElementById("progressPercent");
    const progressMessage = document.getElementById("progressMessage");
    const progressSpeed = document.getElementById("progressSpeed");
    const progressEta = document.getElementById("progressEta");

    const downloadReadyCard = document.getElementById("downloadReadyCard");
    const downloadFileInfo = document.getElementById("downloadFileInfo");
    const downloadActionBtn = document.getElementById("downloadActionBtn");

    // State
    let currentVideoData = null;
    let selectedFormat = "mp3"; // 'mp3' or 'mp4'
    let selectedQuality = "320"; // default for mp3
    let pollInterval = null;

    // Clipboard Paste Helper
    pasteBtn.addEventListener("click", async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                videoUrlInput.value = text.trim();
                videoUrlInput.focus();
            }
        } catch (err) {
            showAlert("Izin clipboard ditolak. Silakan tempel tautan secara manual (Ctrl+V).", "info");
        }
    });

    // Alert Helper
    function showAlert(message, type = "error") {
        alertBox.classList.remove("hidden", "bg-rose-950/40", "border-rose-500/40", "text-rose-200", "bg-blue-950/40", "border-blue-500/40", "text-blue-200");
        if (type === "error") {
            alertBox.classList.add("bg-rose-950/40", "border", "border-rose-500/40", "text-rose-200");
        } else {
            alertBox.classList.add("bg-blue-950/40", "border", "border-blue-500/40", "text-blue-200");
        }
        alertMsg.textContent = message;
        if (window.lucide) lucide.createIcons();
    }

    function hideAlert() {
        alertBox.classList.add("hidden");
    }

    // Format Switching Tabs
    tabMp3.addEventListener("click", () => {
        selectedFormat = "mp3";
        tabMp3.classList.add("active");
        tabMp3.classList.remove("text-slate-400");
        tabMp4.classList.remove("active");
        tabMp4.classList.add("text-slate-400");
        
        mp3Section.classList.remove("hidden");
        mp4Section.classList.add("hidden");

        const activeMp3Radio = document.querySelector('input[name="audioQuality"]:checked');
        if (activeMp3Radio) selectedQuality = activeMp3Radio.value;
    });

    tabMp4.addEventListener("click", () => {
        selectedFormat = "mp4";
        tabMp4.classList.add("active");
        tabMp4.classList.remove("text-slate-400");
        tabMp3.classList.remove("active");
        tabMp3.classList.add("text-slate-400");

        mp4Section.classList.remove("hidden");
        mp3Section.classList.add("hidden");

        const activeMp4Radio = document.querySelector('input[name="videoResolution"]:checked');
        if (activeMp4Radio) selectedQuality = activeMp4Radio.value;
    });

    // Audio Quality Card Selection
    document.querySelectorAll('#mp3Section .quality-card').forEach(card => {
        card.addEventListener("click", () => {
            document.querySelectorAll('#mp3Section .quality-card').forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                selectedQuality = radio.value;
            }
        });
    });

    // Form Submit: Fetch Video Metadata
    urlForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();
        resultCard.classList.add("hidden");
        progressCard.classList.add("hidden");
        downloadReadyCard.classList.add("hidden");

        const url = videoUrlInput.value.trim();
        if (!url) return;

        // Loading state
        submitBtn.disabled = true;
        btnText.textContent = "Menganalisis...";

        try {
            const res = await fetch("/api/info", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.detail || "Gagal mengambil metadata video.");
            }

            renderVideoInfo(data.data);
        } catch (err) {
            showAlert(err.message || "Terjadi kesalahan saat memproses link YouTube.", "error");
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = "Analisis Link";
        }
    });

    // Render Video Info
    function renderVideoInfo(info) {
        currentVideoData = info;
        videoThumb.src = info.thumbnail;
        videoTitle.textContent = info.title;
        videoDuration.textContent = info.duration;
        videoAuthor.innerHTML = `<i data-lucide="user" class="w-3.5 h-3.5"></i> ${info.uploader}`;
        videoViews.innerHTML = `<i data-lucide="eye" class="w-3.5 h-3.5"></i> ${info.view_count} views`;

        // Render MP4 Resolution Options
        resolutionList.innerHTML = "";
        const resolutions = info.available_resolutions && info.available_resolutions.length > 0 
            ? info.available_resolutions 
            : [360, 720, 1080];

        // Pick highest or 1080/720 default
        let defaultRes = resolutions.includes(1080) ? 1080 : resolutions[resolutions.length - 1];

        resolutions.forEach((res, idx) => {
            const isChecked = res === defaultRes;
            const label = document.createElement("label");
            label.className = `quality-card ${isChecked ? 'active' : ''} flex flex-col p-3 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 cursor-pointer text-center transition-all`;
            label.innerHTML = `
                <input type="radio" name="videoResolution" value="${res}" ${isChecked ? 'checked' : ''} class="hidden">
                <span class="text-sm font-bold ${isChecked ? 'text-rose-400' : 'text-slate-200'}">${res}p</span>
                <span class="text-[11px] text-slate-400 mt-0.5">${res >= 720 ? 'HD' : 'SD'}</span>
            `;

            label.addEventListener("click", () => {
                document.querySelectorAll('#resolutionList .quality-card').forEach(c => c.classList.remove("active"));
                label.classList.add("active");
                const radio = label.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    selectedQuality = String(res);
                }
            });

            resolutionList.appendChild(label);
        });

        // Set initial selected quality for MP4 if tab is switched
        if (selectedFormat === "mp4") {
            selectedQuality = String(defaultRes);
        }

        resultCard.classList.remove("hidden");
        if (window.lucide) lucide.createIcons();
    }

    // Start Conversion
    startConvertBtn.addEventListener("click", async () => {
        if (!currentVideoData) return;

        hideAlert();
        progressCard.classList.remove("hidden");
        downloadReadyCard.classList.add("hidden");
        startConvertBtn.disabled = true;

        // Reset progress UI
        progressBar.style.width = "0%";
        progressPercent.textContent = "0%";
        progressMessage.textContent = "Menghubungi engine konversi...";
        progressSpeed.innerHTML = `<i data-lucide="activity" class="w-3.5 h-3.5"></i> Kecepatan: Menghitung...`;
        progressEta.innerHTML = `<i data-lucide="clock" class="w-3.5 h-3.5"></i> Perkiraan: -`;
        if (window.lucide) lucide.createIcons();

        try {
            const res = await fetch("/api/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: currentVideoData.url,
                    format: selectedFormat,
                    quality: selectedQuality
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.detail || "Gagal memulai tugas konversi.");
            }

            // Start polling progress
            trackTask(data.task_id);
        } catch (err) {
            showAlert(err.message || "Gagal memulai konversi.", "error");
            progressCard.classList.add("hidden");
            startConvertBtn.disabled = false;
        }
    });

    // Polling task status
    function trackTask(taskId) {
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/status/${taskId}`);
                if (!res.ok) {
                    throw new Error("Gagal memeriksa status tugas.");
                }
                const task = await res.json();

                // Update UI
                const pct = task.progress || 0;
                progressBar.style.width = `${pct}%`;
                progressPercent.textContent = `${pct}%`;
                if (task.message) progressMessage.textContent = task.message;
                if (task.speed) progressSpeed.innerHTML = `<i data-lucide="activity" class="w-3.5 h-3.5"></i> Kecepatan: ${task.speed}`;
                if (task.eta) progressEta.innerHTML = `<i data-lucide="clock" class="w-3.5 h-3.5"></i> Perkiraan: ${task.eta}`;
                if (window.lucide) lucide.createIcons();

                if (task.status === "completed") {
                    clearInterval(pollInterval);
                    progressCard.classList.add("hidden");
                    startConvertBtn.disabled = false;

                    // Show ready download card
                    downloadFileInfo.textContent = `${task.filename} (${task.formatted_size || ''})`;
                    downloadActionBtn.href = `/api/download/${taskId}`;
                    downloadReadyCard.classList.remove("hidden");
                } else if (task.status === "error") {
                    clearInterval(pollInterval);
                    progressCard.classList.add("hidden");
                    startConvertBtn.disabled = false;
                    showAlert(task.error || "Proses konversi gagal.", "error");
                }
            } catch (err) {
                clearInterval(pollInterval);
                progressCard.classList.add("hidden");
                startConvertBtn.disabled = false;
                showAlert(err.message, "error");
            }
        }, 800);
    }
});
