/**
 * WebRTC Camera Service
 * Handles camera streaming using WebRTC peer connections for better stability
 */

export interface CameraConstraints {
  width: number;
  height: number;
  frameRate: number;
  facingMode?: string;
}

export interface CameraStream {
  id: string;
  name: string;
  stream: MediaStream;
  peerConnection: RTCPeerConnection;
  active: boolean;
}

class WebRTCCameraService {
  private cameras: Map<string, CameraStream> = new Map();
  private baseConstraints: CameraConstraints = {
    width: 640,
    height: 480,
    frameRate: 15
  };
  
  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  async initializeCamera(cameraId: string, cameraName: string, constraints?: Partial<CameraConstraints>): Promise<CameraStream> {
    try {
      const finalConstraints = { ...this.baseConstraints, ...constraints };
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: finalConstraints.width, max: finalConstraints.width },
          height: { ideal: finalConstraints.height, max: finalConstraints.height },
          frameRate: { ideal: finalConstraints.frameRate, max: finalConstraints.frameRate },
          facingMode: finalConstraints.facingMode || 'user'
        },
        audio: false
      });

      // Create WebRTC peer connection
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      // Add stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Camera ${cameraId} connection state: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'failed') {
          this.restartCamera(cameraId);
        }
      };

      // Handle ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`Camera ${cameraId} ICE state: ${peerConnection.iceConnectionState}`);
      };

      const cameraStream: CameraStream = {
        id: cameraId,
        name: cameraName,
        stream,
        peerConnection,
        active: true
      };

      this.cameras.set(cameraId, cameraStream);
      console.log(`WebRTC camera ${cameraName} initialized successfully`);
      
      return cameraStream;
    } catch (error) {
      console.error(`Failed to initialize WebRTC camera ${cameraName}:`, error);
      throw error;
    }
  }

  async createLocalOffer(cameraId: string): Promise<RTCSessionDescriptionInit | null> {
    const camera = this.cameras.get(cameraId);
    if (!camera) return null;

    try {
      const offer = await camera.peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true
      });
      
      await camera.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error(`Failed to create offer for camera ${cameraId}:`, error);
      return null;
    }
  }

  async handleRemoteAnswer(cameraId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) return;

    try {
      await camera.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error(`Failed to handle remote answer for camera ${cameraId}:`, error);
    }
  }

  getStream(cameraId: string): MediaStream | null {
    const camera = this.cameras.get(cameraId);
    return camera?.stream || null;
  }

  getPeerConnection(cameraId: string): RTCPeerConnection | null {
    const camera = this.cameras.get(cameraId);
    return camera?.peerConnection || null;
  }

  async adjustStreamQuality(cameraId: string, constraints: Partial<CameraConstraints>): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) return;

    try {
      const videoTrack = camera.stream.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints({
          width: constraints.width,
          height: constraints.height,
          frameRate: constraints.frameRate
        });
        console.log(`Adjusted quality for camera ${cameraId}:`, constraints);
      }
    } catch (error) {
      console.error(`Failed to adjust quality for camera ${cameraId}:`, error);
    }
  }

  async restartCamera(cameraId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) return;

    console.log(`Restarting WebRTC camera ${cameraId}...`);
    
    try {
      // Stop existing stream
      camera.stream.getTracks().forEach(track => track.stop());
      camera.peerConnection.close();
      
      // Wait before restart
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize
      await this.initializeCamera(camera.id, camera.name);
    } catch (error) {
      console.error(`Failed to restart camera ${cameraId}:`, error);
      this.stopCamera(cameraId);
    }
  }

  stopCamera(cameraId: string): void {
    const camera = this.cameras.get(cameraId);
    if (!camera) return;

    console.log(`Stopping WebRTC camera ${cameraId}`);
    
    // Stop all tracks
    camera.stream.getTracks().forEach(track => track.stop());
    
    // Close peer connection
    camera.peerConnection.close();
    
    // Remove from map
    this.cameras.delete(cameraId);
  }

  stopAllCameras(): void {
    console.log('Stopping all WebRTC cameras');
    this.cameras.forEach((_, cameraId) => {
      this.stopCamera(cameraId);
    });
  }

  getCameraStatus(cameraId: string): string {
    const camera = this.cameras.get(cameraId);
    if (!camera) return 'inactive';
    
    const connectionState = camera.peerConnection.connectionState;
    const iceState = camera.peerConnection.iceConnectionState;
    
    if (connectionState === 'connected' && iceState === 'connected') {
      return 'active';
    } else if (connectionState === 'connecting' || iceState === 'checking' || iceState === 'new') {
      return 'connecting';
    } else {
      return 'inactive';
    }
  }

  getAllCameras(): CameraStream[] {
    return Array.from(this.cameras.values());
  }

  // Monitor camera health
  startHealthMonitoring(): void {
    setInterval(() => {
      this.cameras.forEach((camera, cameraId) => {
        const videoTrack = camera.stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'ended') {
          console.warn(`Camera ${cameraId} track ended, restarting...`);
          this.restartCamera(cameraId);
        }
      });
    }, 10000); // Check every 10 seconds
  }
}

export default new WebRTCCameraService();
