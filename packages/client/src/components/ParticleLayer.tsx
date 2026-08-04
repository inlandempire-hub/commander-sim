import { useEffect, useRef } from "react";
import {
  mergeParticles,
  particleAlpha,
  spawnBurst,
  stepParticles,
  withAlpha,
  type Burst,
  type Particle,
} from "../particles.js";
import { setParticleSink } from "../particleBus.js";

/**
 * One canvas, one animation loop, every particle on the table.
 *
 * The rest of this client animates in CSS on purpose - see the long note in
 * CardView - and this is the deliberate exception. A hundred specks as DOM
 * nodes would be a hundred elements the browser lays out and composites every
 * frame, each with its own keyframes; as canvas draws they are a hundred
 * fillRect calls into one element that the layout engine never looks at again.
 *
 * The same caveat applies here as everywhere else, though, and it is why
 * nothing important lives in this file: a tab that isn't compositing issues no
 * animation frames, so this loop simply never runs there. Every burst is
 * decoration on top of something already legible - the mana total, the damage
 * number, the card in the graveyard - so a table with no particles at all is
 * still a table you can play on.
 *
 * The particles themselves live in a ref rather than in state. They change
 * sixty times a second and nothing else in the tree needs to know: putting them
 * in state would re-render the entire table on every frame to move some dots.
 */
export function ParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef(0);
  const lastFrameAt = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    /*
     * The canvas is sized in device pixels and then scaled back down, so a
     * 2px speck is 2 CSS pixels on every screen instead of a soft blob on a
     * high-DPI one. Capped at 2: beyond that the extra pixels cost real time
     * and buy nothing on a dot this small.
     */
    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      /*
       * Two passes rather than switching blend mode per particle. Additive
       * blending is what makes overlapping motes brighten into a glow instead
       * of flatly covering each other, which is right for mana and sparks and
       * badly wrong for ash - dark specks drawn additively wash out to grey
       * against a dark table and a creature dying ends up looking like a
       * firework.
       */
      for (const additive of [false, true]) {
        context.globalCompositeOperation = additive ? "lighter" : "source-over";
        for (const p of particles.current) {
          if (p.additive !== additive) continue;
          const alpha = particleAlpha(p);
          if (alpha <= 0) continue;
          context.fillStyle = withAlpha(p.color, alpha);
          context.beginPath();
          context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      const elapsed = now - lastFrameAt.current;
      lastFrameAt.current = now;
      particles.current = stepParticles(particles.current, elapsed);
      draw();
      if (particles.current.length > 0) {
        frame.current = window.requestAnimationFrame(tick);
      } else {
        // Nothing left to move: stop asking for frames entirely rather than
        // spinning a loop that clears an already-empty canvas sixty times a
        // second for the rest of the game.
        frame.current = 0;
      }
    };

    setParticleSink((burst: Burst) => {
      particles.current = mergeParticles(particles.current, spawnBurst(burst));
      if (frame.current === 0) {
        lastFrameAt.current = performance.now();
        frame.current = window.requestAnimationFrame(tick);
      }
    });

    return () => {
      setParticleSink(null);
      if (frame.current !== 0) window.cancelAnimationFrame(frame.current);
      frame.current = 0;
      particles.current = [];
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="particle-layer" ref={canvasRef} aria-hidden="true" />;
}
