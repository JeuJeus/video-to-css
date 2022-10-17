# video-to-css
This is a hack just to proof something like this is possible.  

## What the hack is this even?
You are seeing Video-Playback in CSS only!  
In order to make this happen, we have to jump trough some hoops together.  
When clicking the Button, the Videoplayback is started.  
Concurrently frames are extracted (in reduced resolution) and collected into a List.  
After the Videoplayback stops (to be changed into async processing), the frames are processed.  
Processing in this context means extracting the pixels color values and mapping them into CSS box-shadows - yes you heard that correctly!  
After the frame to css conversion, all frames are collected and mapped into keyframes.  
To playback the Animation a CSS animation containing the keyframes is added in.

## Requirements
Currently the functionality of extracting Frames is based on the _MediaStreamTrackProcessor_-API.  
**Therefore only recent Versions of Chromium based Browsers (>= v94) are supported!**

## Example Result
Input | Output
:-------------------------:|:-------------------------:
![Input](img/example-input.png)   |  ![Output](img/example-output.png)