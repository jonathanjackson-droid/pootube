// ============================================================
// 💩 POOTUBE — BACK4APP EDITION
// ============================================================
// GitHub Pages frontend
//        ↓
// Back4App / Parse Cloud Code
//        ↓
// Invidious
// ============================================================


// ------------------------------------------------------------
// 1. BACK4APP CONFIG
// ------------------------------------------------------------

// PUT YOUR REAL VALUES HERE.
const BACK4APP_APP_ID = "3GJDULsVIkiY8fp3DnCtDlMozQ6SEV1rAB83lzP2";
const BACK4APP_JS_KEY = "3dQukaocvDuiKqb3SqsLMVf9oXkiIo1LSpsXjfqA";


// Make sure Parse exists before doing anything.
if (typeof Parse === "undefined") {
    console.error("💀 Parse SDK is not loaded.");
    showError("💀 Parse SDK failed to load.");
    throw new Error("Parse SDK is not loaded.");
}


// Initialize Parse.
Parse.initialize(
    BACK4APP_APP_ID,
    BACK4APP_JS_KEY
);

Parse.serverURL = "https://parseapi.back4app.com/";

console.log("💩 Parse initialized.");


// ------------------------------------------------------------
// 2. DOM ELEMENTS
// ------------------------------------------------------------

const videosContainer = document.getElementById("videos");
const statusElement = document.getElementById("status");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const playerModal = document.getElementById("playerModal");
const player = document.getElementById("player");
const playerTitle = document.getElementById("playerTitle");
const playerUploader = document.getElementById("playerUploader");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const randomButton = document.getElementById("randomButton");
const toast = document.getElementById("toast");


// ------------------------------------------------------------
// 3. BASIC UI HELPERS
// ------------------------------------------------------------

function showLoading(message = "💩 Loading crap...") {
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.display = "block";
    }
}


function hideLoading() {
    if (statusElement) {
        statusElement.style.display = "none";
    }
}


function showError(message) {
    console.error(message);

    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.display = "block";
    }

    if (videosContainer) {
        videosContainer.innerHTML = `
            <div class="error-message">
                <h2>💀 POOTUBE EXPLODED</h2>
                <p>${escapeHTML(message)}</p>
                <button onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}


function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ------------------------------------------------------------
// 4. BACK4APP CLOUD FUNCTION HELPER
// ------------------------------------------------------------

async function backend(functionName, params = {}) {

    console.log(`📡 Calling Back4App function: ${functionName}`, params);

    try {

        const result = await Parse.Cloud.run(
            functionName,
            params
        );

        console.log(
            `🟢 Back4App ${functionName} succeeded:`,
            result
        );

        return result;

    } catch (error) {

        console.error(
            `🔴 Back4App ${functionName} failed:`,
            error
        );

        throw error;
    }
}


// ------------------------------------------------------------
// 5. BACKEND FUNCTIONS
// ------------------------------------------------------------

async function pingBackend() {
    return await backend("ping");
}


async function getTrending() {
    return await backend("getTrending");
}


async function searchVideos(query) {
    return await backend(
        "searchVideos",
        {
            query: query
        }
    );
}


async function getVideo(videoId) {
    return await backend(
        "getVideo",
        {
            videoId: videoId
        }
    );
}


// ------------------------------------------------------------
// 6. NORMALIZE VIDEO DATA
// ------------------------------------------------------------

function normalizeVideo(video) {

    if (!video) {
        return null;
    }

    return {
        id:
            video.videoId ||
            video.id ||
            video.video_id ||
            "",

        title:
            video.title ||
            "Untitled Crap",

        author:
            video.author ||
            video.uploader ||
            video.authorId ||
            "Unknown uploader",

        thumbnail:
            video.videoThumbnails?.[0]?.url ||
            video.thumbnail ||
            video.thumbnailUrl ||
            "",

        duration:
            video.lengthSeconds ||
            video.duration ||
            0,

        views:
            video.viewCount ||
            video.views ||
            0,

        published:
            video.publishedText ||
            "",

        description:
            video.description ||
            ""
    };
}


// ------------------------------------------------------------
// 7. FORMAT NUMBERS
// ------------------------------------------------------------

function formatViews(number) {

    if (!number) {
        return "0 views";
    }

    number = Number(number);

    if (Number.isNaN(number)) {
        return "0 views";
    }

    if (number >= 1000000000) {
        return (number / 1000000000).toFixed(1) + "B views";
    }

    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + "M views";
    }

    if (number >= 1000) {
        return (number / 1000).toFixed(1) + "K views";
    }

    return number.toLocaleString() + " views";
}


function formatDuration(seconds) {

    seconds = Number(seconds);

    if (!seconds || Number.isNaN(seconds)) {
        return "";
    }

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor(
        (seconds % 3600) / 60
    );

    const secs = Math.floor(
        seconds % 60
    );

    if (hours > 0) {

        return (
            hours +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0")
        );

    }

    return (
        minutes +
        ":" +
        String(secs).padStart(2, "0")
    );
}


// ------------------------------------------------------------
// 8. RENDER VIDEO CARDS
// ------------------------------------------------------------

function renderVideos(videoList) {

    if (!videosContainer) {
        return;
    }

    videosContainer.innerHTML = "";

    if (!Array.isArray(videoList)) {

        console.error(
            "Expected an array of videos but got:",
            videoList
        );

        showError(
            "💀 Back4App returned something that wasn't a video list."
        );

        return;
    }

    if (videoList.length === 0) {

        videosContainer.innerHTML = `
            <div class="empty-message">
                <h2>💩 Nothing here.</h2>
                <p>The sewer is currently empty.</p>
            </div>
        `;

        return;
    }


    videoList.forEach(rawVideo => {

        const video = normalizeVideo(rawVideo);

        if (!video || !video.id) {
            return;
        }


        const card = document.createElement("div");

        card.className = "video-card";


        card.innerHTML = `

            <div class="thumbnail-container">

                ${
                    video.thumbnail
                    ?
                    `
                    <img
                        class="video-thumbnail"
                        src="${escapeHTML(video.thumbnail)}"
                        alt=""
                        loading="lazy"
                        onerror="this.style.display='none'"
                    >
                    `
                    :
                    `
                    <div class="no-thumbnail">
                        💩
                    </div>
                    `
                }

                ${
                    video.duration
                    ?
                    `
                    <span class="duration">
                        ${escapeHTML(
                            formatDuration(video.duration)
                        )}
                    </span>
                    `
                    :
                    ""
                }

            </div>


            <div class="video-info">

                <h3 class="video-title">
                    ${escapeHTML(video.title)}
                </h3>

                <div class="video-author">
                    ${escapeHTML(video.author)}
                </div>

                <div class="video-meta">
                    ${escapeHTML(formatViews(video.views))}
                    ${
                        video.published
                        ?
                        " • " +
                        escapeHTML(video.published)
                        :
                        ""
                    }
                </div>

            </div>

        `;


        card.addEventListener(
            "click",
            () => openVideo(video.id)
        );


        videosContainer.appendChild(card);

    });
}


// ------------------------------------------------------------
// 9. LOAD HOME / TRENDING
// ------------------------------------------------------------

async function loadHome() {

    showLoading(
        "🔌 Connecting to the Pootube sewer..."
    );

    if (pageTitle) {
        pageTitle.textContent = "Home";
    }

    if (pageSubtitle) {
        pageSubtitle.textContent =
            "Absolutely terrible videos, delivered through a questionable backend.";
    }


    try {

        console.log(
            "📡 Requesting trending videos..."
        );

        const result = await getTrending();

        console.log(
            "📺 Trending response:",
            result
        );


        renderVideos(result);

        hideLoading();

        showToast(
            "💩 Sewer successfully loaded."
        );

    } catch (error) {

        console.error(
            "💀 Home loading failed:",
            error
        );

        showError(
            "Could not load Pootube: " +
            (error.message || error)
        );
    }
}


// ------------------------------------------------------------
// 10. SEARCH
// ------------------------------------------------------------

async function performSearch(query) {

    query = String(query || "").trim();

    if (!query) {

        showToast(
            "💩 You gotta type something."
        );

        return;
    }


    showLoading(
        `🔎 Searching the sewer for "${query}"...`
    );


    if (pageTitle) {
        pageTitle.textContent = "Search";
    }

    if (pageSubtitle) {
        pageSubtitle.textContent =
            `Results for "${query}"`;
    }


    try {

        console.log(
            "🔎 Searching:",
            query
        );


        const result = await searchVideos(query);


        console.log(
            "📺 Search response:",
            result
        );


        renderVideos(result);

        hideLoading();

        showToast(
            "💩 Search complete."
        );

    } catch (error) {

        console.error(
            "💀 Search failed:",
            error
        );

        showError(
            "Search failed: " +
            (error.message || error)
        );
    }
}


// ------------------------------------------------------------
// 11. SEARCH FORM
// ------------------------------------------------------------

if (searchForm) {

    searchForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await performSearch(
                searchInput?.value
            );

        }
    );
}


// ------------------------------------------------------------
// 12. RANDOM CRAP BUTTON
// ------------------------------------------------------------

if (randomButton) {

    randomButton.addEventListener(
        "click",
        async () => {

            showToast(
                "🎲 Throwing you into random crap..."
            );


            try {

                const videos =
                    await getTrending();


                if (
                    !Array.isArray(videos) ||
                    videos.length === 0
                ) {

                    throw new Error(
                        "No videos were returned."
                    );
                }


                const validVideos =
                    videos
                        .map(normalizeVideo)
                        .filter(video =>
                            video &&
                            video.id
                        );


                if (validVideos.length === 0) {

                    throw new Error(
                        "No playable videos were returned."
                    );
                }


                const randomVideo =
                    validVideos[
                        Math.floor(
                            Math.random() *
                            validVideos.length
                        )
                    ];


                await openVideo(
                    randomVideo.id
                );

            } catch (error) {

                console.error(
                    "Random crap failed:",
                    error
                );

                showToast(
                    "💀 The random crap machine broke."
                );
            }

        }
    );
}


// ------------------------------------------------------------
// 13. OPEN VIDEO
// ------------------------------------------------------------

async function openVideo(videoId) {

    if (!videoId) {

        showToast(
            "💀 This video has no ID."
        );

        return;
    }


    console.log(
        "▶️ Opening video:",
        videoId
    );


    showToast(
        "📺 Fetching video..."
    );


    try {

        const video =
            await getVideo(videoId);


        console.log(
            "🎬 Video information:",
            video
        );


        if (!video) {

            throw new Error(
                "Back4App returned no video data."
            );
        }


        const title =
            video.title ||
            "Untitled Crap";


        const uploader =
            video.author ||
            video.uploader ||
            "Unknown uploader";


        // ----------------------------------------------------
        // Find a playable video URL.
        // ----------------------------------------------------

        let selectedURL = null;


        // First look for normal MP4 format streams.
        if (
            Array.isArray(
                video.formatStreams
            )
        ) {

            const mp4Streams =
                video.formatStreams.filter(
                    stream => {

                        return (
                            stream &&
                            stream.url &&
                            (
                                !stream.type ||
                                stream.type.includes(
                                    "video/mp4"
                                )
                            )
                        );

                    }
                );


            // Prefer a reasonably sized stream.
            const preferred =
                mp4Streams.find(
                    stream =>
                        stream.resolution === "360p"
                ) ||
                mp4Streams.find(
                    stream =>
                        stream.resolution === "480p"
                ) ||
                mp4Streams[0];


            if (preferred) {
                selectedURL =
                    preferred.url;
            }
        }


        // ----------------------------------------------------
        // Fallback to adaptive MP4.
        // ----------------------------------------------------

        if (
            !selectedURL &&
            Array.isArray(
                video.adaptiveFormats
            )
        ) {

            const adaptive =
                video.adaptiveFormats.filter(
                    stream => {

                        return (
                            stream &&
                            stream.url &&
                            stream.type &&
                            stream.type.includes(
                                "video/mp4"
                            )
                        );

                    }
                );


            if (adaptive.length > 0) {

                selectedURL =
                    adaptive[0].url;
            }
        }


        // ----------------------------------------------------
        // If nothing playable was returned.
        // ----------------------------------------------------

        if (!selectedURL) {

            console.error(
                "No playable stream found.",
                video
            );


            throw new Error(
                "No playable MP4 stream was returned by Invidious."
            );
        }


        // ----------------------------------------------------
        // Set player information.
        // ----------------------------------------------------

        if (playerTitle) {

            playerTitle.textContent =
                title;
        }


        if (playerUploader) {

            playerUploader.textContent =
                uploader;
        }


        if (player) {

            player.src =
                selectedURL;

            player.load();

            player.play().catch(
                error => {

                    console.warn(
                        "Autoplay was blocked:",
                        error
                    );

                }
            );
        }


        // ----------------------------------------------------
        // Open modal.
        // ----------------------------------------------------

        if (playerModal) {

            playerModal.style.display =
                "flex";
        }


        showToast(
            "💩 Enjoy your garbage."
        );

    } catch (error) {

        console.error(
            "💀 Video failed to load:",
            error
        );


        showToast(
            "💀 Couldn't play that video."
        );

    }
}


// ------------------------------------------------------------
// 14. CLOSE PLAYER
// ------------------------------------------------------------

function closePlayer() {

    if (player) {

        player.pause();

        player.removeAttribute(
            "src"
        );

        player.load();
    }


    if (playerModal) {

        playerModal.style.display =
            "none";
    }
}


// Close when clicking outside the player.
if (playerModal) {

    playerModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                playerModal
            ) {

                closePlayer();

            }

        }
    );
}


// ESC closes the player.
document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closePlayer();

        }

    }
);


// ------------------------------------------------------------
// 15. SIDEBAR NAVIGATION
// ------------------------------------------------------------

document.querySelectorAll(
    "[data-page]"
).forEach(item => {

    item.addEventListener(
        "click",
        async () => {

            const page =
                item.dataset.page;


            // Home
            if (page === "home") {

                await loadHome();

                return;
            }


            // Trending
            if (page === "trending") {

                showLoading(
                    "🔥 Getting the hottest garbage..."
                );


                if (pageTitle) {
                    pageTitle.textContent =
                        "Trending";
                }

                if (pageSubtitle) {
                    pageSubtitle.textContent =
                        "The finest crap currently circulating through the sewer.";
                }


                try {

                    const result =
                        await getTrending();


                    renderVideos(result);

                    hideLoading();

                } catch (error) {

                    console.error(
                        error
                    );

                    showError(
                        "Trending failed: " +
                        (error.message || error)
                    );

                }

                return;
            }

        }
    );

});


// ------------------------------------------------------------
// 16. BACKEND DIAGNOSTIC
// ------------------------------------------------------------

async function testBackend() {

    console.log(
        "🧪 Testing Pootube backend..."
    );


    try {

        const result =
            await pingBackend();


        console.log(
            "🟢 PING SUCCESS:",
            result
        );


        return true;

    } catch (error) {

        console.error(
            "🔴 PING FAILED:",
            error
        );


        return false;
    }
}


// ------------------------------------------------------------
// 17. STARTUP
// ------------------------------------------------------------

async function startup() {

    console.log(
        "💩 Pootube starting..."
    );


    // First test GitHub → Back4App.
    showLoading(
        "🔌 Connecting to Pootube backend..."
    );


    const backendOnline =
        await testBackend();


    if (!backendOnline) {

        showError(
            "🔴 Pootube can't connect to Back4App. Check the browser console."
        );

        return;
    }


    console.log(
        "🟢 Backend is online."
    );


    showLoading(
        "🔥 Backend online. Loading crap..."
    );


    // Only attempt Invidious AFTER ping succeeds.
    await loadHome();

}


//
