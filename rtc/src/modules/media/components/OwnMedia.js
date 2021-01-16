import React, { useEffect, useState, useRef } from 'react';
import './OwnMedia.css';
import "antd/dist/antd.css";
import { Cascader } from 'antd';

function OwnMedia() {
  const userVideo = useRef();

  const [audioSources, setAudioSources] = useState([]);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [videoSources, setVideoSources] = useState([]);

  const [currentAudioSource, setCurrentAudioSource] = useState('');
  const [currentAudioOutput, setCurrentAudioOutput] = useState('');
  const [currentVideoSource, setCurrentVideo] = useState('');

  let UserVideo;

  UserVideo = (<video ref={userVideo} playsInline muted autoPlay />);

  function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.

    let temp_audioSources = [];
    let temp_audioOutputs = [];
    let temp_videoSources = [];

    for (let i = 0; i !== deviceInfos.length; ++i) {
      const deviceInfo = deviceInfos[i];
      let option = {};
      option.value = deviceInfo.deviceId;
      if (deviceInfo.kind === 'audioinput') {
        option.label = deviceInfo.label || `microphone ${temp_audioSources.length + 1}`;
        temp_audioSources.push(option);
      } else if (deviceInfo.kind === 'audiooutput') {
        option.label= deviceInfo.label || `speaker ${temp_audioOutputs.length + 1}`;
        temp_audioOutputs.push(option);
      } else if (deviceInfo.kind === 'videoinput') {
        option.label = deviceInfo.label || `camera ${temp_videoSources.length + 1}`;
        temp_videoSources.push(option);
      } else {
        console.log('Some other kind of source/device: ', deviceInfo);
      }
    }

    setAudioSources(temp_audioSources);
    setAudioOutputs(temp_audioOutputs);
    setVideoSources(temp_videoSources);
  }

  function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
      element.setSinkId(sinkId)
          .then(() => {
            console.log(`Success, audio output device attached: ${sinkId}`);
          })
          .catch(error => {
            let errorMessage = error;
            if (error.name === 'SecurityError') {
              errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
            }
            console.error(errorMessage);
            // Jump back to first output device in the list as it's the default.
            //audioOutput.current.selectedIndex = 0;
          });
    } else {
      console.warn('Browser does not support output device selection.');
    }
  }

  function gotStream(stream) {
    window.stream = stream; // make stream available to console
    if(userVideo.current)
      userVideo.current.srcObject = stream;
    // Refresh button list in case labels have become available
    return navigator.mediaDevices.enumerateDevices();
  }

  function handleError(error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
  }

  function audioOutputChange(value, selectedOptions) {
    setCurrentAudioOutput(value);
    attachSinkId(userVideo.current, value);
  }

  function audioSourceChange(value, selectedOptions) {
    if (window.stream) {
      window.stream.getTracks().forEach(track => {
        track.stop();
      });
    }

    setCurrentAudioSource(value);
    const audioSo = value;
    const videoSo = currentVideoSource;
    const constraints = {
      audio: {deviceId: audioSo ? {exact: audioSo} : undefined},
      video: {deviceId: videoSo ? {exact: videoSo} : undefined}
    };
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
  }

  function videoSourceChange(value, selectedOptions) {
    if (window.stream) {
      window.stream.getTracks().forEach(track => {
        track.stop();
      });
    }

    setCurrentVideo(value);
    const audioSo = currentAudioSource;
    const videoSo = value;
    const constraints = {
      audio: {deviceId: audioSo ? {exact: audioSo} : undefined},
      video: {deviceId: videoSo ? {exact: videoSo} : undefined}
    };
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
  }

  function start() {
    if (window.stream) {
      window.stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    const audioSo = currentAudioSource;
    const videoSo = currentVideoSource;
    const constraints = {
      audio: {deviceId: audioSo ? {exact: audioSo} : undefined},
      video: {deviceId: videoSo ? {exact: videoSo} : undefined}
    };
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
  }

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

    start();
  }, []);

  return (
    <>
      <div className="videoContent">
        {UserVideo}
      </div>
      <div>
        <div>
          <label>Audio Input Source: </label>
          { audioSources.length !== 0 ? <Cascader options={audioSources} onChange={audioSourceChange} placeholder="Please select"/> : null}
        </div>
        <div>
          <label>Audio Output Destination: </label>
          { audioOutputs.length !== 0 ? <Cascader options={audioOutputs} onChange={audioOutputChange} placeholder="Please select"/> : null}
        </div>
        <div>
          <label> Video Source: </label>
          { videoSources.length !== 0 ? <Cascader options={videoSources} onChange={videoSourceChange} placeholder="Please select"/> : null}
        </div>
      </div>
    </>
  );
}

export default OwnMedia;