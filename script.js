let frames = [];
let button, canvas, ctx;
let cssVideoResolutionSet = false;
let keyFramesList = [];

const VIDEO_SCALING_FACTOR = 10;

document.addEventListener('DOMContentLoaded', () => {
    button = document.querySelector('button');
    canvas = document.querySelector('canvas');
    ctx = canvas.getContext('2d');

    if (!window.MediaStreamTrackProcessor) {
        console.error("your browser doesn't support this API yet");
        return;
    }

    button.onclick = async () => extractFrames();
})

function mapPixelsToBoxShadowDeclaration(pixels) {
    const width = Math.sqrt(pixels.length);

    const boxShadowPixels = [];
    [...Array(Math.ceil(pixels.length / 4)).keys()].forEach(i => {
        const [r, g, b, a] = pixels.slice(i * 4, (i + 1) * 4)

        const x = i % width;
        const y = Math.floor(i / width);

        boxShadowPixels.push(`${x}px ${y}px rgb(${r},${g},${b},${a})`);
    })

    return boxShadowPixels.join(',') + ';';
}

const extractPixelsFromFrame = bitmap => {
    const {width: w, height: h} = bitmap;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, w, h).data;

    keyFramesList.push(mapPixelsToBoxShadowDeclaration(pixels));
};

const setCssVideoResolution = (calculatedWidth, calculatedHeight) => {
    if (cssVideoResolutionSet) return;

    let cssVideo = document.querySelector('.css-video');
    cssVideo.style.width = calculatedWidth;
    cssVideo.style.height = calculatedHeight;
};

const readChunk = async (reader) => {
    await reader
        .read()
        .then(async ({done, value}) => {
            if (!value) return;


            let calculatedWidth = value.codedWidth / VIDEO_SCALING_FACTOR;
            let calculatedHeight = value.codedHeight / VIDEO_SCALING_FACTOR;
            setCssVideoResolution(calculatedWidth, calculatedHeight);

            const bitmap = await createImageBitmap(value, {
                resizeWidth: calculatedWidth,
                resizeHeight: calculatedHeight,
                resizeQuality: "pixelated"
            });

            //TODO introduce frame skipping -> limit framerate
            extractPixelsFromFrame(bitmap);

            frames.push(bitmap);

            value.close();

            if (done) return;
            await readChunk(reader);
        });
};

const createKeyFramesDeclaration = () => {
    let totalFramesLength = keyFramesList.length;
    keyFramesList.map((element, index) => {
        let keyFramePercentage = parseFloat(String(index/totalFramesLength)).toFixed(2);
        return keyFramePercentage+'% {'+element+');'
    })

    const cssMovieKeyframes = document.createElement('style');
    const rules = document.createTextNode('@-webkit-keyframes css-movie {' + keyFramesList.join(' ')+ '}');
    console.log(rules);
    cssMovieKeyframes.appendChild(rules);
    document.getElementsByTagName("head")[0].appendChild(cssMovieKeyframes);
};

const extractFrames = async () => {
    const track = await getVideoTrack();
    const processor = new MediaStreamTrackProcessor(track);
    const reader = processor.readable.getReader();

    await readChunk(reader);
    createKeyFramesDeclaration();
};

async function getVideoTrack() {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = "https://upload.wikimedia.org/wikipedia/commons/a/a4/BBH_gravitational_lensing_of_gw150914.webm";
    document.body.append(video);
    await video.play();
    const [track] = video.captureStream().getVideoTracks();
    video.onended = () => track.stop();
    return track;
}

