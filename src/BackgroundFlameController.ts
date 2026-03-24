type FlameAnchorChangeDetail = {
  background: string;
  flamesEnabled: boolean;
  flameX?: number;
  flameY?: number;
  flameWidth?: number;
};

type FlameBurstDetail = {
  x: number;
  y: number;
  side: 'left' | 'right';
  imageSrc: string;
};

type FlameBurstSample = {
  x: number;
  y: number;
  alpha: number;
};

type FlameParticle = {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  hueShift: number;
  waveAmplitude: number;
  waveFrequency: number;
  wavePhase: number;
  maxRise: number;
  blockSkew: number;
  alphaScale?: number;
  burstDelay?: number;
};

const FLAME_ANCHOR_EVENT = 'background-flame-anchor-change';
const FLAME_BURST_EVENT = 'background-flame-burst';

export default class BackgroundFlameController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private viewportWidth = window.innerWidth;
  private viewportHeight = window.innerHeight;

  private anchorX = 0.2;
  private anchorY = 0.73;
  private anchorWidth = 0.02;
  private flamesEnabled = true;
  private hasAnchorData = false;

  private imageWidth = 1920;
  private imageHeight = 1080;
  private activeBackgroundUrl = '';

  private leftParticles: FlameParticle[] = [];
  private rightParticles: FlameParticle[] = [];

  private leftSpawnAccumulator = 0;
  private rightSpawnAccumulator = 0;
  private readonly leftSpawnRate = 82;
  private readonly rightSpawnRate = 74;

  private lastFrameTime = 0;
  private burstSampleCache: Map<string, Promise<FlameBurstSample[]>> = new Map();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'background-flames';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.canvas);

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create 2D context for background flame canvas.');
    }
    this.ctx = context;

    this.syncAnchorFromBodyData();
    this.setBackgroundFromComputedStyle();
    this.resize();

    window.addEventListener('resize', this.resize);
    document.body.addEventListener(FLAME_ANCHOR_EVENT, this.onAnchorChanged as EventListener);
    document.body.addEventListener(FLAME_BURST_EVENT, this.onFlameBurst as EventListener);

    window.requestAnimationFrame(this.tick);
  }

  private onAnchorChanged = (event: CustomEvent<FlameAnchorChangeDetail>): void => {
    const detail = event.detail;
    if (!detail) {
      return;
    }

    this.flamesEnabled = detail.flamesEnabled;

    if (typeof detail.flameX === 'number' && typeof detail.flameY === 'number' && typeof detail.flameWidth === 'number') {
      this.anchorX = this.normalize(detail.flameX, this.anchorX);
      this.anchorY = this.normalize(detail.flameY, this.anchorY);
      this.anchorWidth = Math.max(0.004, this.normalize(detail.flameWidth, this.anchorWidth));
      this.hasAnchorData = true;
      document.body.dataset.flameX = `${this.anchorX}`;
      document.body.dataset.flameY = `${this.anchorY}`;
      document.body.dataset.flameWidth = `${this.anchorWidth}`;
    } else {
      this.hasAnchorData = false;
      delete document.body.dataset.flameX;
      delete document.body.dataset.flameY;
      delete document.body.dataset.flameWidth;
      this.clearEmitterDatasets();
      this.leftParticles = [];
      this.rightParticles = [];
    }

    if (detail.background && detail.background !== this.activeBackgroundUrl) {
      void this.updateImageDimensions(detail.background);
    }
  };

  private resize = (): void => {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);

    this.canvas.width = Math.floor(this.viewportWidth * this.dpr);
    this.canvas.height = Math.floor(this.viewportHeight * this.dpr);
    this.canvas.style.width = `${this.viewportWidth}px`;
    this.canvas.style.height = `${this.viewportHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private onFlameBurst = (event: CustomEvent<FlameBurstDetail>): void => {
    const detail = event.detail;
    if (!detail || !this.flamesEnabled || !this.hasAnchorData) {
      return;
    }

    void this.spawnBurstFromIcon(detail);
  };

  private tick = (time: number): void => {
    if (!this.lastFrameTime) {
      this.lastFrameTime = time;
    }

    const deltaMs = Math.min(50, time - this.lastFrameTime);
    this.lastFrameTime = time;
    const delta = deltaMs / 1000;

    if (!this.flamesEnabled || !this.hasAnchorData) {
      this.clearEmitterDatasets();
      this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
      window.requestAnimationFrame(this.tick);
      return;
    }

    const emitters = this.getEmitterBases();
    this.syncEmitterDatasets(emitters);
    this.spawnParticles(delta, emitters.left, emitters.right);
    this.updateParticles(delta);
    this.renderParticles();

    window.requestAnimationFrame(this.tick);
  };

  private spawnParticles(delta: number, leftBase: { x: number; y: number }, rightBase: { x: number; y: number }): void {
    const widthDensity = Math.max(0.7, Math.min(2.2, this.anchorWidth / 0.02));
    this.leftSpawnAccumulator += delta * this.leftSpawnRate * widthDensity;
    this.rightSpawnAccumulator += delta * this.rightSpawnRate * widthDensity;

    while (this.leftSpawnAccumulator >= 1) {
      this.leftParticles.push(this.createParticle(leftBase, 1));
      this.leftSpawnAccumulator -= 1;
    }

    while (this.rightSpawnAccumulator >= 1) {
      this.rightParticles.push(this.createParticle(rightBase, -1));
      this.rightSpawnAccumulator -= 1;
    }
  }

  private createParticle(base: { x: number; y: number }, driftDirection: 1 | -1): FlameParticle {
    const scale = this.getCoverScale();
    const baseHalfWidth = Math.max(8, this.imageWidth * scale * this.anchorWidth * 0.5);
    const x = base.x + (Math.random() * 2 - 1) * baseHalfWidth;
    const y = base.y + (Math.random() * 2 - 1) * 2;
    const upward = 95 + Math.random() * 150;

    return {
      x,
      y,
      originX: x,
      originY: y,
      vx: driftDirection * (2 + Math.random() * 9) + (Math.random() * 2 - 1) * 5,
      vy: -(upward + Math.random() * 36),
      age: 0,
      life: 1.15 + Math.random() * 1.05,
      size: 6 + Math.random() * 9,
      hueShift: (Math.random() * 2 - 1) * 6,
      waveAmplitude: 2 + Math.random() * 6,
      waveFrequency: 6 + Math.random() * 8,
      wavePhase: Math.random() * Math.PI * 2,
      maxRise: 150 + Math.random() * 170,
      blockSkew: (Math.random() * 2 - 1) * 3,
    };
  }

  private createBurstParticle(sample: FlameBurstSample, detail: FlameBurstDetail): FlameParticle {
    const scale = this.getCoverScale();
    const flameBaseWidth = Math.max(16, this.imageWidth * scale * this.anchorWidth);
    const iconWidth = flameBaseWidth;
    const iconHeight = flameBaseWidth;
    const offsetX = (sample.x - 0.5) * iconWidth;
    const offsetY = (1 - sample.y) * iconHeight;
    const driftDirection = detail.side === 'left' ? 1 : -1;
    const burstDelay = (1 - sample.y) * 0.55;
    const activeLife = 1.95 + Math.random() * 1.2;

    return {
      x: detail.x + offsetX,
      y: detail.y - offsetY,
      originX: detail.x + offsetX,
      originY: detail.y - offsetY,
      vx: driftDirection * (5 + Math.random() * 10) + (Math.random() * 2 - 1) * 8,
      vy: -(95 + Math.random() * 80 + offsetY * 0.12),
      age: 0,
      life: burstDelay + activeLife,
      size: 2 + sample.alpha * 2.4,
      hueShift: (Math.random() * 2 - 1) * 4,
      waveAmplitude: 1 + Math.random() * 4,
      waveFrequency: 5 + Math.random() * 7,
      wavePhase: Math.random() * Math.PI * 2,
      maxRise: 165 + Math.random() * 145,
      blockSkew: (Math.random() * 2 - 1) * 2,
      alphaScale: 0.92 + sample.alpha * 0.38,
      burstDelay,
    };
  }

  private updateParticles(delta: number): void {
    this.leftParticles = this.updateParticleArray(this.leftParticles, delta, 0.8);
    this.rightParticles = this.updateParticleArray(this.rightParticles, delta, -0.8);
  }

  private updateParticleArray(particles: FlameParticle[], delta: number, windBias: number): FlameParticle[] {
    return particles.filter((particle) => {
      particle.age += delta;
      if (particle.age >= particle.life) {
        return false;
      }

      const burstDelay = particle.burstDelay ?? 0;
      if (particle.age < burstDelay) {
        return true;
      }

      particle.vx += windBias * delta * 3.2;
      particle.vx *= 0.993;
      particle.vy += 30 * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      return true;
    });
  }

  private renderParticles(): void {
    this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.ctx.globalCompositeOperation = 'lighter';

    this.drawParticleArray(this.leftParticles);
    this.drawParticleArray(this.rightParticles);

    this.ctx.globalCompositeOperation = 'source-over';
  }

  private drawParticleArray(particles: FlameParticle[]): void {
    for (const particle of particles) {
      const burstDelay = particle.burstDelay ?? 0;
      const effectiveAge = Math.max(0, particle.age - burstDelay);
      const activeLife = Math.max(0.001, particle.life - burstDelay);
      const lifeProgress = Math.min(1, effectiveAge / activeLife);
      const remaining = 1 - lifeProgress;
      const holdProgress = burstDelay > 0 ? Math.min(1, particle.age / burstDelay) : 1;
      const riseProgress = Math.max(0, Math.min(1, (particle.originY - particle.y) / particle.maxRise));
      const wave = Math.sin((particle.age * particle.waveFrequency) + particle.wavePhase)
        * particle.waveAmplitude
        * (0.25 + riseProgress * 1.1)
        * (particle.age > burstDelay ? 1 : 0.12);
      const drawX = particle.x + wave;
      const taper = 1 - (riseProgress * 0.5);
      const blockWidth = particle.size * (0.9 + remaining * 0.95) * Math.max(0.45, taper);
      const blockHeight = particle.size * (1.25 + remaining * 1.35) * Math.max(0.35, taper);
      const alphaByLife = Math.pow(remaining, 1.9);
      const alphaByTop = 1 - Math.pow(riseProgress, 1.5);
      const alphaByBase = 0.5 + Math.min(0.5, riseProgress * 2.4);
      const alphaDuringHold = 0.95 - (holdProgress * 0.08);
      const alpha = Math.max(
        0,
        (particle.age < burstDelay ? alphaDuringHold : alphaByLife * alphaByTop * alphaByBase)
        * (particle.alphaScale ?? 1),
      );

      const top = particle.y - blockHeight * 0.5;
      const left = drawX - blockWidth * 0.5 + particle.blockSkew * riseProgress;
      const gradient = this.ctx.createLinearGradient(0, top, 0, top + blockHeight);

      gradient.addColorStop(0, `hsla(${22 + particle.hueShift}, 98%, 46%, 0)`);
      gradient.addColorStop(0.2, `hsla(${14 + particle.hueShift}, 96%, 45%, ${alpha * 0.3})`);
      gradient.addColorStop(0.65, `hsla(${30 + particle.hueShift}, 100%, 56%, ${alpha * 0.9})`);
      gradient.addColorStop(1, `hsla(${48 + particle.hueShift}, 100%, 72%, ${alpha})`);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(left, top, blockWidth, blockHeight);

      this.ctx.fillStyle = `hsla(${54 + particle.hueShift}, 100%, 78%, ${alpha * 0.55})`;
      this.ctx.fillRect(left + blockWidth * 0.2, top + blockHeight * 0.52, blockWidth * 0.45, blockHeight * 0.3);
    }
  }

  private async spawnBurstFromIcon(detail: FlameBurstDetail): Promise<void> {
    const samples = await this.getBurstSamples(detail.imageSrc);
    if (!this.flamesEnabled || !this.hasAnchorData) {
      return;
    }

    const particles = samples.map((sample) => this.createBurstParticle(sample, detail));
    if (detail.side === 'left') {
      this.leftParticles.push(...particles);
      return;
    }
    this.rightParticles.push(...particles);
  }

  private getBurstSamples(imageSrc: string): Promise<FlameBurstSample[]> {
    const cached = this.burstSampleCache.get(imageSrc);
    if (cached) {
      return cached;
    }

    const promise = this.loadBurstSamples(imageSrc);
    this.burstSampleCache.set(imageSrc, promise);
    return promise;
  }

  private async loadBurstSamples(imageSrc: string): Promise<FlameBurstSample[]> {
    try {
      const image = await this.loadImageForBurst(imageSrc);
      const sampleCanvas = document.createElement('canvas');
      const sampleSize = 24;
      sampleCanvas.width = sampleSize;
      sampleCanvas.height = sampleSize;
      const sampleCtx = sampleCanvas.getContext('2d');
      if (!sampleCtx) {
        return this.createFallbackBurstSamples();
      }

      sampleCtx.clearRect(0, 0, sampleSize, sampleSize);
      sampleCtx.drawImage(image, 0, 0, sampleSize, sampleSize);
      const imageData = sampleCtx.getImageData(0, 0, sampleSize, sampleSize).data;
      const samples: FlameBurstSample[] = [];

      for (let y = 0; y < sampleSize; y += 1) {
        for (let x = 0; x < sampleSize; x += 1) {
          const index = ((y * sampleSize) + x) * 4;
          const alpha = imageData[index + 3] / 255;
          if (alpha < 0.12) {
            continue;
          }

          samples.push({
            x: x / (sampleSize - 1),
            y: y / (sampleSize - 1),
            alpha,
          });
        }
      }

      return samples.length > 0 ? samples : this.createFallbackBurstSamples();
    } catch {
      return this.createFallbackBurstSamples();
    }
  }

  private loadImageForBurst(imageSrc: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load burst image.'));
      image.src = imageSrc;
    });
  }

  private createFallbackBurstSamples(): FlameBurstSample[] {
    const samples: FlameBurstSample[] = [];
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        const distance = Math.abs(x - 5.5) + Math.abs(y - 6);
        if (distance > 6.8) {
          continue;
        }
        samples.push({
          x: x / 11,
          y: y / 11,
          alpha: 0.8,
        });
      }
    }
    return samples;
  }

  private getEmitterBases(): { left: { x: number; y: number }; right: { x: number; y: number } } {
    const scale = this.getCoverScale();
    const renderedWidth = this.imageWidth * scale;
    const renderedHeight = this.imageHeight * scale;
    const offsetX = (this.viewportWidth - renderedWidth) / 2;
    const offsetY = (this.viewportHeight - renderedHeight) / 2;

    const leftX = offsetX + renderedWidth * this.anchorX;
    const rightX = offsetX + renderedWidth * (1 - this.anchorX);
    const baseY = offsetY + renderedHeight * this.anchorY;

    return {
      left: { x: leftX, y: baseY },
      right: { x: rightX, y: baseY },
    };
  }

  private syncEmitterDatasets(emitters: { left: { x: number; y: number }; right: { x: number; y: number } }): void {
    document.body.dataset.flameLeftX = `${emitters.left.x}`;
    document.body.dataset.flameLeftY = `${emitters.left.y}`;
    document.body.dataset.flameRightX = `${emitters.right.x}`;
    document.body.dataset.flameRightY = `${emitters.right.y}`;
  }

  private clearEmitterDatasets(): void {
    delete document.body.dataset.flameLeftX;
    delete document.body.dataset.flameLeftY;
    delete document.body.dataset.flameRightX;
    delete document.body.dataset.flameRightY;
  }

  private getCoverScale(): number {
    return Math.max(
      this.viewportWidth / this.imageWidth,
      this.viewportHeight / this.imageHeight,
    );
  }

  private setBackgroundFromComputedStyle(): void {
    const image = getComputedStyle(document.body).backgroundImage;
    const match = image.match(/url\((['"]?)(.*?)\1\)/);
    if (match?.[2]) {
      void this.updateImageDimensions(match[2]);
    }
  }

  private async updateImageDimensions(backgroundUrl: string): Promise<void> {
    this.activeBackgroundUrl = backgroundUrl;

    const image = new Image();
    image.decoding = 'async';
    image.src = backgroundUrl;

    await new Promise<void>((resolve) => {
      image.onload = () => {
        this.imageWidth = image.naturalWidth || this.imageWidth;
        this.imageHeight = image.naturalHeight || this.imageHeight;
        resolve();
      };
      image.onerror = () => {
        resolve();
      };
    });
  }

  private syncAnchorFromBodyData(): void {
    this.flamesEnabled = document.body.dataset.flamesEnabled !== 'false';
    const { flameX, flameY, flameWidth } = document.body.dataset;
    const parsedX = typeof flameX === 'string' ? Number.parseFloat(flameX) : NaN;
    const parsedY = typeof flameY === 'string' ? Number.parseFloat(flameY) : NaN;
    const parsedWidth = typeof flameWidth === 'string' ? Number.parseFloat(flameWidth) : NaN;

    this.hasAnchorData = !Number.isNaN(parsedX) && !Number.isNaN(parsedY) && !Number.isNaN(parsedWidth);
    if (!this.hasAnchorData) {
      return;
    }

    this.anchorX = this.normalize(parsedX, this.anchorX);
    this.anchorY = this.normalize(parsedY, this.anchorY);
    this.anchorWidth = Math.max(0.004, this.normalize(parsedWidth, this.anchorWidth));
  }

  private normalize(value: string | number | undefined, fallback: number): number {
    const numeric = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (typeof numeric !== 'number' || Number.isNaN(numeric)) {
      return fallback;
    }
    return Math.max(0, Math.min(1, numeric));
  }
}