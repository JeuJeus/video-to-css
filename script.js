let canvas, ctx, framerate, cssVideoAnimationLength;
let boxShadowKeyFramesList = [];

const DESIRED_FRAMERATE = 30;


document.addEventListener('DOMContentLoaded', () => {
    canvas = document.querySelector('#playback-canvas');
    ctx = canvas.getContext('2d');

    if (!window.MediaStreamTrackProcessor) {
        document.querySelector('#not-supported-warning').style.display = 'unset';
    }
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

    boxShadowKeyFramesList.push(mapPixelsToBoxShadowDeclaration(w, h, pixels));
};

const readAndProcessFrames = async (reader,videoScalingFactor) => {
    await reader
        .read()
        .then(async ({done, value}) => {
            if (!value) return;

            const calculatedWidth = value.codedWidth / videoScalingFactor;
            const calculatedHeight = value.codedHeight / videoScalingFactor;
            const bitmap = await createImageBitmap(value, {
                resizeWidth: calculatedWidth,
                resizeHeight: calculatedHeight,
                resizeQuality: "pixelated"
            });

            //TODO introduce frame skipping -> limit framerate
            extractPixelsFromFrame(bitmap);

            value.close();

            if (done) return;
            await readAndProcessFrames(reader,videoScalingFactor);
        });
};

const setCssAnimationLength = usableAmountOfKeyFrames => cssVideoAnimationLength = (usableAmountOfKeyFrames.length / DESIRED_FRAMERATE) * 100;

const mapShadowPixelsToBoxShadow = (usableAmountOfKeyFrames, totalFramesLength) => usableAmountOfKeyFrames
    .map((element, index) => {
        let keyFramePercentage = parseFloat(String(index / totalFramesLength)).toFixed(2);
        return keyFramePercentage + '% { box-shadow: ' + element + '}'
    });

const addBoxShadowFramesAsKeyframesToStyles = usableAmountOfKeyFrames => {
    const cssMovieKeyframes = document.createElement('style');
    const keyFramesDeclaration = '@keyframes css-movie {' + usableAmountOfKeyFrames.join(' ') + '}';
    const rules = document.createTextNode(keyFramesDeclaration);
    cssMovieKeyframes.appendChild(rules);
    document.getElementsByTagName("head")[0].appendChild(cssMovieKeyframes);
};

const keyFrameListToStyleDeclaration = (usableAmountOfKeyFrames) => {
    let totalFramesLength = usableAmountOfKeyFrames.length;
    usableAmountOfKeyFrames = mapShadowPixelsToBoxShadow(usableAmountOfKeyFrames, totalFramesLength);
    addBoxShadowFramesAsKeyframesToStyles(usableAmountOfKeyFrames);
    setCssAnimationLength(usableAmountOfKeyFrames);
};

const reduceFrameRateForKeyFrames = () => {
    const skipRatio = Math.ceil(framerate / DESIRED_FRAMERATE);
    return boxShadowKeyFramesList.filter((value, index) => (index % skipRatio === 0));
};

const animateKeyFrames = () => {
    document.querySelector('.css-video').style.animation = `css-movie ${cssVideoAnimationLength}s steps(1, end)`;
};

const setFrameRateFromVideoTrack = track => framerate = track.getSettings().frameRate;

const getVideoTrack = async (src) => {
    //TODO introduce video upload?
    const video = document.querySelector("#playback-video");
    video.crossOrigin = "anonymous";
    video.src = src;
    document.body.append(video);
    await video.play();
    const [track] = video.captureStream().getVideoTracks();
    video.onended = () => track.stop();
    return track;
};

const extractFrames = async (src,videoScalingFactor) => {
    const track = await getVideoTrack(src);

    setFrameRateFromVideoTrack(track);

    const processor = new MediaStreamTrackProcessor(track);
    const reader = processor.readable.getReader();

    await readAndProcessFrames(reader,videoScalingFactor);

    //TODO reduce framerate beforehands -> this is imperformant as hell
    const usableKeyFrameAmount = reduceFrameRateForKeyFrames();
    keyFrameListToStyleDeclaration(usableKeyFrameAmount);

    animateKeyFrames();
};

