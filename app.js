// ============================================================
// POOTUBE 💩
// GitHub Pages Frontend
// Backend: Back4App / Parse Cloud Code
// ============================================================


// ============================================================
// BACK4APP CONFIG
// ============================================================

const BACK4APP_APP_ID = "3GJDULsVIkiY8fp3DnCtDlMozQ6SEV1rAB83lzP2";
const BACK4APP_JS_KEY = "3dQukaocvDuiKqb3SqsLMVf9oXkiIo1LSpsXjfqA";


// Make sure Parse is loaded before this script.
if (typeof Parse === "undefined") {
    document.body.innerHTML = `
        <div style="
            font-family: Arial, sans-serif;
            padding: 40px;
            background: #111;
            color: white;
        ">
            <h1>💩 Pootube is broken</h1>
            <p>Parse was not loaded.</p>
            <p>Make sure your index.html has:</p>
            <pre>
&lt;script src="https://unpkg.com/parse/dist/parse.min.js"&gt;&lt;/script&gt;
&lt;script src="app.js"&gt;&lt;/script&gt;
            </pre>
        </div>
    `;

    throw new Error("Parse SDK is not loaded.");
}


// Initialize Back4App
Parse.initialize(
    BACK4APP_APP_ID,
    BACK4APP_JS_KEY
);

Parse.serverURL = "https://parseapi.back4app.com/";

console.log("💩 Pootube frontend loaded.");
console.log("🔌 Parse initialized.");


// ============================================================
// DOM ELEMENTS
// ============================================================

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


// ============================================================
// GENERAL HELPERS
// ============================================================

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
    console.error("💩 POOTUBE ERROR:", message);

    if (statusElement) {
        statusElement.textContent = "💀 " + message;
        statusElement.style.display = "block";
    }

    showToast("💀 " + message);
}


function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(window.pootubeToastTimer);

    window.pootubeToastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 3500);
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


function formatViews(views) {
    if (views === undefined || views === null) {
        return "??? views";
    }

    const number = Number(views);

    if (Number.isNaN(number)) {
        return `${views} views`;
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
    if (!seconds) {
        return "";
    }

    seconds = Number(seconds);

    if (Number.isNaN(seconds)) {
        return "";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${minutes}:${String(secs).padStart(2, "0")}`;
}


function getThumbnail(video) {
    if (video.videoThumbnails && video.videoThumbnails.length > 0) {
        const preferred =
            video.videoThumbnails.find(t => t.quality === "medium") ||
            video.videoThumbnails.find(t => t.quality === "high") ||
            video.videoThumbnails[0];

        if (preferred && preferred.url) {
            return preferred.url;
        }
    }

    if (video.videoId) {
        return `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`;
    }

    return "";
}


// ============================================================
// BACKEND CALL
// ============================================================

async function backend(functionName, params = {}) {

    console.log(
        `🔌 Calling Back4App Cloud Function: ${functionName}`,
        params
    );

    try {

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(
                    new Error(
                        `Back4App function "${functionName}" timed out after 15 seconds.`
                    )
                );
            }, 15000);
        });

        const requestPromise = Parse.Cloud.run(
            functionName,
            params
        );

        const result = await Promise.race([
            requestPromise,
            timeoutPromise
        ]);

        console.log(
            `🟢 Back4App "${functionName}" responded:`,
            result
        );

        return result;

    } catch (error) {

        console.error(
            `🔴 Back4App "${functionName}" failed:`,
            error
        );

        let message = error?.message || String(error);

        if (
            message.toLowerCase().includes("unauthorized") ||
            message.toLowerCase().includes("application")
        ) {
            message =
                "Back4App rejected the request. Check your Application ID and JavaScript Key.";
        }

        throw new Error(message);
    }
}


// ============================================================
// BACKEND FUNCTIONS
// ============================================================

async function pingBackend() {
    return await backend("ping");
}


async function getTrending() {
    return await backend("getTrending");
}


async function searchVideos(query) {

    if (!query || !query.trim()) {
        return [];
    }

    return await backend(
        "searchVideos",
        {
            query: query.trim()
        }
    );
}


async function getVideo(videoId) {

    if (!videoId) {
        throw new Error("No video ID was provided.");
    }

    return await backend(
        "getVideo",
        {
            videoId: videoId
        }
    );
}


// ============================================================
// VIDEO CARD
// ============================================================

function createVideoCard(video) {

    const videoId = video.videoId;

    if (!videoId) {
        return "";
    }

    const title =
        video.title ||
        "Untitled piece of crap";

    const author =
        video.author ||
        "Unknown uploader";

    const thumbnail =
        getThumbnail(video);

    const views =
        formatViews(video.viewCount);

    const duration =
        formatDuration(video.lengthSeconds);

    return `
        <article
            class="video-card"
            data-video-id="${escapeHTML(videoId)}"
            style="cursor:pointer;"
        >

            <div class="thumbnail-wrapper">

                <img
                    class="thumbnail"
                    src="${escapeHTML(thumbnail)}"
                    alt="${escapeHTML(title)}"
                    loading="lazy"
                    onerror="this.style.display='none';"
                >

                ${
                    duration
                        ? `<span class="duration">${escapeHTML(duration)}</span>`
                        : ""
                }

            </div>

            <div class="video-info">

                <h3 class="video-title">
                    ${escapeHTML(title)}
                </h3>

                <div class="video-uploader">
                    ${escapeHTML(author)}
                </div>

                <div class="video-meta">
                    ${escapeHTML(views)}
                </div>

            </div>

        </article>
    `;
}


// ============================================================
// RENDER VIDEOS
// ============================================================

function renderVideos(videoList) {

    if (!videosContainer) {
        console.error("Could not find #videos.");
        return;
    }

    if (!Array.isArray(videoList)) {
        console.error(
            "Expected an array of videos but received:",
            videoList
        );

        videosContainer.innerHTML = `
            <div style="padding:30px;">
                💀 Pootube received garbage instead of videos.
            </div>
        `;

        return;
    }

    if (videoList.length === 0) {

        videosContainer.innerHTML = `
            <div style="padding:30px;">
                💩 Nothing here. The sewer is empty.
            </div>
        `;

        return;
    }

    videosContainer.innerHTML =
        videoList
            .map(createVideoCard)
            .join("");


    // Attach click events

    const cards =
        videosContainer.querySelectorAll(".video-card");

    cards.forEach(card => {

        card.addEventListener(
            "click",
            () => {

                const videoId =
                    card.dataset.videoId;

                if (videoId) {
                    openVideo(videoId);
                }

            }
        );

    });
}


// ============================================================
// HOME / TRENDING
// ============================================================

async function loadHome() {

    console.log("🏠 Loading Pootube home...");

    showLoading(
        "🔌 Connecting to the Pootube sewer..."
    );

    try {

        if (pageTitle) {
            pageTitle.textContent = "Home";
        }

        if (pageSubtitle) {
            pageSubtitle.textContent =
                "Fresh garbage from the internet.";
        }

        const videos =
            await getTrending();

        renderVideos(videos);

        hideLoading();

        console.log(
            `🟢 Loaded ${videos.length} videos.`
        );

    } catch (error) {

        showError(
            error.message ||
            "Could not load Pootube."
        );

    }
}


// ============================================================
// SEARCH
// ============================================================

async function performSearch(query) {

    const cleaned =
        query.trim();

    if (!cleaned) {
        await loadHome();
        return;
    }

    console.log(
        `🔎 Searching Pootube for "${cleaned}"`
    );

    showLoading(
        `🔎 Searching for "${cleaned}"...`
    );

    try {

        if (pageTitle) {
            pageTitle.textContent =
                `Search: ${cleaned}`;
        }

        if (pageSubtitle) {
            pageSubtitle.textContent =
                "Results from the sewer.";
        }

        const results =
            await searchVideos(cleaned);

        renderVideos(results);

        hideLoading();

        showToast(
            `💩 Found ${results.length} results`
        );

    } catch (error) {

        showError(
            error.message ||
            "Search failed."
        );

    }
}


// ============================================================
// VIDEO PLAYER
// ============================================================

async function openVideo(videoId) {

    console.log(
        "▶️ Opening video:",
        videoId
    );

    showToast(
        "📺 Loading video..."
    );

    try {

        const video =
            await getVideo(videoId);

        console.log(
            "🎬 Video information:",
            video
        );

        if (playerTitle) {
            playerTitle.textContent =
                video.title ||
                "Untitled video";
        }

        if (playerUploader) {
            playerUploader.textContent =
                video.author ||
                "Unknown uploader";
        }


        // ----------------------------------------------------
        // Find a playable video URL
        // ----------------------------------------------------

        let selectedURL = null;


        // Normal progressive MP4 streams

        if (
            Array.isArray(video.formatStreams) &&
            video.formatStreams.length > 0
        ) {

            const mp4 =
                video.formatStreams.find(
                    stream =>
                        stream.type &&
                        stream.type.includes("video/mp4") &&
                        stream.url
                );

            if (mp4) {
                selectedURL = mp4.url;
            }

        }


        // Adaptive streams fallback

        if (
            !selectedURL &&
            Array.isArray(video.adaptiveFormats)
        ) {

            const mp4 =
                video.adaptiveFormats.find(
                    stream =>
                        stream.type &&
                        stream.type.includes("video/mp4") &&
                        stream.url
                );

            if (mp4) {
                selectedURL = mp4.url;
            }

        }


        // ----------------------------------------------------
        // Use direct stream
        // ----------------------------------------------------

        if (selectedURL && player) {

            console.log(
                "🎥 Using direct video stream."
            );

            player.src = selectedURL;

            if (playerModal) {
                playerModal.style.display = "flex";
            }

            try {
                await player.play();
            } catch (playError) {

                console.warn(
                    "Browser prevented autoplay:",
                    playError
                );

            }

            return;
        }


        // ----------------------------------------------------
        // Fallback to YouTube embed
        // ----------------------------------------------------

        console.warn(
            "No direct MP4 stream found."
        );


        if (player && videoId) {

            /*
             * If your player element is an iframe,
             * this will work as a fallback.
             */

            if (
                player.tagName &&
                player.tagName.toLowerCase() === "iframe"
            ) {

                player.src =
                    `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;

                if (playerModal) {
                    playerModal.style.display = "flex";
                }

                return;
            }

        }


        throw new Error(
            "The backend found the video, but no playable stream was returned."
        );

    } catch (error) {

        console.error(
            "🔴 Video failed:",
            error
        );

        showError(
            error.message ||
            "Could not open video."
        );

    }
}


// ============================================================
// CLOSE PLAYER
// ============================================================

function closePlayer() {

    if (player) {

        try {
            player.pause();
        } catch (_) {}

        player.removeAttribute("src");

        try {
            player.load();
        } catch (_) {}

    }

    if (playerModal) {
        playerModal.style.display = "none";
    }

}


// ============================================================
// RANDOM VIDEO
// ============================================================

async function randomVideo() {

    console.log(
        "🎲 Random Crap activated."
    );

    showToast(
        "🎲 Searching the sewer..."
    );

    try {

        const videos =
            await getTrending();

        if (
            !Array.isArray(videos) ||
            videos.length === 0
        ) {

            throw new Error(
                "There are no videos to randomly select."
            );

        }

        const randomIndex =
            Math.floor(
                Math.random() * videos.length
            );

        const selected =
            videos[randomIndex];

        if (selected.videoId) {

            openVideo(
                selected.videoId
            );

        } else {

            throw new Error(
                "Random video had no ID."
            );

        }

    } catch (error) {

        showError(
            error.message ||
            "Random Crap failed."
        );

    }
}


// ============================================================
// SEARCH FORM
// ============================================================

if (searchForm) {

    searchForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const query =
                searchInput
                    ? searchInput.value
                    : "";

            await performSearch(query);

        }
    );

}


// ============================================================
// RANDOM BUTTON
// ============================================================

if (randomButton) {

    randomButton.addEventListener(
        "click",
        randomVideo
    );

}


// ============================================================
// PLAYER MODAL CLICKING
// ============================================================

if (playerModal) {

    playerModal.addEventListener(
        "click",
        event => {

            // Close when clicking the modal background

            if (
                event.target === playerModal
            ) {

                closePlayer();

            }

        }
    );

}


// ============================================================
// ESC KEY CLOSES PLAYER
// ============================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            playerModal &&
            playerModal.style.display !== "none"
        ) {

            closePlayer();

        }

    }
);


// ============================================================
// SIDEBAR
// ============================================================

document.querySelectorAll(
    "[data-page]"
).forEach(item => {

    item.addEventListener(
        "click",
        async () => {

            const page =
                item.dataset.page;

            if (page === "home") {

                await loadHome();

            }

            else if (page === "trending") {

                await loadHome();

            }

        }
    );

});


// ============================================================
// BACKEND CONNECTION TEST
// ============================================================

async function testBackend() {

    console.log(
        "🧪 Testing Back4App connection..."
    );

    try {

        const result =
            await pingBackend();

        console.log(
            "🟢 PING SUCCESS:",
            result
        );

        showToast(
            "🟢 Pootube backend is alive!"
        );

        return true;

    } catch (error) {

        console.error(
            "🔴 PING FAILED:",
            error
        );

        showError(
            "Back4App connection failed: " +
            error.message
        );

        return false;
    }

}


// ============================================================
// STARTUP
// ============================================================

async function startup() {

    console.log(
        "💩 ==============================="
    );

    console.log(
        "💩 POOTUBE STARTING"
    );

    console.log(
        "💩 ==============================="
    );


    // Check that the user replaced the keys

    if (
        BACK4APP_APP_ID === "YOUR_APPLICATION_ID" ||
        BACK4APP_JS_KEY === "YOUR_JAVASCRIPT_KEY"
    ) {

        showError(
            "You haven't entered your Back4App Application ID and JavaScript Key yet."
        );

        return;
    }


    // Test the backend BEFORE trying to load videos

    const backendOnline =
        await testBackend();


    if (!backendOnline) {

        console.error(
            "💀 Startup stopped because the backend failed."
        );

        return;
    }


    // Backend works — now load videos

    await loadHome();

}


// ============================================================
// START POOTUBE
// ============================================================

startup();
