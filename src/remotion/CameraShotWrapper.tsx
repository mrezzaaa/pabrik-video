import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CameraShot, Callout } from "../lib/types";
import { XRayWireframeScanner } from "./XRayWireframeScanner";

interface CameraShotWrapperProps {
  shot: CameraShot;
  durationInFrames: number;
  themeColor: string;
  callouts?: Callout[];
  children: React.ReactNode;
}

export const CameraShotWrapper: React.FC<CameraShotWrapperProps> = ({
  shot,
  durationInFrames,
  themeColor,
  callouts = [],
  children,
}) => {
  const frame = useCurrentFrame();

  switch (shot) {
    case "XRAY_WIREFRAME_SCAN": {
      return (
        <XRayWireframeScanner
          durationInFrames={durationInFrames}
          callouts={callouts}
          themeColor={themeColor}
          mode="XRAY_WIREFRAME_SCAN"
        >
          {children}
        </XRayWireframeScanner>
      );
    }

    case "BLUEPRINT_CAD_CALLOUT": {
      return (
        <XRayWireframeScanner
          durationInFrames={durationInFrames}
          callouts={callouts}
          themeColor={themeColor}
          mode="BLUEPRINT_CAD_CALLOUT"
        >
          {children}
        </XRayWireframeScanner>
      );
    }

    case "KEN_BURNS_ZOOM_IN": {
      const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.28], {
        extrapolateRight: "clamp",
      });
      const translateX = interpolate(frame, [0, durationInFrames], [0, -25], {
        extrapolateRight: "clamp",
      });
      const translateY = interpolate(frame, [0, durationInFrames], [0, -15], {
        extrapolateRight: "clamp",
      });

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            transformOrigin: "center center",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      );
    }

    case "KEN_BURNS_ZOOM_OUT": {
      const scale = interpolate(frame, [0, durationInFrames], [1.28, 1.0], {
        extrapolateRight: "clamp",
      });
      const translateX = interpolate(frame, [0, durationInFrames], [-20, 10], {
        extrapolateRight: "clamp",
      });

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${scale}) translate(${translateX}px, 0px)`,
            transformOrigin: "center center",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      );
    }

    case "PAN_LEFT_TO_RIGHT": {
      // Overscan to 130% width and pan horizontally
      const translateX = interpolate(
        frame,
        [0, durationInFrames],
        [-15, 0],
        { extrapolateRight: "clamp" }
      );

      return (
        <div
          style={{
            width: "130%",
            height: "100%",
            marginLeft: "-15%",
            transform: `translateX(${translateX}%)`,
            willChange: "transform",
          }}
        >
          {children}
        </div>
      );
    }

    case "3D_TILT_CARD": {
      const rotateY = interpolate(
        frame,
        [0, durationInFrames / 2, durationInFrames],
        [-7, 0, 7],
        { extrapolateRight: "clamp" }
      );
      const rotateX = interpolate(
        frame,
        [0, durationInFrames / 2, durationInFrames],
        [4, 0, -4],
        { extrapolateRight: "clamp" }
      );
      const scale = interpolate(frame, [0, durationInFrames], [1.02, 1.12], {
        extrapolateRight: "clamp",
      });

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            perspective: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transformStyle: "preserve-3d",
              willChange: "transform",
              boxShadow: `0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${themeColor}20`,
              border: `1px solid rgba(56, 189, 248, 0.35)`,
              position: "relative",
            }}
          >
            {/* Tech Corner Markers */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                color: themeColor,
                fontFamily: "monospace",
                fontSize: 14,
                zIndex: 5,
              }}
            >
              +
            </div>
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                color: themeColor,
                fontFamily: "monospace",
                fontSize: 14,
                zIndex: 5,
              }}
            >
              +
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                color: themeColor,
                fontFamily: "monospace",
                fontSize: 14,
                zIndex: 5,
              }}
            >
              +
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                color: themeColor,
                fontFamily: "monospace",
                fontSize: 14,
                zIndex: 5,
              }}
            >
              +
            </div>
            {children}
          </div>
        </div>
      );
    }

    case "PARALLAX_DEPTH": {
      const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.18], {
        extrapolateRight: "clamp",
      });

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {children}
          </div>

          {/* Vignette Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle, transparent 40%, rgba(7, 19, 36, 0.85) 95%)",
              pointerEvents: "none",
            }}
          />

          {/* Scanline grid texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px)",
              backgroundSize: "100% 6px",
              pointerEvents: "none",
            }}
          />
        </div>
      );
    }

    default:
      return (
        <XRayWireframeScanner
          durationInFrames={durationInFrames}
          callouts={callouts}
          themeColor={themeColor}
          mode="XRAY_WIREFRAME_SCAN"
        >
          {children}
        </XRayWireframeScanner>
      );
  }
};
