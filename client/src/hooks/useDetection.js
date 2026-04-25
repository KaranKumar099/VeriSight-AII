import { useRef } from "react";
import * as faceapi from "face-api.js";
import { updateRisk } from "../utils/updateRisk.js";

export const useDetection = (videoRef, setStatus, setScore) => {
  const lastStatus = useRef("");

  // 🔥 for stability (avoid flickering)
  const multiFaceFrames = useRef(0);
  const noFaceFrames = useRef(0);

  const startDetection = () => {
    const run = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        requestAnimationFrame(run);
        return;
      }

      let newStatus = "Face Detected ✅";

      try {
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,   // better accuracy
              scoreThreshold: 0.5
            })
          )
          .withFaceLandmarks();

        const count = detections.length;

        // ✅ NO FACE (stable detection)
        if (count === 0) {
          noFaceFrames.current++;
          multiFaceFrames.current = 0;

          if (noFaceFrames.current > 3) {
            newStatus = "No Face ❌";
          }
        }

        // ✅ MULTIPLE FACES (stable detection)
        else if (count > 1) {
          multiFaceFrames.current++;
          noFaceFrames.current = 0;

          if (multiFaceFrames.current > 3) {
            newStatus = `Multiple Faces (${count}) ⚠️`;
          }
        }

        // ✅ SINGLE FACE (reset counters)
        else {
          multiFaceFrames.current = 0;
          noFaceFrames.current = 0;

          const landmarks = detections[0].landmarks;

          // 🗣️ Talking detection
          const mouth = landmarks.getMouth();
          const mouthOpen = Math.abs(mouth[14].y - mouth[18].y);

          // 👀 Eye direction
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          const avgX =
            [...leftEye, ...rightEye].reduce((sum, p) => sum + p.x, 0) /
            (leftEye.length + rightEye.length);

          const faceBox = detections[0].detection.box;
          const relativeX = avgX - faceBox.x;

          if (mouthOpen > 10) {
            newStatus = "Talking 🗣️";
          } else if (relativeX < faceBox.width * 0.35) {
            newStatus = "Looking Left 👀";
          } else if (relativeX > faceBox.width * 0.65) {
            newStatus = "Looking Right 👀";
          }
        }

      } catch (err) {
        newStatus = "Detection Error ❌";
      }

      // ✅ Update only if changed
      if (lastStatus.current !== newStatus) {
        lastStatus.current = newStatus;

        setStatus(newStatus);

        // 🔥 risk scoring
        const score = updateRisk(newStatus);
        setScore(score);
      }

      setTimeout(() => requestAnimationFrame(run), 300);
    };

    run();
  };

  return { startDetection };
};