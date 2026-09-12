// ============================================================
// POOTUBE 💩
// Invidious Edition
// ============================================================

const INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://yt.chocolatemoo53.com",
    "https://invidious.tiekoetter.com"
];

let ACTIVE_INSTANCE = null;


// ============================================================
// DOM ELEMENTS
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
// API REQUEST
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

    const errors = [];

    for (const instance of instances) {

        try {

            console.log(
                "💩 Pootube trying:",
                instance
            );

            const controller = new AbortController();

            const timeout = setTimeout(() => {
                controller.abort();
            }, 10000);

            const response = await fetch(
                instance + endpoint,
                {
                    method: "GET",
                    mode: "cors",
                    headers: {
                        "Accept": "application/json"
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeout);

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
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

            const message =
                error.name === "AbortError"
                    ? "Timed out"
                    : error.message || "Unknown error";

            console.warn(
                "💀 Instance failed:",
                instance,
                message
            );

            errors.push(
                `${instance}: ${message}`
            );
        }
    }

    throw new Error(
        "Every Invidious instance failed.\n\n" +
        errors.join("\n")
    );
}


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHTML(value = "") {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// VIEW COUNT
// ============================================================

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


// ============================================================
// THUMBNAILS
// ============================================================

function getThumbnail(video) {

    if (
        Array.isArray(video.videoThumbnails) &&
        video.videoThumbnails.length > 0
    ) {

        const thumbnails =
            [...video.videoThumbnails].sort(
                (a, b) =>
                    (b.width || 0) -
                    (a.width || 0)
            );

        return thumbnails[0].url;
    }

    return "";
}


// ============================================================
// RENDER VIDEO CARDS
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

    let rendered = 0;

    for (const video of results) {

        // Search results contain videos,
        // playlists, channels, etc.
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
            () => openVideo(
                video.videoId,
                video
            )
        );

        videos.appendChild(card);

        rendered++;
    }

    if (rendered === 0) {

        status.textContent =
            "💩 Invidious returned stuff, but none of it was videos.";

        status.classList.remove("hidden");
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
// OPEN VIDEO
// ============================================================

async function openVideo(
    videoId,
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
            "🎬 Loading video:",
            videoId
        );

        const data = await api(
            `/api/v1/videos/${encodeURIComponent(
                videoId
            )}?region=US`
        );


        // ----------------------------------------------------
        // Normal MP4 streams
        // ----------------------------------------------------

        let streams =
            Array.isArray(data.formatStreams)
                ? data.formatStreams
                : [];


        streams = streams
            .filter(stream =>
                stream.url &&
                (
                    stream.container === "mp4" ||
                    (
                        stream.type &&
                        stream.type.includes(
                            "video/mp4"
                        )
                    )
                )
            )
            .sort((a, b) => {

                const aQuality =
                    parseInt(
                        a.qualityLabel ||
                        a.quality ||
                        "0"
                    );

                const bQuality =
                    parseInt(
                        b.qualityLabel ||
                        b.quality ||
                        "0"
                    );

                return bQuality - aQuality;
            });


        // Prefer 1080p or lower.
        let selected =
            streams.find(stream => {

                const quality =
                    parseInt(
                        stream.qualityLabel ||
                        stream.quality ||
                        "0"
                    );

                return quality <= 1080;

            }) || streams[0];


        // ----------------------------------------------------
        // Adaptive fallback
        // ----------------------------------------------------

        if (!selected) {

            const adaptive =
                Array.isArray(
                    data.adaptiveFormats
                )
                    ? data.adaptiveFormats
                    : [];

            const compatible =
                adaptive
                    .filter(stream =>
                        stream.url &&
                        (
                            stream.type &&
                            stream.type.includes(
                                "video/mp4"
                            )
                        ) &&
                        stream.audioQuality
                    )
                    .sort((a, b) => {

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
                    });

            selected =
                compatible.find(stream => {

                    const quality =
                        parseInt(
                            stream.qualityLabel ||
                            "0"
                        );

                    return quality <= 1080;

                }) || compatible[0];
        }


        if (!selected) {

            throw new Error(
                "Invidious returned no compatible video stream."
            );
        }


        console.log(
            "📺 Selected stream:",
            selected
        );


        player.src =
            selected.url;

        player.load();

        await player.play().catch(() => {});


    } catch (error) {

        console.error(
            "💀 Video error:",
            error
        );

        playerTitle.textContent =
            "💀 Pootube couldn't load this video.";

        playerUploader.textContent =
            error.message;
    }
}


// ============================================================
// CLOSE VIDEO
// ============================================================

function closePlayer() {

    player.pause();

    player.removeAttribute("src");

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
// LOADING MESSAGE
// ============================================================

function showLoading(message) {

    videos.innerHTML = "";

    status.textContent =
        message;

    status.classList.remove(
        "hidden"
    );
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function showError(error) {

    console.error(
        "💀 POOTUBE ERROR:",
        error
    );

    videos.innerHTML = "";

    const message =
        error.message ||
        "Unknown error";

    status.innerHTML = `
        <strong>
            💀 Pootube fell into the sewer.
        </strong>

        <br><br>

        <pre style="
            white-space: pre-wrap;
            text-align: left;
            max-width: 800px;
            margin: auto;
        ">${escapeHTML(message)}</pre>

        <br>

        <button onclick="loadHome()">
            🔄 Try Again
        </button>
    `;

    status.classList.remove(
        "hidden"
    );
}


// ============================================================
// TOAST
// ============================================================

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
        () => {
            toast.classList.add(
                "hidden"
            );
        },
        2500
    );
}


// ============================================================
// ESCAPE KEY
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

console.log(
    "💩 Pootube is starting..."
);

loadHome();
