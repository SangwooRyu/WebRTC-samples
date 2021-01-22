import React, { useEffect, useState, useRef } from 'react';
import './OwnMedia.css';
import "antd/dist/antd.css";
import { Cascader, Button } from 'antd';

function OwnMedia() {
  const userVideo = useRef();
  const remoteVideo = useRef();
  
  const [isCalling, setCalling] = useState(false);

  const [audioSources, setAudioSources] = useState([]);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [videoSources, setVideoSources] = useState([]);

  const [currentAudioSource, setCurrentAudioSource] = useState('');
  const [currentAudioOutput, setCurrentAudioOutput] = useState('');
  const [currentVideoSource, setCurrentVideo] = useState('');

  let UserVideo, RemoteVideo;

  UserVideo = (<video className="local-video" ref={userVideo} playsInline autoPlay muted/>);
  RemoteVideo = (<video className="remote-video" ref={remoteVideo} playsInline autoPlay muted/>);

  let pc1, pc2;
  const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  };

  function getName(pc) {
    return (pc === pc1) ? 'pc1' : 'pc2';
  }
  
  function getOtherPc(pc) {
    return (pc === pc1) ? pc2 : pc1;
  }

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
    if(userVideo.current){
      userVideo.current.srcObject = stream;
    }
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

  async function call(){
    let localStream = window.stream;
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();

    if (videoTracks.length > 0) {
      console.log(`Using video device: ${videoTracks[0].label}`);
    }
    if (audioTracks.length > 0) {
      console.log(`Using audio device: ${audioTracks[0].label}`);
    }
    const configuration = {};
    console.log('RTCPeerConnection configuration:', configuration);

    pc1 = new RTCPeerConnection(configuration);
    console.log('Created local peer connection object pc1');
    pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
    pc2 = new RTCPeerConnection(configuration);
    console.log('Created remote peer connection object pc2');
    pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
    pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));
    pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e));
    pc2.addEventListener('track', gotRemoteStream);
  
    localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
    console.log('Added local stream to pc1');

    try {
      console.log('pc1 createOffer start');
      const offer = await pc1.createOffer(offerOptions);
      await onCreateOfferSuccess(offer);
      setCalling(true);
    } catch (e) {
      onCreateSessionDescriptionError(e);
    }
  }

  function hangup(){
    console.log('Ending call');
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
    setCalling(false);
  }

  function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
  }
  
  async function onCreateOfferSuccess(desc) {
    console.log(`Offer from pc1\n${desc.sdp}`);
    console.log('pc1 setLocalDescription start');
    try {
      await pc1.setLocalDescription(desc);
      onSetLocalSuccess(pc1);
    } catch (e) {
      onSetSessionDescriptionError();
    }
  
    console.log('pc2 setRemoteDescription start');
    try {
      await pc2.setRemoteDescription(desc);
      onSetRemoteSuccess(pc2);
    } catch (e) {
      onSetSessionDescriptionError();
    }
  
    console.log('pc2 createAnswer start');
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    try {
      const answer = await pc2.createAnswer();
      await onCreateAnswerSuccess(answer);
    } catch (e) {
      onCreateSessionDescriptionError(e);
    }
  }
  
  function onSetLocalSuccess(pc) {
    console.log(`${getName(pc)} setLocalDescription complete`);
  }
  
  function onSetRemoteSuccess(pc) {
    console.log(`${getName(pc)} setRemoteDescription complete`);
  }
  
  function onSetSessionDescriptionError(error) {
    console.log(`Failed to set session description: ${error.toString()}`);
  }

  function gotRemoteStream(e) {
    if (remoteVideo.current.srcObject !== e.streams[0]) {
      remoteVideo.current.srcObject = e.streams[0];
      console.log('pc2 received remote stream');
    }
  }

  async function onCreateAnswerSuccess(desc) {
    console.log(`Answer from pc2:\n${desc.sdp}`);
    console.log('pc2 setLocalDescription start');
    try {
      await pc2.setLocalDescription(desc);
      onSetLocalSuccess(pc2);
    } catch (e) {
      onSetSessionDescriptionError(e);
    }
    console.log('pc1 setRemoteDescription start');
    try {
      await pc1.setRemoteDescription(desc);
      onSetRemoteSuccess(pc1);
    } catch (e) {
      onSetSessionDescriptionError(e);
    }
  }

  async function onIceCandidate(pc, event) {
    try {
      await (getOtherPc(pc).addIceCandidate(event.candidate));
      onAddIceCandidateSuccess(pc);
    } catch (e) {
      onAddIceCandidateError(pc, e);
    }
    console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
  }

  function onAddIceCandidateSuccess(pc) {
    console.log(`${getName(pc)} addIceCandidate success`);
  }
  
  function onAddIceCandidateError(pc, error) {
    console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
  }

  function onIceStateChange(pc, event) {
    if (pc) {
      console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
      console.log('ICE state change event: ', event);
    }
  }

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

    start();
  }, []);

  return (
    <>
      <div className="videoContent">
        {UserVideo}
        {RemoteVideo}
      </div>
      <div className="button-container">
        <Button className="control-button" type="primary" onClick={call} disabled={isCalling? true : false}> Call </Button>
        <Button className="control-button" type="primary" onClick={hangup} disabled={isCalling? false : true}> Hang Up </Button>
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