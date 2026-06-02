"use client";

import { useEffect, useRef } from "react";

export default function VantaTopologyBackground({ backgroundColor = 0xf9eeff, className = "", color = 0xa268e6 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let effect = null;
    let isCancelled = false;

    async function initializeVanta() {
      if (!containerRef.current) return;

      const THREE = await import("three");
      const p5Module = await import("p5");
      const p5 = p5Module.default || p5Module;

      window.THREE = THREE;
      window.p5 = p5;

      const topologyModule = await import("vanta/dist/vanta.topology.min");
      const TOPOLOGY = topologyModule.default || topologyModule;

      if (isCancelled || !containerRef.current) return;

      effect = TOPOLOGY({
        el: containerRef.current,
        THREE,
        p5,
        color,
        backgroundColor,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
      });
    }

    initializeVanta();

    return () => {
      isCancelled = true;
      if (effect?.destroy) {
        effect.destroy();
      }
    };
  }, [backgroundColor, color]);

  return <div aria-hidden="true" className={`vanta-topology-background ${className}`} ref={containerRef} />;
}
