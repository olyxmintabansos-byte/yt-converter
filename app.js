document.addEventListener("DOMContentLoaded", () => {
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
    const videoAuthor = document.getElementById("videoAuthor");

    const tabMp3 = document.getElementById("tabMp3");
    const tabMp4 = document.getElementById("tabMp4");
    const mp3Section = document.getElementById("mp3Section");
    const mp4Section = document.getElementById("mp4Section");
    const startConvertBtn = document.getElementById("startConvertBtn");

    const progressCard = document.getElementById("progressCard");
    const progressBar = document.getElementById("progressBar");
    const progressPercent = document.getElementById("progressPercent");
    const progressMessage = document.getElementById("progressMessage");
    const downloadReadyCard = document.getElementById("downloadReadyCard");

    let currentTitle = "Me at the zoo";

    pasteBtn.addEventListener("click", async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) videoUrlInput.value = text.trim();
        } catch (e) {}
    });

    tabMp3.addEventListener("click", () => {
        tabMp3.classList.add("active");
        tabMp3.classList.remove("text-slate-400");
        tabMp4.classList.remove("active");
        tabMp4.classList.add("text-slate-400");
        mp3Section.classList.remove("hidden");
        mp4Section.classList.add("hidden");
    });

    tabMp4.addEventListener("click", () => {
        tabMp4.classList.add("active");
        tabMp4.classList.remove("text-slate-400");
        tabMp3.classList.remove("active");
        tabMp3.classList.add("text-slate-400");
        mp4Section.classList.remove("hidden");
        mp3Section.classList.add("hidden");
    });

    document.querySelectorAll('.quality-card').forEach(card => {
        card.addEventListener("click", () => {
            const parent = card.parentElement;
            parent.querySelectorAll('.quality-card').forEach(c => c.classList.remove("active"));
            card.classList.add("active");
        });
    });

    // Form Submit
    urlForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const url = videoUrlInput.value.trim();
        if (!url) return;

        submitBtn.disabled = true;
        btnText.textContent = "Mengambil Info...";

        try {
            // Using public CORS-friendly oEmbed
            const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (data.title) {
                currentTitle = data.title;
                videoTitle.textContent = data.title;
                videoThumb.src = data.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
                videoAuthor.innerHTML = `<i data-lucide="user" class="w-3.5 h-3.5"></i> ${data.author_name || 'YouTube Creator'}`;
                resultCard.classList.remove("hidden");
                progressCard.classList.add("hidden");
                downloadReadyCard.classList.add("hidden");
                if (window.lucide) lucide.createIcons();
            } else {
                throw new Error("Tautan video tidak valid atau video bersifat privat.");
            }
        } catch (err) {
            alert(err.message || "Gagal mengambil data video.");
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = "Analisis Link";
        }
    });

    // Start Simulation
    startConvertBtn.addEventListener("click", () => {
        progressCard.classList.remove("hidden");
        downloadReadyCard.classList.add("hidden");
        startConvertBtn.disabled = true;

        let progress = 0;
        progressBar.style.width = "0%";
        progressPercent.textContent = "0%";
        progressMessage.textContent = "Mengunduh stream video...";

        const interval = setInterval(() => {
            progress += 10;
            if (progress === 40) {
                progressMessage.textContent = "Mengekstrak audio stream...";
            } else if (progress === 70) {
                progressMessage.textContent = "FFmpeg meng-encode ke format tujuan...";
            } else if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                progressCard.classList.add("hidden");
                startConvertBtn.disabled = false;
                downloadReadyCard.classList.remove("hidden");
                if (window.lucide) lucide.createIcons();
            }
            progressBar.style.width = `${progress}%`;
            progressPercent.textContent = `${progress}%`;
        }, 300);
    });

    // Trigger initial load for demonstration
    urlForm.dispatchEvent(new Event("submit"));
});
