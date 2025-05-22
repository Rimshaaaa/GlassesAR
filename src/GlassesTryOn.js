import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export const GlassesTryOn = () => {
  const videoRef = useRef(null);
  const glassesRef = useRef(null);

  useEffect(() => {
    let renderer, cameraUtils;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 5);

      renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      document.body.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1));
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);

      const loader = new GLTFLoader();
      let glassesModel = null;

      loader.load('/models/newglasses/scene.gltf',
        (gltf) => {
          glassesModel = gltf.scene;
          glassesRef.current = glassesModel;
          scene.add(glassesModel);
          glassesRef.current.visible = false;
        },
        undefined,
        (error) => console.error("Error loading glasses model:", error)
      );

      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      let smoothedMidPoint = { x: 0, y: 0, z: 0 };
      let smoothedScale = 1;
      let smoothedRotation = 0;
      const smoothingFactor = 0.4;

      faceMesh.onResults((results) => {
        if (!results.multiFaceLandmarks?.length || !glassesRef.current) {
          if (glassesRef.current) glassesRef.current.visible = false;
          return;
        }

        const [landmarks] = results.multiFaceLandmarks;
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseBridge = landmarks[168];

        const mapToScreen = (landmark) => ({
          x: (landmark.x - 0.5) * window.innerWidth,
          y: (0.5 - landmark.y) * window.innerHeight,
          z: -landmark.z * 3,
        });

        const left = mapToScreen(leftEye);
        const right = mapToScreen(rightEye);
        const nose = mapToScreen(noseBridge);

        const newMid = {
          x: (left.x + right.x) / 2 / window.innerWidth * 4,
          y: (left.y + right.y) / 2 / window.innerHeight * 4,
          z: (left.z + right.z + nose.z) / 3,
        };

        const distance = Math.sqrt((right.x - left.x) ** 2 + (right.y - left.y) ** 2);
        const newScale = distance / 100;
        const newRotation = -Math.atan2(right.y - left.y, right.x - left.x);

        smoothedMidPoint = {
          x: smoothedMidPoint.x * (1 - smoothingFactor) + newMid.x * smoothingFactor,
          y: smoothedMidPoint.y * (1 - smoothingFactor) + newMid.y * smoothingFactor,
          z: smoothedMidPoint.z * (1 - smoothingFactor) + newMid.z * smoothingFactor,
        };

        smoothedScale = smoothedScale * (1 - smoothingFactor) + newScale * smoothingFactor;
        smoothedRotation = smoothedRotation * (1 - smoothingFactor) + newRotation * smoothingFactor;

        glassesRef.current.visible = true;
        glassesRef.current.scale.set(smoothedScale, smoothedScale, 1);
        glassesRef.current.position.set(-smoothedMidPoint.x, smoothedMidPoint.y, smoothedMidPoint.z);
        glassesRef.current.rotation.set(0, 0, smoothedRotation);
      });

      const video = videoRef.current;
      cameraUtils = new Camera(video, {
        onFrame: async () => {
          await faceMesh.send({ image: video });
        },
        width: 640,
        height: 480,
      });

      cameraUtils.start();

      function animate() {
        requestAnimationFrame(animate);
        if (glassesRef.current) {
          renderer.render(scene, camera);
        }
      }

      animate();
    } catch (err) {
      console.error("Error initializing GlassesTryOn:", err);
    }

    return () => {
      console.log("Cleanup");
      renderer?.dispose();
      document.body.removeChild(renderer?.domElement);
      cameraUtils?.stop();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      style={{
        position: 'absolute',
        transform: 'scaleX(-1)',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: -1,
      }}
      autoPlay
      muted
      playsInline
    ></video>
  );
};

export default GlassesTryOn;
