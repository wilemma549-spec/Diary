/**
 * CharacterEngine - Matrix Core (Scheme B: Shared Engine for Reminder & Diary)
 * Manages states, behaviour logic, clone swarm, and care economy.
 */

const CharacterEngine = {
  mode: 'REMINDER', // 'REMINDER' or 'DIARY'
  state: 'WAITING',  // WAITING, URGING, RUNAWAY, CLONE, CELEBRATING, EXITED, SAFE_EXIT
  
  // Care Economy (打工養仔)
  care: {
    coins: 120,
    streak: 3,
    hunger: 70,       // 0 - 100
    happiness: 85,    // 0 - 100
    diaryCount: 7,    // milestone to 20
    outfit: 'hoodie'
  },

  // Tap counter for Runaway & Clone
  tapCount: 0,
  timerSeconds: 10,
  timerInterval: null,

  // Text databases
  dialogues: {
    idle: [
      "我等緊你喎……",
      "你仲未開始做呀？",
      "再唔做，我就快變化石喇。",
      "主人，你做完我先有大餐食㗎……🥺",
      "出面世界點呀？好想快啲聽你講。"
    ],
    urging: [
      "到時間啦！咪扮睇唔到！",
      "你件事到底做咗未姐？",
      "唔好再碌電話喇！做嘢呀！",
      "你再拖我哋今晚一齊餓死喇！😭",
      "拖延症又發作？快啲郁手！"
    ],
    runaway: [
      "你撳我做咩？件事仲未做喎！",
      "又想撳走我？做咗未先！",
      "你追我嘅時間，件事都做完啦！",
      "走位！捉我唔到呢～",
      "唔好逃避現實呀！快啲做！"
    ],
    clones: [
      "做啦！",
      "我都唔想催你！",
      "Deadline 喺度呀！",
      "你追我嘅時間件事都做完啦！",
      "唔好逃避現實！",
      "我好肚餓呀～～"
    ],
    safeExit: "好啦……知你忙，俾你停一陣，我一陣再返嚟捉你！",
    celebrating: "YES！今次你真係做咗！👏",
    departure: "好啦～任務完成，我走喇！拜拜～👋"
  },

  init(stageInstance) {
    this.stage = stageInstance;
    this.loadCareData();
    this.updateCareUI();
    this.startTimer();
    this.startIdleTalkLoop();

    // Set initial boy quote
    if (this.stage.mainBoy) {
      this.stage.mainBoy.setPoseAndMood('sitting', 'waiting', "我等緊你喎……");
    }
  },

  loadCareData() {
    try {
      const saved = localStorage.getItem('boy_companion_care_v2');
      if (saved) {
        this.care = Object.assign(this.care, JSON.parse(saved));
      }
    } catch(e) {}
  },

  saveCareData() {
    try {
      localStorage.setItem('boy_companion_care_v2', JSON.stringify(this.care));
    } catch(e) {}
  },

  updateCareUI() {
    document.getElementById('coinDisplay').innerText = this.care.coins;
    document.getElementById('streakDisplay').innerText = this.care.streak;
    document.getElementById('hungerFill').style.width = `${Math.min(100, Math.max(5, this.care.hunger))}%`;
    document.getElementById('happyFill').style.width = `${Math.min(100, Math.max(5, this.care.happiness))}%`;
    document.getElementById('engineStatusTag').innerText = this.state;

    const diaryProgress = document.getElementById('diaryProgressText');
    if (diaryProgress) {
      const remain = 20 - (this.care.diaryCount % 20);
      diaryProgress.innerText = `距第 ${Math.ceil((this.care.diaryCount + 1) / 20) * 20} 次禮物差 ${remain} 次`;
    }
  },

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerSeconds = 10;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (this.state === 'CELEBRATING' || this.state === 'EXITED' || this.state === 'SAFE_EXIT') return;
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.updateTimerDisplay();
      } else if (this.timerSeconds === 0 && this.state === 'WAITING') {
        this.triggerTimeUp();
      }
    }, 1000);
  },

  updateTimerDisplay() {
    const el = document.getElementById('timerDisplay');
    if (!el) return;
    const m = Math.floor(this.timerSeconds / 60);
    const s = this.timerSeconds % 60;
    el.innerText = `⏰ ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

    if (this.timerSeconds <= 3) {
      el.classList.add('timer-urgent');
    } else {
      el.classList.remove('timer-urgent');
    }
  },

  startIdleTalkLoop() {
    setInterval(() => {
      if (this.state === 'WAITING' && this.stage.mainBoy) {
        const quotes = this.dialogues.idle;
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        this.stage.mainBoy.quote = q;
        SoundEffects.playPop();
      }
    }, 6500);
  },

  // 1. 時間到觸發催促
  triggerTimeUp() {
    this.state = 'URGING';
    this.updateCareUI();
    SoundEffects.playAlarm();
    if (navigator.vibrate) navigator.vibrate([100, 70, 100]);

    this.showToast("⏰ 到時間啦！小人仔開始催促你做嘢！");
    document.getElementById('careStatusText').innerText = "🔥 時間到！佢開始急喇！";

    if (this.stage.mainBoy) {
      this.stage.mainBoy.setPoseAndMood('standing', 'urging', "👤 到時間啦！仲唔去做？");
      this.stage.addDustPuff(this.stage.mainBoy.x, this.stage.mainBoy.y + 60);
    }
  },

  // 2. 核心手感：點擊逃跑 (Runaway Mode)
  handleBoyTap(boy, clickX, clickY) {
    if (this.state === 'CELEBRATING' || this.state === 'EXITED') return;

    this.tapCount++;
    SoundEffects.playWhoosh();
    SoundEffects.playBoing();
    if (navigator.vibrate) navigator.vibrate(60);

    // Calculate impulse away from tap point
    const dx = boy.x - clickX;
    const dy = (boy.y + 40) - clickY;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = 12 + Math.random() * 6;

    boy.impulse((dx / dist) * speed, (dy / dist) * speed - 4);
    this.stage.addDustPuff(boy.x, boy.y + 60);

    // If tapped 3+ times, trigger clone swarm
    if (this.tapCount >= 3 && this.stage.boys.length < 6) {
      this.triggerClone();
      return;
    }

    // Runaway quote & pose
    this.state = 'RUNAWAY';
    this.updateCareUI();
    const quote = this.dialogues.runaway[Math.floor(Math.random() * this.dialogues.runaway.length)];
    boy.setPoseAndMood('running', 'teasing', quote);

    this.showToast(`💨 小人仔走位！(嘗試點擊了 ${this.tapCount} 次)`);
  },

  // 3. 分身模式 (Clone Mode: 1 -> 2 -> 4 -> 6)
  triggerClone() {
    this.state = 'CLONE';
    this.updateCareUI();
    SoundEffects.playAlarm();
    if (navigator.vibrate) navigator.vibrate([80, 50, 80, 50, 120]);

    const cur = this.stage.boys.length;
    const target = cur === 1 ? 2 : (cur === 2 ? 4 : 6);
    const toAdd = target - cur;

    this.showToast(`👥 召喚分身！增殖為 ${target} 隻小人仔全方位催促！`);
    document.getElementById('careStatusText').innerText = `😱 ${target} 隻小人仔圍住催促！`;

    for (let i = 0; i < toAdd; i++) {
      const idx = cur + i;
      const rx = 50 + Math.random() * (this.stage.width - 100);
      const ry = 60 + Math.random() * (this.stage.height - 180);
      
      const cloneBoy = new BoyActor(`clone_${idx}`, rx, ry, false);
      cloneBoy.outfit = this.care.outfit;
      const quote = this.dialogues.clones[idx % this.dialogues.clones.length];
      cloneBoy.setPoseAndMood('running', 'urging', quote);
      cloneBoy.impulse((Math.random() - 0.5) * 10, -5);

      this.stage.boys.push(cloneBoy);
      this.stage.addDustPuff(rx, ry + 60);
    }
  },

  // 4. 打卡完成 (核心心理回饋：全體慶祝、道別離開)
  completeTask() {
    if (this.state === 'CELEBRATING' || this.state === 'EXITED') return;

    this.state = 'CELEBRATING';
    this.updateCareUI();
    clearInterval(this.timerInterval);
    SoundEffects.playCheer();
    if (navigator.vibrate) navigator.vibrate([120, 80, 180, 80, 250]);

    // Confetti shower
    this.stage.addConfettiShower();

    // Reward Tamagotchi
    this.care.coins += 50;
    this.care.streak += 1;
    this.care.hunger = Math.min(100, this.care.hunger + 25);
    this.care.happiness = Math.min(100, this.care.happiness + 20);
    this.saveCareData();
    this.updateCareUI();

    this.showToast("🎉 打卡成功！賺到 50 金幣，小人仔食到大餐！");
    document.getElementById('careStatusText').innerText = "🥰 主人真係做咗！今晚有飯食！";

    // All boys jump and celebrate
    this.stage.boys.forEach((b, idx) => {
      b.setPoseAndMood('celebrating', 'happy', idx === 0 ? this.dialogues.celebrating : "好嘢！做咗咪得囉！");
      b.impulse(0, -6);
    });

    // 2.0s later: wave goodbye and exit
    setTimeout(() => {
      if (this.stage.mainBoy) {
        this.stage.mainBoy.quote = this.dialogues.departure;
      }
      
      // Animate sliding down off-screen
      let exitStep = 0;
      const exitTimer = setInterval(() => {
        exitStep += 5;
        this.stage.boys.forEach(b => {
          b.y += exitStep;
        });
        if (exitStep > 120) {
          clearInterval(exitTimer);
          this.state = 'EXITED';
          this.stage.boys = [];
          this.updateCareUI();
          this.showExitScreen();
        }
      }, 30);
    }, 2000);
  },

  showExitScreen() {
    const overlay = document.getElementById('exitOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  },

  // 5. 重置任務循環
  resetTask() {
    const overlay = document.getElementById('exitOverlay');
    if (overlay) overlay.style.display = 'none';

    this.state = 'WAITING';
    this.tapCount = 0;
    this.stage.boys = [];
    this.stage.mainBoy = new BoyActor('main', this.stage.width / 2, this.stage.height * 0.48, true);
    this.stage.mainBoy.outfit = this.care.outfit;
    this.stage.mainBoy.setPoseAndMood('sitting', 'waiting', "我等緊你喎……");
    this.stage.boys.push(this.stage.mainBoy);

    document.getElementById('careStatusText').innerText = "等你做完嘢先有飯食 🍱";
    this.startTimer();
    this.updateCareUI();
  },

  // 6. 安全退出 (放過我 / 聽電話)
  safeExit() {
    SoundEffects.playPop();
    this.state = 'SAFE_EXIT';
    this.updateCareUI();
    clearInterval(this.timerInterval);

    this.showToast("✋ 安全模式：小人仔避讓 5 分鐘");
    if (this.stage.mainBoy) {
      this.stage.mainBoy.quote = this.dialogues.safeExit;
      setTimeout(() => {
        this.stage.boys = [];
        this.showExitScreen();
      }, 1200);
    }
  },

  // 7. 換裝切換 (展示 Boy3 多造型)
  changeOutfit(outfitKey) {
    this.care.outfit = outfitKey;
    this.saveCareData();
    this.stage.boys.forEach(b => b.outfit = outfitKey);
    SoundEffects.playSnack();
    this.showToast(`👔 換裝為：${outfitKey === 'rainy' ? '小黃雨衣' : (outfitKey === 'school' ? '學院校服' : '溫暖連帽衫')}`);
  },

  // 8. Diary 模式關鍵字情感反應 (Scheme B 矩陣驗證)
  analyzeDiaryEntry(text) {
    if (!text.trim()) {
      return "空嘅？唔好呃我喎，一件小事都好呀……";
    }

    this.care.diaryCount++;
    this.care.happiness = Math.min(100, this.care.happiness + 15);
    this.saveCareData();
    this.updateCareUI();

    SoundEffects.playCheer();
    this.stage.addConfettiShower();

    // Keyword parser based on App計劃
    if (/返工|OT|老闆|放工|開會/i.test(text)) {
      return "👤「今日返工好似幾辛苦喎……辛苦你喇，返到嚟就好好休息啦。」";
    } else if (/開心|旅行|拍拖|好食|好玩|正/i.test(text)) {
      return "👤「聽落好正喎！外面世界真係咁好玩？下次講多啲俾我知！」";
    } else if (/考試|Deadline|功課|做野|做嘢/i.test(text)) {
      return "👤「哦……原來係呢樣嘢搞到你咁煩。唔緊要，我陪住你一齊搞掂佢！」";
    } else if (/失戀|分手|傷心|辛苦|難過|喊/i.test(text)) {
      return "👤「今日好似唔容易……你願意寫低同我講，已經做得好好喇。」";
    } else {
      return "👤「嗯！我聽完喇！今日又有你嘅故事陪伴我，真係好。」";
    }
  },

  showToast(msg) {
    const t = document.getElementById('toast');
    if (t) {
      t.innerText = msg;
      t.style.opacity = '1';
      setTimeout(() => { t.style.opacity = '0'; }, 2400);
    }
  }
};

window.CharacterEngine = CharacterEngine;
