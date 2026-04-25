import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { updateRisk } from "../utils/updateRisk";


export function MediaProctor({ session, submitted, sendEvent, onWarning }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const runningRef = useRef(false);

  const [status, setStatus] = useState("Initializing...");
  const [score, setScore] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);

  useEffect(() => {
    if (!session || submitted) return;

    runningRef.current = true;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;
        startNoiseDetection(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current.play();

            // 🔥 Load models
            await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
            await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

            startDetection();
          };
        }
      } catch (err) {
        onWarning("media", "Camera/Mic blocked", "Allow camera access");
      }
    };

    const startDetection = () => {
      const run = async () => {
        if (!runningRef.current) return;

        if (!videoRef.current || videoRef.current.readyState !== 4) {
          requestAnimationFrame(run);
          return;
        }

        let newStatus = "Face Detected ✅";

        try {
          const detections = await faceapi
            .detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks();

          if (detections.length === 0) {
            newStatus = "No Face ❌";
            onWarning("face", "No face detected", "Stay visible");
            sendEvent("no_face", {});
          } else if (detections.length > 1) {
            newStatus = "Multiple Faces ⚠️";
            onWarning("face", "Multiple faces detected", "Only one allowed");
            sendEvent("multiple_faces", { count: detections.length });
          } else {
            const landmarks = detections[0].landmarks;

            const mouth = landmarks.getMouth();
            const mouthOpen = Math.abs(mouth[14].y - mouth[18].y);

            if (mouthOpen > 10) {
              newStatus = "Talking 🗣️";
            }
          }
        } catch (err) {
          newStatus = "Detection Error ❌";
        }

        setStatus(newStatus);
        setScore(updateRisk(newStatus));

        setTimeout(() => requestAnimationFrame(run), 400);
      };

      run();
    };
    const startNoiseDetection = (stream) => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const mic = audioContext.createMediaStreamSource(stream);

      mic.connect(analyser);

      analyser.fftSize = 512;
      const data = new Uint8Array(analyser.fftSize);

      const checkNoise = () => {
        if (!runningRef.current) return;

        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const val = (data[i] - 128) / 128;
          sum += val * val;
        }

        const rms = Math.sqrt(sum / data.length);
        const percent = Math.min(100, Math.round(rms * 200));

        setNoiseLevel(percent);

        if (percent > 40) {
          onWarning("noise", "High noise detected", "Reduce background noise");
          sendEvent("high_noise", { level: percent });
        }

        requestAnimationFrame(checkNoise);
      };

      checkNoise();
    };

    startMedia();

    return () => {
      runningRef.current = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [session, submitted]);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-3">
      <h3 className="text-white text-sm mb-2">Live Monitoring</h3>

      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full rounded-lg"
      />

      <div className="text-xs text-gray-300 mt-2">
        {status} <br />
        Risk Score: {score} <br />
        Noise: {noiseLevel}%
      </div>
    </div>
  );
}