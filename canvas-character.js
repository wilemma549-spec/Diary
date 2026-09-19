/**
 * CanvasCharacterRenderer & Physics Engine
 * High-performance 60FPS Canvas 2D engine for Little Boy & Cat.
 * Now uses the cute Boy1-Boy4 PNG sprites provided by user (instead of procedural chibi that looked like a cockroach).
 */

const BOY_IMAGES = {};
let boyImagesLoaded = false;

// Comprehensive Full-Body Sprite Registry (Supporting 11+ distinct whole-body poses & expressions)
const SPRITE_CONFIG = {
  waiting: ['1789797335034.png', 'boy_waiting.png', 'boy1.png'],     // 全身抱膝坐等 (日常等待主人)
  wink: ['1789797335010.png', 'boy_wink.png'],                       // 全身眨眼比 V (俏皮鼓勵)
  cat: ['1789797335607.png', 'boy_cat.png'],                         // 全身抱小白貓 (安慰、心疼、陪伴)
  snack: ['1789797335057.png', 'boy_snack.png', 'boy3.png'],         // 全身吃零食 (慶祝、美食小獎勵)
  skateboard: ['1789797335467.png', 'boy_skateboard.png'],           // 全身滑板少年 (目標奮鬥、立志)
  urging: ['1789797335801.png', 'boy_urging.png'],                   // 全身插腰催促 (到時間、催主人做嘢)
  runaway: ['1789797335870.png', 'boy_runaway.png', 'boy4.png'],     // 全身奔跑走位 (敏捷逃跑、躲避點擊)
  celebrate: ['1789797335838.png', 'boy_celebrate.png', 'boy2.png'], // 全身大笑歡呼 (完成任務、慶祝)
  thinking: ['1789797335105.png', 'boy_thinking.png'],               // 全身托腮思考 (煩惱、迷惘抉擇)
  sleep: ['1789797335184.png', 'boy_sleep.png'],                     // 全身趴睡安眠 (深夜、晚安)
  study: ['1789797335732.png', 'boy_study.png']                      // 全身筆記日記 (學習、記錄)
};

function tryLoadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Filter out overview contact sheets (images wider than 380px that contain multiple small thumbnails)
      const isOverviewSheet = img.naturalWidth >= 380 && img.naturalHeight >= 360 && (img.src.includes('boy1') || img.src.includes('boy2') || img.src.includes('boy3') || img.src.includes('boy4')) && !img.src.includes('17897');
      if (isOverviewSheet) {
        console.warn('Rejected overview sheet:', src);
        resolve(null);
      } else {
        resolve(img);
      }
    };
    img.onerror = () => resolve(null);
    img.src = './' + src;
  });
}

async function loadBoyImages() {
  if (boyImagesLoaded) return;
  for (const [key, candidates] of Object.entries(SPRITE_CONFIG)) {
    for (const file of candidates) {
      const img = await tryLoadImage(file);
      if (img) {
        BOY_IMAGES[key] = img;
        break;
      }
    }
  }
  boyImagesLoaded = true;
  console.log('Loaded Full-Body Sprites:', Object.keys(BOY_IMAGES));
}

class DustParticle {
  constructor(x, y, vx, vy, color = 'rgba(215, 205, 192, 0.75)') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 4 + Math.random() * 6;
    this.color = color;
    this.life = 1.0;
    this.decay = 0.04 + Math.random() * 0.03;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.radius *= 0.96;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = -6 - Math.random() * 6;
    this.gravity = 0.25;
    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 12;
    this.width = 7 + Math.random() * 5;
    this.height = 5 + Math.random() * 4;
    const colors = ['#E67E51', '#5C82A6', '#529B77', '#F2C94C', '#EB5757', '#BB6BD9'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.life = 1.0;
    this.decay = 0.015;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rotation += this.rotSpeed;
    this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}

class BoyActor {
  constructor(id, x, y, isMain = true) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.targetX = x;
    this.targetY = y;
    this.isMain = isMain;
    this.width = 110;
    this.height = 130;
    
    // Animation states
    this.pose = 'sitting'; // sitting, standing, running, teasing, celebrating, snacking
    this.mood = 'calm'; // calm, waiting, urging, runaway, angry, happy
    this.outfit = 'hoodie'; // hoodie, rainy, school
    this.facing = 1; // 1 = right, -1 = left
    
    // Internal tickers
    this.blinkTimer = Math.random() * 180;
    this.isBlinking = false;
    this.bounceTick = Math.random() * 100;
    this.ahogeAngle = 0;
    this.ahogeVel = 0;

    // Speech bubble info
    this.quote = '';
    this.bubbleAlpha = 1.0;
  }

  setPoseAndMood(pose, mood, quote = null) {
    this.pose = pose;
    this.mood = mood;
    if (quote !== null) {
      this.quote = quote;
      this.bubbleAlpha = 1.0;
    }
  }

  impulse(burstX, burstY) {
    this.vx += burstX;
    this.vy += burstY;
    this.ahogeVel += burstX * 0.4;
  }

  update(bounds, particles) {
    this.bounceTick += 0.05;

    // Physics movement with damping
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.88;
    this.vy *= 0.88;

    // Stop micro velocities
    if (Math.abs(this.vx) < 0.1) this.vx = 0;
    if (Math.abs(this.vy) < 0.1) this.vy = 0;

    // Face direction based on velocity
    if (this.vx > 0.5) this.facing = 1;
    else if (this.vx < -0.5) this.facing = -1;

    // Ahoge spring physics
    const targetAhoge = -this.vx * 0.08;
    const force = (targetAhoge - this.ahogeAngle) * 0.2;
    this.ahogeVel = (this.ahogeVel + force) * 0.78;
    this.ahogeAngle += this.ahogeVel;

    // Bounds checking & bounce
    const halfW = this.width / 2;
    const pad = 12;
    if (this.x - halfW < pad) {
      this.x = pad + halfW;
      this.vx = Math.abs(this.vx) * 0.6;
    } else if (this.x + halfW > bounds.width - pad) {
      this.x = bounds.width - pad - halfW;
      this.vx = -Math.abs(this.vx) * 0.6;
    }

    if (this.y < pad + 30) {
      this.y = pad + 30;
      this.vy = Math.abs(this.vy) * 0.6;
    } else if (this.y + this.height > bounds.height - pad) {
      this.y = bounds.height - pad - this.height;
      this.vy = -Math.abs(this.vy) * 0.6;
    }

    // Blinking logic
    this.blinkTimer--;
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      if (this.blinkTimer <= -8) {
        this.isBlinking = false;
        this.blinkTimer = 140 + Math.random() * 160;
      }
    }
  }

    getSpriteKey() {
    // Rich Full-Body Pose & Emotion Resolver
    if (this.pose === 'runaway' || this.pose === 'running' || this.mood === 'runaway') return 'runaway';
    if (this.pose === 'cat' || this.mood === 'comfort' || (this.mood === 'calm' && this.pose === 'sitting')) {
      if (BOY_IMAGES['cat']) return 'cat';
    }
    if (this.pose === 'celebrating' || this.mood === 'happy') {
      if (BOY_IMAGES['celebrate']) return 'celebrate';
      if (BOY_IMAGES['wink']) return 'wink';
    }
    if (this.pose === 'snack' || this.pose === 'snacking') return 'snack';
    if (this.pose === 'skateboard' || this.pose === 'active') return 'skateboard';
    if (this.pose === 'thinking' || this.mood === 'thinking') return 'thinking';
    if (this.pose === 'sleep' || this.mood === 'sleepy') return 'sleep';
    if (this.pose === 'study' || this.pose === 'writing') return 'study';
    if (this.mood === 'urging' || this.mood === 'angry') return 'urging';
    if (this.pose === 'wink' || this.pose === 'teasing') return 'wink';
    if (this.pose === 'waiting' || this.pose === 'sitting') return 'waiting';
    return 'waiting';
  }

  draw(ctx, lookAtPoint) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    // Subtle breathing or bounce
    let breathY = 0;
    if (this.pose === 'sitting' || this.pose === 'standing') {
      breathY = Math.sin(this.bounceTick * 2) * 2;
    } else if (this.pose === 'celebrating') {
      breathY = -Math.abs(Math.sin(this.bounceTick * 8)) * 14;
    } else if (this.pose === 'running') {
      breathY = Math.sin(this.bounceTick * 12) * 4;
    }

    // Shadow
    ctx.fillStyle = 'rgba(215, 195, 178, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, this.height - 2, 36, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body container with breath
    ctx.translate(0, breathY);

    // High-Resolution Full-Body Character Rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const key = this.getSpriteKey();
    const img = BOY_IMAGES[key];

    if (img && img.complete && img.naturalWidth > 0) {
      // Full-body height: 165px, natural aspect ratio, grounded on shadow
      const targetH = 165;
      const scale = targetH / img.naturalHeight;
      const drawW = img.naturalWidth * scale;
      const drawH = targetH;
      ctx.drawImage(img, -drawW / 2, -drawH + 18, drawW, drawH);
    } else {
      // Fluid, animated 60FPS character with physics, blinking eyes, expressive mouth, and companion cat
      this.drawBody(ctx);
      this.drawHead(ctx, lookAtPoint);
      if (this.isMain && (this.pose === 'sitting' || this.mood === 'calm')) {
        this.drawCat(ctx);
      }
    }

    ctx.restore();

    // Draw speech bubble (in screen coordinates, not flipped by facing)
    if (this.quote) {
      this.drawSpeechBubble(ctx, breathY);
    }
  }

  drawBody(ctx) {
    const isRainy = this.outfit === 'rainy';
    const isSchool = this.outfit === 'school';

    const coatColor = isRainy ? '#F2C94C' : (isSchool ? '#3B4E6B' : '#F6EFE6');
    const coatStroke = '#3A281E';
    const jeanColor = isSchool ? '#2B374A' : '#6C8CA8';

    ctx.lineWidth = 2.4;
    ctx.strokeStyle = coatStroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.pose === 'sitting') {
      // Oversized hoodie sitting down hugging knees
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.moveTo(-24, 45);
      ctx.bezierCurveTo(-30, 65, -28, 88, -22, 94);
      ctx.bezierCurveTo(-10, 98, 10, 98, 22, 94);
      ctx.bezierCurveTo(28, 88, 30, 65, 24, 45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Folded legs in jeans
      ctx.fillStyle = jeanColor;
      ctx.beginPath();
      ctx.roundRect(-22, 84, 44, 14, 6);
      ctx.fill();
      ctx.stroke();

      // Arms hugging knees
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.arc(-16, 72, 8, 0, Math.PI * 2);
      ctx.arc(16, 72, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-16, 74);
      ctx.quadraticCurveTo(0, 82, 16, 74);
      ctx.lineWidth = 4.2;
      ctx.stroke();
      ctx.lineWidth = 2.4;

      // White sneakers
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-14, 98, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(14, 98, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else if (this.pose === 'running') {
      // Dynamic running torso
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.roundRect(-20, 42, 40, 40, 8);
      ctx.fill();
      ctx.stroke();

      // Running legs (stride)
      const legCycle = Math.sin(this.bounceTick * 12);
      ctx.strokeStyle = jeanColor;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-8, 78);
      ctx.lineTo(-18 - legCycle * 8, 98);
      ctx.moveTo(8, 78);
      ctx.lineTo(18 + legCycle * 8, 98);
      ctx.stroke();

      // Running shoes
      ctx.lineWidth = 2;
      ctx.strokeStyle = coatStroke;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-18 - legCycle * 8, 100, 7, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(18 + legCycle * 8, 100, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pumping arms
      ctx.strokeStyle = coatStroke;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-16, 52);
      ctx.lineTo(-26 + legCycle * 8, 64);
      ctx.moveTo(16, 52);
      ctx.lineTo(26 - legCycle * 8, 64);
      ctx.stroke();

    } else if (this.pose === 'celebrating') {
      // Jumping torso
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.roundRect(-22, 40, 44, 42, 8);
      ctx.fill();
      ctx.stroke();

      // Spread legs
      ctx.strokeStyle = jeanColor;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-10, 78);
      ctx.lineTo(-20, 96);
      ctx.moveTo(10, 78);
      ctx.lineTo(20, 96);
      ctx.stroke();

      // Shoes
      ctx.lineWidth = 2;
      ctx.strokeStyle = coatStroke;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-20, 98, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(20, 98, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Arms raised high in victory!
      ctx.strokeStyle = coatStroke;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-18, 48);
      ctx.quadraticCurveTo(-34, 30, -28, 18);
      ctx.moveTo(18, 48);
      ctx.quadraticCurveTo(34, 30, 28, 18);
      ctx.stroke();

    } else {
      // Default Standing / Pacing / Teasing
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.roundRect(-22, 42, 44, 42, 8);
      ctx.fill();
      ctx.stroke();

      // Legs
      ctx.strokeStyle = jeanColor;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-10, 80);
      ctx.lineTo(-10, 98);
      ctx.moveTo(10, 80);
      ctx.lineTo(10, 98);
      ctx.stroke();

      // Shoes
      ctx.lineWidth = 2;
      ctx.strokeStyle = coatStroke;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-10, 100, 7, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(10, 100, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Arms (hands on hips or teasing)
      ctx.strokeStyle = coatStroke;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      if (this.mood === 'urging' || this.mood === 'angry') {
        // Hands on hips, impatient
        ctx.moveTo(-18, 48);
        ctx.lineTo(-28, 62);
        ctx.lineTo(-18, 68);
        ctx.moveTo(18, 48);
        ctx.lineTo(28, 62);
        ctx.lineTo(18, 68);
      } else {
        ctx.moveTo(-18, 48);
        ctx.lineTo(-24, 66);
        ctx.moveTo(18, 48);
        ctx.lineTo(24, 66);
      }
      ctx.stroke();
    }
  }

  drawHead(ctx, lookAtPoint) {
    const headRadius = 26;
    const headCenterY = 24;

    // Skin Tone (#FDEDDC)
    ctx.fillStyle = '#FDEDDC';
    ctx.strokeStyle = '#3A281E';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Blush Cheeks
    ctx.fillStyle = 'rgba(248, 182, 154, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-14, headCenterY + 8, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(14, headCenterY + 8, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyeballs & Pupils
    let lookDx = 0;
    let lookDy = 0;
    if (lookAtPoint) {
      const dx = lookAtPoint.x - (this.x);
      const dy = lookAtPoint.y - (this.y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        lookDx = (dx / dist) * 2.2 * this.facing;
        lookDy = (dy / dist) * 1.8;
      }
    }

    if (this.isBlinking || this.mood === 'happy' || this.pose === 'celebrating') {
      // Closed happy crescent eyes (Boy2 Happy / Excited)
      ctx.strokeStyle = '#3A281E';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(-11, headCenterY + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(11, headCenterY + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (this.mood === 'teasing' || this.pose === 'teasing') {
      // Wink: left eye wink crescent, right eye open
      ctx.strokeStyle = '#3A281E';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(-11, headCenterY + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      ctx.fillStyle = '#3A281E';
      ctx.beginPath();
      ctx.arc(11 + lookDx, headCenterY + 2 + lookDy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(12 + lookDx, headCenterY + lookDy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Big, warm brown eyes (Chibi style from Boy1-Boy4)
      ctx.fillStyle = '#3A281E';
      ctx.beginPath();
      ctx.arc(-11 + lookDx, headCenterY + 2 + lookDy, 4.6, 0, Math.PI * 2);
      ctx.arc(11 + lookDx, headCenterY + 2 + lookDy, 4.6, 0, Math.PI * 2);
      ctx.fill();

      // White glint sparkles
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-10 + lookDx, headCenterY + lookDy, 1.8, 0, Math.PI * 2);
      ctx.arc(12 + lookDx, headCenterY + lookDy, 1.8, 0, Math.PI * 2);
      ctx.arc(-12 + lookDx, headCenterY + 3 + lookDy, 0.9, 0, Math.PI * 2);
      ctx.arc(10 + lookDx, headCenterY + 3 + lookDy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows
    ctx.strokeStyle = '#3A281E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.mood === 'urging' || this.mood === 'angry') {
      // Slanted angry / determined brows
      ctx.moveTo(-16, headCenterY - 6);
      ctx.lineTo(-7, headCenterY - 3);
      ctx.moveTo(16, headCenterY - 6);
      ctx.lineTo(7, headCenterY - 3);
    } else {
      // Soft curious brows
      ctx.moveTo(-16, headCenterY - 5);
      ctx.quadraticCurveTo(-11, headCenterY - 8, -6, headCenterY - 5);
      ctx.moveTo(6, headCenterY - 5);
      ctx.quadraticCurveTo(11, headCenterY - 8, 16, headCenterY - 5);
    }
    ctx.stroke();

    // Mouth
    ctx.beginPath();
    if (this.mood === 'happy' || this.pose === 'celebrating') {
      // Big happy open mouth
      ctx.fillStyle = '#D94841';
      ctx.arc(0, headCenterY + 8, 5, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (this.mood === 'teasing' || this.pose === 'teasing') {
      // Sticking tongue out!
      ctx.moveTo(-4, headCenterY + 8);
      ctx.quadraticCurveTo(0, headCenterY + 11, 4, headCenterY + 8);
      ctx.stroke();

      ctx.fillStyle = '#FF7582';
      ctx.beginPath();
      ctx.roundRect(-2.5, headCenterY + 9, 5, 6, 2);
      ctx.fill();
      ctx.stroke();
    } else if (this.mood === 'angry' || this.mood === 'urging') {
      // Small open shout mouth
      ctx.fillStyle = '#D94841';
      ctx.ellipse(0, headCenterY + 9, 3.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Small cute smile/neutral
      ctx.moveTo(-3.5, headCenterY + 8);
      ctx.quadraticCurveTo(0, headCenterY + 10, 3.5, headCenterY + 8);
      ctx.stroke();
    }

    // Hair - Rich fluffy brown hair (Boy1-Boy4 style)
    ctx.fillStyle = '#443022';
    ctx.beginPath();
    ctx.arc(0, headCenterY - 2, headRadius + 1.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.quadraticCurveTo(28, headCenterY + 8, 22, headCenterY + 18);
    ctx.quadraticCurveTo(12, headCenterY + 4, 8, headCenterY);
    ctx.quadraticCurveTo(2, headCenterY + 6, -2, headCenterY - 2);
    ctx.quadraticCurveTo(-8, headCenterY + 5, -14, headCenterY);
    ctx.quadraticCurveTo(-22, headCenterY + 6, -24, headCenterY + 18);
    ctx.quadraticCurveTo(-28, headCenterY + 6, -headRadius, headCenterY);
    ctx.closePath();
    ctx.fill();

    // Forehead bangs layers
    ctx.beginPath();
    ctx.moveTo(-20, headCenterY - 8);
    ctx.quadraticCurveTo(-8, headCenterY - 3, -4, headCenterY + 1);
    ctx.quadraticCurveTo(4, headCenterY - 4, 10, headCenterY + 2);
    ctx.quadraticCurveTo(16, headCenterY - 6, 22, headCenterY - 4);
    ctx.stroke();

    // Dynamic Springing Ahoge (呆毛)
    ctx.save();
    ctx.translate(0, headCenterY - headRadius - 1);
    ctx.rotate(this.ahogeAngle);
    ctx.strokeStyle = '#443022';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(6, -16, 14, -12);
    ctx.stroke();
    ctx.restore();
  }

  drawCat(ctx) {
    ctx.save();
    ctx.translate(-34, 88);
    // Cat body
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#3A281E';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 4, 11, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-3, -5);
    ctx.moveTo(3, -5);
    ctx.lineTo(10, -9);
    ctx.lineTo(7, -2);
    ctx.fill();
    ctx.stroke();

    // Sleeping eye slits
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4, 2, 2.2, 0, Math.PI);
    ctx.arc(4, 2, 2.2, 0, Math.PI);
    ctx.stroke();

    // Cat tail
    ctx.beginPath();
    ctx.moveTo(-10, 7);
    ctx.quadraticCurveTo(-18, 5, -16, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawSpeechBubble(ctx, breathY) {
    ctx.save();
    const bx = this.x;
    const by = this.y - 48 + breathY;

    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "PingFang HK", sans-serif';
    const textW = ctx.measureText(this.quote).width;
    const paddingX = 12;
    const bubbleW = textW + paddingX * 2;
    const bubbleH = 30;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2D7CB';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(44, 34, 30, 0.12)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Bubble box
    ctx.beginPath();
    ctx.roundRect(bx - bubbleW / 2, by - bubbleH / 2, bubbleW, bubbleH, 12);
    ctx.fill();
    ctx.stroke();

    // Pointer tail
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.moveTo(bx - 5, by + bubbleH / 2 - 1);
    ctx.lineTo(bx, by + bubbleH / 2 + 7);
    ctx.lineTo(bx + 5, by + bubbleH / 2 - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#2C221E';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.quote, bx, by);

    ctx.restore();
  }
}

class CanvasCharacterStage {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.boys = [];
    this.particles = [];
    this.confetti = [];
    this.lookTarget = null;
    this.running = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();

    // Spawn initial main boy
    this.mainBoy = new BoyActor('main', this.width / 2, this.height * 0.48, true);
    this.boys.push(this.mainBoy);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = Math.max(340, rect.height);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  bindEvents() {
    const handlePointer = (clientX, clientY, isTap = false) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.lookTarget = { x, y };

      if (isTap) {
        this.checkBoyClick(x, y);
      }
    };

    this.canvas.addEventListener('mousemove', (e) => handlePointer(e.clientX, e.clientY, false));
    this.canvas.addEventListener('click', (e) => handlePointer(e.clientX, e.clientY, true));

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY, false);
      }
    }, { passive: true });
  }

  checkBoyClick(x, y) {
    for (let boy of this.boys) {
      const dx = x - boy.x;
      const dy = y - (boy.y + boy.height * 0.45);
      if (Math.abs(dx) < 48 && Math.abs(dy) < 55) {
        // Trigger Engine callback
        if (window.CharacterEngine) {
          window.CharacterEngine.handleBoyTap(boy, x, y);
        }
        return;
      }
    }
  }

  addDustPuff(x, y) {
    for (let i = 0; i < 6; i++) {
      const vx = (Math.random() - 0.5) * 4;
      const vy = (Math.random() - 0.5) * 3;
      this.particles.push(new DustParticle(x, y, vx, vy));
    }
  }

  addConfettiShower() {
    for (let i = 0; i < 48; i++) {
      this.confetti.push(new ConfettiParticle(this.width / 2 + (Math.random() - 0.5) * 160, this.height * 0.35));
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update() {
    const bounds = { width: this.width, height: this.height };

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    // Update confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      this.confetti[i].update();
      if (this.confetti[i].life <= 0) this.confetti.splice(i, 1);
    }

    // Update all boys
    for (let boy of this.boys) {
      boy.update(bounds, this.particles);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Subtle cozy gradient background
    const grad = this.ctx.createRadialGradient(this.width / 2, this.height * 0.7, 20, this.width / 2, this.height * 0.7, this.width * 0.75);
    grad.addColorStop(0, '#F4EAE0');
    grad.addColorStop(1, '#FAF7F2');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Render dust particles
    for (let p of this.particles) p.draw(this.ctx);

    // Render all boys
    for (let boy of this.boys) {
      boy.draw(this.ctx, this.lookTarget);
    }

    // Render confetti particles
    for (let c of this.confetti) c.draw(this.ctx);
  }
}

window.CanvasCharacterStage = CanvasCharacterStage;
