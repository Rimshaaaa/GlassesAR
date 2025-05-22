import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

const GlassesTryOn = () => {
  const videoRef = useRef(null);
  const glassesRef = useRef(null);

  useEffect(() => {
    try {
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({ alpha: true });
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

          console.log("Glasses model loaded:", glassesRef.current);

          // glassesModel.traverse((child) => {
          //   if (child.isMesh) {
          //     child.material = new THREE.MeshStandardMaterial({
          //       color: 0xffffff,
          //       metalness: 0.7,
          //       roughness: 0.7,
          //     });
          //   }
          // });

          
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
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
          console.warn("No face detected");
          if (glassesRef.current) glassesRef.current.visible = false; //Hideee glasses if no 
          return;
        }

        if (!glassesRef.current) {
          console.warn("Glasses model not loaded yet");
          return;
        }

        console.log("FaceMesh detected landmarks:", results.multiFaceLandmarks);

        const landmarks = results.multiFaceLandmarks[0];

        if (landmarks[33] && landmarks[263] && landmarks[168]) {
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const noseBridge = landmarks[168];

          //Properaxis movement
          const mapToScreen = (landmark) => ({
            x: (landmark.x - 0.5) * window.innerWidth,
            y: (0.5 - landmark.y) * window.innerHeight, 
            z: -landmark.z * 3,
          });

          const leftEyeScreen = mapToScreen(leftEye);
          const rightEyeScreen = mapToScreen(rightEye);
          const noseBridgeScreen = mapToScreen(noseBridge);

          //this function will Calculate new midpoint scale and rotation for my model
          const newMidPoint = {
            x: (leftEyeScreen.x + rightEyeScreen.x) / 2 / window.innerWidth * 4,
            y: (leftEyeScreen.y + rightEyeScreen.y) / 2 / window.innerHeight * 4,
            z: (leftEyeScreen.z + rightEyeScreen.z + noseBridgeScreen.z) / 3,
          };

          const eyeDistance = Math.sqrt(
            Math.pow(rightEyeScreen.x - leftEyeScreen.x, 2) +
            Math.pow(rightEyeScreen.y - leftEyeScreen.y, 2)
          );
          const newScale = eyeDistance / 100;
          const newRotation = -Math.atan2(rightEyeScreen.y - leftEyeScreen.y, rightEyeScreen.x - leftEyeScreen.x);

          // Apply Smoothing..
          smoothedMidPoint = {
            x: smoothedMidPoint.x * (1 - smoothingFactor) + newMidPoint.x * smoothingFactor,
            y: smoothedMidPoint.y * (1 - smoothingFactor) + newMidPoint.y * smoothingFactor,
            z: smoothedMidPoint.z * (1 - smoothingFactor) + newMidPoint.z * smoothingFactor,
          };

          smoothedScale = smoothedScale * (1 - smoothingFactor) + newScale * smoothingFactor;
          smoothedRotation = smoothedRotation * (1 - smoothingFactor) + newRotation * smoothingFactor;

          
          glassesRef.current.visible = true; 
          glassesRef.current.scale.set(smoothedScale, smoothedScale, 1);
          glassesRef.current.position.set(
            -smoothedMidPoint.x,
            smoothedMidPoint.y, 
            smoothedMidPoint.z
          );
          glassesRef.current.rotation.set(0, 0, smoothedRotation);

          console.log("Glasses updated: ", glassesRef.current.position);
        }
      });

      
      const videoElement = videoRef.current;
      const cameraUtils = new Camera(videoElement, {
        onFrame: async () => {
          await faceMesh.send({ image: videoElement });
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

      return () => {
        console.log("Cleanup");
        renderer.dispose();
        document.body.removeChild(renderer.domElement);
      };

    } catch (error) {
      console.error("An error occurred in useEffect:", error);
    }
  }, []);

  return (
    <div>
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
    </div>
  );
};

export default GlassesTryOn;