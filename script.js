let frames = [];
let button, canvas, ctx, framerate, cssVideoAnimationLength;
let keyFramesList = [];

const VIDEO_SCALING_FACTOR = 5;
const DESIRED_FRAMERATE = 30;


document.addEventListener('DOMContentLoaded', () => {
    button = document.querySelector('#playback-button');
    canvas = document.querySelector('#playback-canvas');
    ctx = canvas.getContext('2d');

    if (!window.MediaStreamTrackProcessor) {
        document.querySelector('#not-supported-warning').style.display = 'unset';
        return;
    }

    button.onclick = async () => extractFrames();
})

const mapPixelsToBoxShadowDeclaration = (width, height, pixels) => {
    const boxShadowPixels = [];

    //extract r,g,b,a values from array -> r1,g1,b1,a1,r2,g2,b2,a2
    [...Array(Math.ceil(pixels.length / 4)).keys()]
        .forEach(i => {
            const [r, g, b, a] = pixels.slice(i * 4, (i + 1) * 4);

            const x = i % width;
            const y = Math.floor(i / width);

            boxShadowPixels.push(`${x}px ${y}px rgb(${r},${g},${b},${a})`);
        })

    return boxShadowPixels.join(',') + ';';
};

const extractPixelsFromFrame = bitmap => {
    const {width: w, height: h} = bitmap;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, w, h).data;

    keyFramesList.push(mapPixelsToBoxShadowDeclaration(w, h, pixels));
};

const readAndProcessFrames = async (reader) => {
    await reader
        .read()
        .then(async ({done, value}) => {
            if (!value) return;

            console.log(value)

            const calculatedWidth = value.codedWidth / VIDEO_SCALING_FACTOR;
            const calculatedHeight = value.codedHeight / VIDEO_SCALING_FACTOR;
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
            await readAndProcessFrames(reader);
        });
};

const createKeyFramesDeclaration = (usableAmountOfKeyFrames) => {
    let totalFramesLength = usableAmountOfKeyFrames.length;

    usableAmountOfKeyFrames = usableAmountOfKeyFrames.map((element, index) => {
        let keyFramePercentage = parseFloat(String(index / totalFramesLength)).toFixed(2);
        return keyFramePercentage + '% { box-shadow: ' + element + '}'
    })

    const cssMovieKeyframes = document.createElement('style');
    let keyFramesDeclaration = '@keyframes css-movie {' + usableAmountOfKeyFrames.join(' ') + '}';
    const rules = document.createTextNode(keyFramesDeclaration);

    cssVideoAnimationLength = (usableAmountOfKeyFrames.length / DESIRED_FRAMERATE) * 100;

    cssMovieKeyframes.appendChild(rules);
    document.getElementsByTagName("head")[0].appendChild(cssMovieKeyframes);
};

const reduceFrameRateForKeyFrames = () => {
    const ratio = Math.ceil(framerate / DESIRED_FRAMERATE);
    return keyFramesList.filter((value, index) => (index % ratio == 0));
};

const animateKeyFrames = () => {
    document.querySelector('.css-video').style.animation = `css-movie ${cssVideoAnimationLength}s steps(1, end)`;
};

const setFrameRateFromVideoTrack = track => framerate = track.getSettings().frameRate;

const getVideoTrack = async () => {
    //TODO introduce video upload?
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = "https://upload.wikimedia.org/wikipedia/commons/e/e4/6-step_example.webm";
    document.body.append(video);
    await video.play();
    const [track] = video.captureStream().getVideoTracks();
    video.onended = () => track.stop();
    return track;
};

const extractFrames = async () => {
    const track = await getVideoTrack();

    setFrameRateFromVideoTrack(track);

    const processor = new MediaStreamTrackProcessor(track);
    const reader = processor.readable.getReader();

    await readAndProcessFrames(reader);

    //TODO reduce framerate beforehands -> this is imperformant as hell
    const usableAmountOfKeyFrames = reduceFrameRateForKeyFrames();
    createKeyFramesDeclaration(usableAmountOfKeyFrames);

    animateKeyFrames();
};

