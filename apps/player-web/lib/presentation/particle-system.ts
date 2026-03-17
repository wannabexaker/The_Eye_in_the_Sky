/*
Purpose: renders lightweight reusable particle bursts with object pooling
Layer: frontend (player-web)
Uses: Pixi board renderer for wins, cascades, and bonus flashes
*/

import { Container, Graphics } from "pixi.js";

export type ParticleKind = "gold_dust" | "ash" | "spark" | "bonus";

type Particle = {
  node: Graphics;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  kind: ParticleKind;
};

type BurstOptions = {
  x: number;
  y: number;
  count: number;
  kind: ParticleKind;
  spread?: number;
  speed?: number;
  life?: number;
};

const paletteByKind: Record<ParticleKind, number[]> = {
  gold_dust: [0xf8edd9, 0xf0ca72, 0xd8a44c],
  ash: [0x6b6764, 0x8c7f73, 0xb3a28f],
  spark: [0xffefbc, 0xf5d27e, 0xf0a948],
  bonus: [0xf8edd9, 0xeed39b, 0xd69b43]
};

const shapeByKind: Record<ParticleKind, "circle" | "diamond" | "streak"> = {
  gold_dust: "circle",
  ash: "diamond",
  spark: "streak",
  bonus: "circle"
};

export class ParticleSystem {
  readonly container: Container;

  private readonly pool: Particle[];

  constructor(parent: Container, poolSize = 120) {
    this.container = new Container();
    this.pool = Array.from({ length: poolSize }, () => {
      const node = new Graphics();
      node.visible = false;
      this.container.addChild(node);

      return {
        node,
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        alpha: 0,
        rotation: 0,
        rotationSpeed: 0,
        kind: "gold_dust"
      };
    });

    parent.addChild(this.container);
  }

  /*
  Purpose: allocates pooled particles for a single burst
  Layer: frontend (player-web)
  Uses: board win/cascade/bonus events
  */
  spawnBurst({
    x,
    y,
    count,
    kind,
    spread = 42,
    speed = 1.8,
    life = 500
  }: BurstOptions) {
    let remaining = count;

    for (const particle of this.pool) {
      if (remaining <= 0) {
        break;
      }

      if (particle.active) {
        continue;
      }

      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.6 + Math.random() * 0.8);

      particle.active = true;
      particle.kind = kind;
      particle.x = x + (Math.random() - 0.5) * spread;
      particle.y = y + (Math.random() - 0.5) * spread;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity - 0.4;
      particle.life = life;
      particle.maxLife = life;
      particle.size = 3 + Math.random() * 5;
      particle.alpha = 0.85;
      particle.rotation = Math.random() * Math.PI * 2;
      particle.rotationSpeed = (Math.random() - 0.5) * 0.08;
      particle.node.visible = true;

      this.drawParticle(particle);
      remaining -= 1;
    }
  }

  /*
  Purpose: updates active particles each frame
  Layer: frontend (player-web)
  Uses: Pixi ticker loop
  */
  update(deltaMs: number) {
    const frameFactor = deltaMs / 16.6667;

    for (const particle of this.pool) {
      if (!particle.active) {
        continue;
      }

      particle.life -= deltaMs;

      if (particle.life <= 0) {
        particle.active = false;
        particle.node.visible = false;
        continue;
      }

      const progress = particle.life / particle.maxLife;

      particle.x += particle.vx * frameFactor;
      particle.y += particle.vy * frameFactor;
      particle.vy += 0.03 * frameFactor;
      particle.rotation += particle.rotationSpeed * frameFactor;
      particle.alpha = progress * 0.9;

      particle.node.x = particle.x;
      particle.node.y = particle.y;
      particle.node.rotation = particle.rotation;
      particle.node.alpha = particle.alpha;
      particle.node.scale.set(0.75 + progress * 0.35);
    }
  }

  private drawParticle(particle: Particle) {
    const node = particle.node;
    const palette = paletteByKind[particle.kind];
    const color = palette[Math.floor(Math.random() * palette.length)] ?? 0xf0ca72;
    const shape = shapeByKind[particle.kind];

    node.clear();

    if (shape === "circle") {
      node.circle(0, 0, particle.size).fill({ color, alpha: 0.85 });
      return;
    }

    if (shape === "diamond") {
      node.moveTo(0, -particle.size);
      node.lineTo(particle.size * 0.8, 0);
      node.lineTo(0, particle.size);
      node.lineTo(-particle.size * 0.8, 0);
      node.closePath();
      node.fill({ color, alpha: 0.72 });
      return;
    }

    node.roundRect(-particle.size * 0.4, -particle.size * 1.8, particle.size * 0.8, particle.size * 3.4, particle.size * 0.25);
    node.fill({ color, alpha: 0.8 });
  }
}
