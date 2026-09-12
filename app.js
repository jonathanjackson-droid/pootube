// ============================================================
// POOTUBE 💩
// Back4App Backend Edition
// ============================================================
//
// IMPORTANT:
// Your index.html must load Parse BEFORE this file:
//
// <script src="https://unpkg.com/parse/dist/parse.min.js"></script>
// <script src="app.js"></script>
//
// Your Application ID + JavaScript Key go below.
// DO NOT put your Back4App Master Key here.
// ============================================================


// ============================================================
// BACK4APP CONFIG
// ============================================================

const BACK4APP_APP_ID = "3GJDULsVIkiY8fp3DnCtDlMozQ6SEV1rAB83lzP2";
const BACK4APP_JS_KEY = "3dQukaocvDuiKqb3SqsLMVf9oXkiIo1LSpsXjfqA";


// Initialize Parse
Parse.initialize(
    BACK4APP_APP_ID,
    BACK4APP_JS_KEY
);

Parse.serverURL =
    "https://parseapi.back4app.com/";


// ============================================================
// DOM
// ============================================================

const videos =
    document.getElementById("videos");

const status =
    document.getElementById("status");

const searchForm =
    document.getElementById("searchForm");

const searchInput =
    document.getElementById("searchInput");

const playerModal =
    document.getElementById("playerModal");

const player =
    document.getElementById("player");

const playerTitle =
    document.getElementById("playerTitle");

const playerUploader =
    document.getElementById("playerUploader");


// ============================================================
// BACKEND CALL
// ============================================================
//
// Everything goes through Back4App Cloud Code.
//
// Frontend:
//     Pootube -> Back4App
//
// Backend:
//     Back4App -> Invidious
//
// This keeps the Invidious requests off the browser.
// ============================================================

async function backend(
    functionName,
    params = {}
) {

    console.log(
        "💩 Calling backend:",
        functionName,
        params
    );

    try {

        const result =
            await Parse.Cloud.run(
                functionName,
                params
            );

        console.log(
            "✅ Backend response:",
            functionName,
            result
        );

        return result;

    } catch (error) {

        console.error(
            "💀 Back4App error:",
            functionName,
            error
        );

        throw new Error(
            error.message ||
            `Backend function "${functionName}" failed.`
        );
    }
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(
    value = ""
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ============================================================
// FORMAT VIEWS
// ============================================================

function formatViews(
    views
) {

    if (
        views === null ||
        views === undefined
    ) {

        return "No views";
    }

    if (
        Number(views) >=
        1000000000
    ) {

        return (
            (
                Number(views) /
                1000000000
            ).toFixed(1) +
            "B views"
        );
    }

    if (
        Number(views) >=
        1000000
    ) {

        return (
            (
                Number(views) /
                1000000
            ).toFixed(1) +
            "M views"
        );
    }

    if (
        Number(views) >=
        1000
    ) {

        return (
            (
                Number(views) /
                1000
            ).toFixed(1) +
            "K views"
        );
    }

    return (
        Number(views) +
        " views"
    );
}


// ============================================================
// THUMBNAIL
// ============================================================

function getThumbnail(
    video
) {

    if (
        Array.isArray(
            video.videoThumbnails
        ) &&
        video.videoThumbnails.length
    ) {

        const thumbnails =
            [
                ...video.videoThumbnails
            ].sort(
                (a, b) =>
                    (b.width || 0) -
                    (a.width || 0)
            );

        return thumbnails[0].url || "";
    }

    return "";
}


// ============================================================
// RENDER VIDEOS
// ============================================================

function renderVideos(
    results
) {

    videos.innerHTML = "";

    status.classList.add(
        "hidden"
    );


    if (
        !Array.isArray(results) ||
        results.length === 0
    ) {

        status.textContent =
            "💩 The sewer returned nothing.";

        status.classList.remove(
            "hidden"
        );

        return;
    }


    let rendered = 0;


    for (
        const video of results
    ) {

        // Ignore channels/playlists/etc.
        if (
            video.type &&
            video.type !== "video"
        ) {

            continue;
        }


        if (
            !video.videoId
        ) {

            continue;
        }


        const card =
            document.createElement(
                "article"
            );

        card.className =
            "video-card";


        const thumbnail =
            getThumbnail(
                video
            );


        card.innerHTML = `
            <img
                class="thumbnail"
                src="${escapeHTML(
                    thumbnail
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
            () => {

                openVideo(
                    video.videoId,
                    video
                );

            }
        );


        videos.appendChild(
            card
        );

        rendered++;
    }


    if (
        rendered === 0
    ) {

        status.textContent =
            "💩 The backend responded, but gave us no videos.";

        status.classList.remove(
            "hidden"
        );
    }
}


// ============================================================
// GET TRENDING
// ============================================================

async function getTrending() {

    return await backend(
        "getTrending"
    );
}


// ============================================================
// SEARCH
// ============================================================

async function searchVideos(
    query
) {

    return await backend(
        "searchVideos",
        {
            query: query
        }
    );
}


// ============================================================
// GET VIDEO
// ============================================================

async function getVideo(
    videoId
) {

    return await backend(
        "getVideo",
        {
            videoId: videoId
        }
    );
}


// ============================================================
// HOME / TRENDING
// ============================================================

async function loadTrending() {

    const pageTitle =
        document.getElementById(
            "pageTitle"
        );

    const pageSubtitle =
        document.getElementById(
            "pageSubtitle"
        );


    if (pageTitle) {

        pageTitle.textContent =
            "Trending";
    }


    if (pageSubtitle) {

        pageSubtitle.textContent =
            "Today's hottest crap.";
    }


    showLoading(
        "🔥 Finding today's hottest crap..."
    );


    try {

        const data =
            await getTrending();


        renderVideos(
            data
        );

    } catch (error) {

        showError(
            error
        );
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


        const pageTitle =
            document.getElementById(
                "pageTitle"
            );

        const pageSubtitle =
            document.getElementById(
                "pageSubtitle"
            );


        if (pageTitle) {

            pageTitle.textContent =
                `Search: ${query}`;
        }


        if (pageSubtitle) {

            pageSubtitle.textContent =
                "Searching the sewer...";
        }


        showLoading(
            "💩 Searching the sewer..."
        );


        try {

            const data =
                await searchVideos(
                    query
                );


            renderVideos(
                data
            );

        } catch (error) {

            showError(
                error
            );
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


    // Clear old video
    player.pause();

    player.removeAttribute(
        "src"
    );

    player.load();


    try {

        console.log(
            "🎬 Requesting video:",
            videoId
        );


        const data =
            await getVideo(
                videoId
            );


        console.log(
            "🎬 Video response:",
            data
        );


        // Update title if backend
        // gave us better information.

        if (
            data.title
        ) {

            playerTitle.textContent =
                data.title;
        }


        if (
            data.author
        ) {

            playerUploader.textContent =
                data.author;
        }


        // ====================================================
        // NORMAL MP4 STREAMS
        // ====================================================

        let streams =
            Array.isArray(
                data.formatStreams
            )
                ? data.formatStreams
                : [];


        streams =
            streams
                .filter(
                    stream => {

                        if (
                            !stream.url
                        ) {

                            return false;
                        }


                        const type =
                            stream.type ||
                            "";


                        const container =
                            stream.container ||
                            "";


                        return (
                            container === "mp4" ||
                            type.includes(
                                "video/mp4"
                            )
                        );
                    }
                )
                .sort(
                    (a, b) => {

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


                        return (
                            bQuality -
                            aQuality
                        );
                    }
                );


        let selected =
            streams.find(
                stream => {

                    const quality =
                        parseInt(
                            stream.qualityLabel ||
                            stream.quality ||
                            "0"
                        );


                    return (
                        quality > 0 &&
                        quality <= 1080
                    );
                }
            );


        // If there wasn't a <=1080p
        // stream, use the best one.

        if (
            !selected &&
            streams.length
        ) {

            selected =
                streams[0];
        }


        // ====================================================
        // ADAPTIVE FALLBACK
        // ====================================================

        if (
            !selected
        ) {

            const adaptive =
                Array.isArray(
                    data.adaptiveFormats
                )
                    ? data.adaptiveFormats
                    : [];


            const compatible =
                adaptive
                    .filter(
                        stream => {

                            if (
                                !stream.url
                            ) {

                                return false;
                            }


                            const type =
                                stream.type ||
                                "";


                            return type.includes(
                                "video/mp4"
                            );
                        }
                    )
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


            selected =
                compatible.find(
                    stream => {

                        const quality =
                            parseInt(
                                stream.qualityLabel ||
                                "0"
                            );


                        return (
                            quality > 0 &&
                            quality <= 1080
                        );
                    }
                ) ||
                compatible[0];
        }


        // ====================================================
        // NOTHING FOUND
        // ====================================================

        if (
            !selected
        ) {

            throw new Error(
                "The backend found the video, but no compatible MP4 stream was returned."
            );
        }


        console.log(
            "📺 Selected stream:",
            selected
        );


        // ====================================================
        // PLAY
        // ====================================================

        player.src =
            selected.url;


        player.load();


        try {

            await player.play();

        } catch (playError) {

            console.warn(
                "Autoplay was blocked:",
                playError
            );

            // This is normal browser behavior.
            // The user can press Play.
        }


    } catch (error) {

        console.error(
            "💀 Video error:",
            error
        );


        playerTitle.textContent =
            "💀 Pootube couldn't load this video.";


        playerUploader.textContent =
            error.message ||
            "Unknown backend error.";
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

        showMessage(
            "🎲 Looking for random crap..."
        );


        const data =
            await getTrending();


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            throw new Error(
                "The sewer returned no videos."
            );
        }


        const videosOnly =
            data.filter(
                video =>
                    video.videoId &&
                    (
                        !video.type ||
                        video.type === "video"
                    )
            );


        if (
            videosOnly.length === 0
        ) {

            throw new Error(
                "The sewer returned no playable videos."
            );
        }


        const random =
            videosOnly[
                Math.floor(
                    Math.random() *
                    videosOnly.length
                )
            ];


        openVideo(
            random.videoId,
            random
        );


    } catch (error) {

        showError(
            error
        );
    }
}


// ============================================================
// LOADING UI
// ============================================================

function showLoading(
    message
) {

    videos.innerHTML = "";


    status.textContent =
        message;


    status.classList.remove(
        "hidden"
    );
}


// ============================================================
// ERROR UI
// ============================================================

function showError(
    error
) {

    console.error(
        "💀 POOTUBE ERROR:",
        error
    );


    videos.innerHTML = "";


    const message =
        error &&
        error.message
            ? error.message
            : "Unknown error.";


    status.innerHTML = `
        <strong>
            💀 Pootube fell into the sewer.
        </strong>

        <br><br>

        <pre style="
            white-space: pre-wrap;
            text-align: left;
            max-width: 900px;
            margin: auto;
            font-size: 12px;
        ">${escapeHTML(
            message
        )}</pre>

        <br>

        <button
            onclick="loadHome()"
        >
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

function showMessage(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        return;
    }


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
// RANDOM CRAP BUTTON
// ============================================================

const randomButton =
    document.getElementById(
        "randomButton"
    );


if (
    randomButton
) {

    randomButton.addEventListener(
        "click",
        randomVideo
    );
}


// ============================================================
// SIDEBAR
// ============================================================

const homeButton =
    document.querySelector(
        '[data-page="home"]'
    );

const trendingButton =
    document.querySelector(
        '[data-page="trending"]'
    );


if (
    homeButton
) {

    homeButton.addEventListener(
        "click",
        loadHome
    );
}


if (
    trendingButton
) {

    trendingButton.addEventListener(
        "click",
        loadTrending
    );
}


// ============================================================
// BACK4APP CONNECTION TEST
// ============================================================

async function testBackend() {

    try {

        console.log(
            "💩 Testing Pootube backend..."
        );


        const result =
            await backend(
                "ping"
            );


        console.log(
            "🟢 Pootube backend ONLINE:",
            result
        );


    } catch (error) {

        console.error(
            "🔴 Pootube backend OFFLINE:",
            error
        );
    }
}


// ============================================================
// START
// ============================================================

console.log(
    "💩 POOTUBE STARTING..."
);


console.log(
    "🔌 Backend:",
    Parse.serverURL
);


// Test backend first,
// then load the actual homepage.

testBackend();

loadHome();
