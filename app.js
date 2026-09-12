// ============================================================
// POOTUBE
// Custom YouTube frontend that looks like shit on a windshield
// ============================================================

// Piped public API instances.
// These are taken from Piped's current public-instance list.
// The app will automatically try them in order.
const PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.leptons.xyz",
    "https://pipedapi.nosebs.ru",
    "https://pipedapi-libre.kavin.rocks",
    "https://piped-api.privacy.com.de",
    "https://pipedapi.adminforge.de",
    "https://api.piped.yt",
    "https://pipedapi.drgns.space",
    "https://pipedapi.owo.si",
    "https://pipedapi.ducks.party",
    "https://piped-api.codespace.cz",
    "https://pipedapi.reallyaweso.me",
    "https://api.piped.private.coffee",
    "https://pipedapi.darkness.services",
    "https://pipedapi.orangenet.cc"
];

// The currently working instance.
let ACTIVE_API = null;

// ============================================================
// DOM
// ============================================================

const videos = document.getElementById("videos");
const status = document.getElementById("status");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const playerModal = document.getElementById("playerModal");
const player = document.getElementById("player");
const playerTitle = document.getElementById("playerTitle");
const playerUploader = document.getElementById("playerUploader");

// ============================================================
// API
// ============================================================

async function api(endpoint) {

    // If we already found an instance, use it first.
    const instances = ACTIVE_API
        ? [ACTIVE_API, ...PIPED_INSTANCES.filter(x => x !== ACTIVE_API)]
        : [...PIPED_INSTANCES];

    let lastError = null;

    for (const instance of instances) {

        try {

            console.log("💩 Trying Piped instance:", instance);

            const response = await fetch(instance + endpoint, {
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(
                    `${instance} returned HTTP ${response.status}`
                );
            }

            const data = await response.json();

            // Success!
            ACTIVE_API = instance;

            console.log("✅ Pootube connected to:", ACTIVE_API);

            return data;

        } catch (error) {

            console.warn(
                "💀 Piped instance failed:",
                instance,
                error
            );

            lastError = error;
        }
    }

    throw new Error(
        "Every Piped instance failed. Last error: " +
        (lastError?.message || "Unknown error")
    );
}

// ============================================================
// HELPERS
// ============================================================

function getVideoId(url) {

    if (!url) return null;

    try {

        const parsed = new URL(
            url,
            "https://piped.video"
        );

        return parsed.searchParams.get("v");

    } catch {

        return null;
    }
}


function escapeHTML(value = "") {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatViews(views) {

    if (!views) return "No views";

    if (views >= 1000000000)
        return (views / 1000000000).toFixed(1) + "B views";

    if (views >= 1000000)
        return (views / 1000000).toFixed(1) + "M views";

    if (views >= 1000)
        return (views / 1000).toFixed(1) + "K views";

    return views + " views";
}

// ============================================================
// VIDEO GRID
// ============================================================

function renderVideos(results) {

    videos.innerHTML = "";

    status.classList.add("hidden");

    if (!Array.isArray(results) || results.length === 0) {

        status.textContent =
            "💩 Nothing came out of the pipe.";

        status.classList.remove("hidden");

        return;
    }

    for (const video of results) {

        const id = getVideoId(video.url);

        if (!id) continue;

        const card = document.createElement("article");

        card.className = "video-card";

        card.innerHTML = `
            <img
                class="thumbnail"
                src="${escapeHTML(video.thumbnail || "")}"
                alt=""
                loading="lazy"
            >

            <div class="video-info">

                <div class="video-title">
                    ${escapeHTML(video.title || "Untitled Crap")}
                </div>

                <div class="video-meta">

                    ${escapeHTML(
                        video.uploader || "Unknown creator"
                    )}

                    <br>

                    ${formatViews(video.views)}

                    ${
                        video.uploadedDate
                            ? " • " + escapeHTML(video.uploadedDate)
                            : ""
                    }

                </div>

            </div>
        `;

        card.addEventListener(
            "click",
            () => openVideo(id, video)
        );

        videos.appendChild(card);
    }
}

// ============================================================
// TRENDING
// ============================================================

async function loadTrending() {

    document.getElementById("pageTitle").textContent =
        "Trending";

    document.getElementById("pageSubtitle").textContent =
        "Today's hottest crap.";

    showLoading(
        "🔥 Finding today's hottest crap..."
    );

    try {

        const data = await api(
            "/trending?region=US"
        );

        renderVideos(data);

    } catch (error) {

        showError(error);
    }
}

// ============================================================
// SEARCH
// ============================================================

searchForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const query =
            searchInput.value.trim();

        if (!query) return;

        document.getElementById("pageTitle").textContent =
            `Search: ${query}`;

        document.getElementById("pageSubtitle").textContent =
            "Searching the sewer...";

        showLoading(
            "💩 Searching the sewer..."
        );

        try {

            const data = await api(
                `/search?q=${encodeURIComponent(query)}&filter=videos`
            );

            renderVideos(data);

        } catch (error) {

            showError(error);
        }
    }
);

// ============================================================
// HOME
// ============================================================

function loadHome() {

    loadTrending();
}

// ============================================================
// VIDEO PLAYER
// ============================================================

async function openVideo(id, info = {}) {

    playerModal.classList.remove("hidden");

    playerTitle.textContent =
        info.title || "Loading video...";

    playerUploader.textContent =
        info.uploader || "Pootube";

    player.removeAttribute("src");

    player.load();

    try {

        console.log(
            "🎬 Getting stream information for:",
            id
        );

        const data =
            await api(`/streams/${id}`);

        const streams =
            (data.videoStreams || [])

                // We want streams containing BOTH
                // video and audio.
                .filter(stream =>
                    stream.videoOnly === false &&
                    stream.mimeType === "video/mp4"
                )

                // Highest resolution first.
                .sort(
                    (a, b) =>
                        (b.height || 0) -
                        (a.height || 0)
                );

        if (!streams.length) {

            throw new Error(
                "No compatible MP4 stream was returned."
            );
        }

        // Prefer 1080p or lower.
        const stream =
            streams.find(
                stream =>
                    (stream.height || 0) <= 1080
            ) || streams[0];

        console.log(
            "📺 Selected stream:",
            stream
        );

        player.src = stream.url;

        player.load();

        player.play().catch(() => {});

    } catch (error) {

        console.error(error);

        playerTitle.textContent =
            "💀 Pootube couldn't load this video.";

        playerUploader.textContent =
            error.message;
    }
}

// ============================================================
// CLOSE PLAYER
// ============================================================

function closePlayer() {

    player.pause();

    player.removeAttribute("src");

    player.load();

    playerModal.classList.add("hidden");
}

// ============================================================
// RANDOM CRAP
// ============================================================

async function randomVideo() {

    try {

        const data =
            await api("/trending?region=US");

        if (!data.length) return;

        const video =
            data[
                Math.floor(
                    Math.random() * data.length
                )
            ];

        const id =
            getVideoId(video.url);

        if (id) {

            openVideo(id, video);
        }

    } catch (error) {

        showError(error);
    }
}

// ============================================================
// UI STATUS
// ============================================================

function showLoading(message) {

    videos.innerHTML = "";

    status.textContent = message;

    status.classList.remove("hidden");
}


function showError(error) {

    console.error(error);

    videos.innerHTML = "";

    status.innerHTML = `
        <strong>
            💀 Pootube fell into the sewer.
        </strong>

        <br><br>

        ${escapeHTML(error.message)}

        <br><br>

        <button onclick="loadHome()">
            🔄 Try Again
        </button>
    `;

    status.classList.remove("hidden");
}


function showMessage(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.remove("hidden");

    setTimeout(
        () => toast.classList.add("hidden"),
        2500
    );
}

// ============================================================
// KEYBOARD
// ============================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            !playerModal.classList.contains("hidden")
        ) {

            closePlayer();
        }
    }
);

// ============================================================
// START POOTUBE
// ============================================================

loadHome();
