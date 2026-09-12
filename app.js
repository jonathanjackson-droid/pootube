// ============================================================
// POOTUBE 💩
// Invidious Edition
// ============================================================

const INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://yewtu.be",
    "https://invidious.nerdvpn.de",
    "https://invidious.private.coffee",
    "https://inv.tux.pizza",
    "https://invidious.nerdvpn.de"
];

let ACTIVE_INSTANCE = null;


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
// INVIDIOUS API
// ============================================================

async function api(endpoint) {

    const instances = ACTIVE_INSTANCE
        ? [
            ACTIVE_INSTANCE,
            ...INVIDIOUS_INSTANCES.filter(
                instance => instance !== ACTIVE_INSTANCE
            )
        ]
        : [...INVIDIOUS_INSTANCES];

    let lastError = null;

    for (const instance of instances) {

        try {

            console.log(
                "💩 Trying Invidious:",
                instance
            );

            const response = await fetch(
                instance + endpoint,
                {
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            if (!response.ok) {

                throw new Error(
                    `${instance} returned HTTP ${response.status}`
                );
            }

            const data = await response.json();

            ACTIVE_INSTANCE = instance;

            console.log(
                "✅ Pootube connected to:",
                ACTIVE_INSTANCE
            );

            return data;

        } catch (error) {

            console.warn(
                "💀 Invidious instance failed:",
                instance,
                error
            );

            lastError = error;
        }
    }

    throw new Error(
        "Every Invidious instance failed. " +
        "Last error: " +
        (lastError?.message || "Unknown error")
    );
}


// ============================================================
// HELPERS
// ============================================================

function escapeHTML(value = "") {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatViews(views) {

    if (!views) {
        return "No views";
    }

    if (views >= 1000000000) {
        return (
            (views / 1000000000).toFixed(1) +
            "B views"
        );
    }

    if (views >= 1000000) {
        return (
            (views / 1000000).toFixed(1) +
            "M views"
        );
    }

    if (views >= 1000) {
        return (
            (views / 1000).toFixed(1) +
            "K views"
        );
    }

    return views + " views";
}


function getThumbnail(video) {

    if (
        Array.isArray(video.videoThumbnails) &&
        video.videoThumbnails.length > 0
    ) {

        // Prefer the largest thumbnail.
        const thumbnails =
            [...video.videoThumbnails]
                .sort(
                    (a, b) =>
                        (b.width || 0) -
                        (a.width || 0)
                );

        return thumbnails[0].url;
    }

    return "";
}


// ============================================================
// RENDER VIDEOS
// ============================================================

function renderVideos(results) {

    videos.innerHTML = "";

    status.classList.add("hidden");

    if (
        !Array.isArray(results) ||
        results.length === 0
    ) {

        status.textContent =
            "💩 Nothing came out of the sewer.";

        status.classList.remove("hidden");

        return;
    }

    for (const video of results) {

        // Search results can contain channels,
        // playlists, etc.
        if (
            video.type &&
            video.type !== "video"
        ) {
            continue;
        }

        if (!video.videoId) {
            continue;
        }

        const card =
            document.createElement("article");

        card.className = "video-card";

        card.innerHTML = `
            <img
                class="thumbnail"
                src="${escapeHTML(
                    getThumbnail(video)
                )}"
                alt=""
                loading="lazy"
            >

            <div class="video-info">

                <div class="video-title">
                    ${escapeHTML(
                        video.title ||
                        "Untitled Crap"
                    )}
                </div>

                <div class="video-meta">

                    ${escapeHTML(
                        video.author ||
                        "Unknown creator"
                    )}

                    <br>

                    ${formatViews(
                        video.viewCount
                    )}

                    ${
                        video.publishedText
                            ? " • " +
                              escapeHTML(
                                  video.publishedText
                              )
                            : ""
                    }

                </div>

            </div>
        `;

        card.addEventListener(
            "click",
            () => openVideo(video.videoId, video)
        );

        videos.appendChild(card);
    }
}


// ============================================================
// TRENDING
// ============================================================

async function loadTrending() {

    document.getElementById(
        "pageTitle"
    ).textContent = "Trending";

    document.getElementById(
        "pageSubtitle"
    ).textContent =
        "Today's hottest crap.";

    showLoading(
        "🔥 Finding today's hottest crap..."
    );

    try {

        const data = await api(
            "/api/v1/trending?region=US"
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

        if (!query) {
            return;
        }

        document.getElementById(
            "pageTitle"
        ).textContent =
            `Search: ${query}`;

        document.getElementById(
            "pageSubtitle"
        ).textContent =
            "Searching the sewer...";

        showLoading(
            "💩 Searching the sewer..."
        );

        try {

            const data = await api(
                `/api/v1/search?q=${encodeURIComponent(
                    query
                )}&type=video&region=US`
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

async function openVideo(
    id,
    info = {}
) {

    playerModal.classList.remove(
        "hidden"
    );

    playerTitle.textContent =
        info.title ||
        "Loading video...";

    playerUploader.textContent =
        info.author ||
        "Pootube";

    player.removeAttribute("src");

    player.load();

    try {

        console.log(
            "🎬 Getting video information:",
            id
        );

        const data = await api(
            `/api/v1/videos/${encodeURIComponent(
                id
            )}?region=US`
        );


        // ----------------------------------------------------
        // First try normal format streams.
        // These usually contain both video and audio.
        // ----------------------------------------------------

        let streams =
            Array.isArray(
                data.formatStreams
            )
                ? data.formatStreams
                : [];


        streams =
            streams
                .filter(stream => {

                    return (
                        stream.container === "mp4" &&
                        stream.url
                    );
                })
                .sort(
                    (a, b) => {

                        const aQuality =
                            parseInt(
                                a.qualityLabel ||
                                "0"
                            );

                        const bQuality =
                            parseInt(
                                b.qualityLabel ||
                                "0"
                            );

                        return (
                            bQuality -
                            aQuality
                        );
                    }
                );


        // Prefer 1080p or lower.
        let selected =
            streams.find(stream => {

                const quality =
                    parseInt(
                        stream.qualityLabel ||
                        "0"
                    );

                return quality <= 1080;

            }) || streams[0];


        // ----------------------------------------------------
        // Fallback to adaptive formats.
        // ----------------------------------------------------

        if (!selected) {

            const adaptive =
                Array.isArray(
                    data.adaptiveFormats
                )
                    ? data.adaptiveFormats
                    : [];

            const combined =
                adaptive.filter(stream => {

                    return (
                        stream.url &&
                        stream.container === "mp4" &&
                        stream.audioQuality
                    );
                });

            selected =
                combined.find(stream => {

                    const quality =
                        parseInt(
                            stream.qualityLabel ||
                            "0"
                        );

                    return quality <= 1080;

                }) || combined[0];
        }


        if (!selected) {

            throw new Error(
                "Invidious returned no playable MP4 stream."
            );
        }


        console.log(
            "📺 Selected stream:",
            selected
        );


        player.src =
            selected.url;

        player.load();

        player.play().catch(
            () => {}
        );

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

    player.removeAttribute(
        "src"
    );

    player.load();

    playerModal.classList.add(
        "hidden"
    );
}


// ============================================================
// RANDOM CRAP
// ============================================================

async function randomVideo() {

    try {

        const data = await api(
            "/api/v1/trending?region=US"
        );

        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {
            return;
        }

        const video =
            data[
                Math.floor(
                    Math.random() *
                    data.length
                )
            ];

        if (video.videoId) {

            openVideo(
                video.videoId,
                video
            );
        }

    } catch (error) {

        showError(error);
    }
}


// ============================================================
// UI
// ============================================================

function showLoading(message) {

    videos.innerHTML = "";

    status.textContent =
        message;

    status.classList.remove(
        "hidden"
    );
}


function showError(error) {

    console.error(error);

    videos.innerHTML = "";

    status.innerHTML = `
        <strong>
            💀 Pootube fell into the sewer.
        </strong>

        <br><br>

        ${escapeHTML(
            error.message
        )}

        <br><br>

        <button onclick="loadHome()">
            🔄 Try Again
        </button>
    `;

    status.classList.remove(
        "hidden"
    );
}


function showMessage(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    toast.textContent =
        message;

    toast.classList.remove(
        "hidden"
    );

    setTimeout(
        () =>
            toast.classList.add(
                "hidden"
            ),
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
            !playerModal.classList.contains(
                "hidden"
            )
        ) {

            closePlayer();
        }
    }
);


// ============================================================
// START POOTUBE
// ============================================================

loadHome();
