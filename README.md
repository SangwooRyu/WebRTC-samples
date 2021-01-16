# WebRTC-samples

I implemented WebRTC-samples from [Official Samples](https://webrtc.github.io/samples "Official WebRTC sample Link") using ReactJS

## Directory
- rtc

    Get available audio, video sources and audio output devices from `mediaDevices.enumerate Devices()` then set the source for `getUserMedia` using a `deviceId` constraint. To run this, run below command inside console.
    ```shell
        npm start
    ```
    You should add your ip with port in [Chrome Setting](chrome://flags/#unsafely-treat-insecure-origin-as-secure "Insecure Ip Setting") if you use insecure origin(http).