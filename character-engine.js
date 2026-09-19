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

  // Language: 'yue' (粵語), 'zh' (簡體), 'en' (English)
  lang: 'yue',

  // Multi-language text databases
  i18n: {
    yue: {
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
      clones: ["做啦！", "我都唔想催你！", "Deadline 喺度呀！", "你追我嘅時間件事都做完啦！", "唔好逃避現實！", "我好肚餓呀～～"],
      safeExit: "好啦……知你忙，俾你停一陣，我一陣再返嚟捉你！",
      celebrating: "YES！今次你真係做咗！👏",
      departure: "好啦～任務完成，我走喇！拜拜～👋",
      waitingStatus: "等你做完嘢先有飯食 🍱",
      taskPlaceholder: "今晚 8:00 完成工作 / 溫習功課"
    },
    zh: {
      idle: [
        "我在等你呢……",
        "你还没开始做吗？",
        "再不做，我就要变成化石了。",
        "主人，你做完我才有大餐吃哦……🥺",
        "外面世界怎么样？好想快点听你讲。"
      ],
      urging: [
        "到时间了！别装没看到！",
        "你那件事到底做了没？",
        "别再刷手机了！做事啊！",
        "你再拖我们今晚一起饿死！😭",
        "拖延症又犯了？快点动手！"
      ],
      runaway: [
        "你点我干嘛？事还没做完呢！",
        "又想点走我？做完了没先！",
        "你追我的时间，事情都做完了！",
        "走位！抓不到我哦～",
        "别逃避现实呀！快点做！"
      ],
      clones: ["做啦！", "我也不想催你！", "Deadline 在这里！", "你追我的时间事情都做完了！", "别逃避现实！", "我好饿呀～～"],
      safeExit: "好吧……知道你忙，让你停一下，我等会再回来抓你！",
      celebrating: "YES！这次你真的做完了！👏",
      departure: "好啦～任务完成，我走啦！拜拜～👋",
      waitingStatus: "等你做完才有饭吃 🍱",
      taskPlaceholder: "今晚 8:00 完成工作 / 复习功课"
    },
    en: {
      idle: [
        "I'm waiting for you...",
        "Haven't you started yet?",
        "If you don't start, I'll turn into a fossil.",
        "Master, I only get a feast after you finish...🥺",
        "How's the outside world? I want to hear your stories."
      ],
      urging: [
        "Time's up! Don't pretend you didn't see!",
        "Have you finished that thing yet?",
        "Stop scrolling! Do your work!",
        "Keep delaying and we'll both starve tonight!😭",
        "Procrastination again? Get moving!"
      ],
      runaway: [
        "Why are you tapping me? Work isn't done!",
        "Trying to tap me away? Finish first!",
        "The time you spend chasing me, the work would be done!",
        "Dodge! You can't catch me~",
        "Don't escape reality! Do it now!"
      ],
      clones: ["Do it!", "I don't want to nag either!", "Deadline is here!", "Chasing me wastes time!", "Face reality!", "I'm so hungry~~"],
      safeExit: "Alright... I know you're busy. Take a break, I'll come back later!",
      celebrating: "YES! You really finished it this time!👏",
      departure: "Alright~ Task done, I'm leaving! Bye~👋",
      waitingStatus: "Finish your work so I can eat 🍱",
      taskPlaceholder: "Finish report / study by 8:00 tonight"
    }
  },

  getDialogues() {
    return this.i18n[this.lang] || this.i18n.yue;
  },

  setLang(lang) {
    if (this.i18n[lang]) {
      this.lang = lang;
      localStorage.setItem('boy_companion_lang', lang);
      this.applyLanguage();
    }
  },

  applyLanguage() {
    const d = this.getDialogues();
    // Update status text
    const statusEl = document.getElementById('careStatusText');
    if (statusEl) statusEl.innerText = d.waitingStatus;
    // Update task input placeholder
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
      taskInput.placeholder = d.taskPlaceholder;
      if (!taskInput.value || taskInput.dataset.default === '1') {
        taskInput.value = d.taskPlaceholder;
        taskInput.dataset.default = '1';
      }
    }
    // Refresh current quote if any
    if (this.stage && this.stage.mainBoy) {
      this.stage.mainBoy.setPoseAndMood('sitting', 'waiting', d.idle[0]);
    }
    // Update UI labels if elements exist
    this.updateUILabels();
  },

  updateUILabels() {
    const labels = {
      yue: {
        tabReminder: '⏰ Overkill 催促提醒',
        tabDiary: '📖 晚間日記 (Diary 預覽)',
        btnTimeUp: '⏰ 時間到',
        btnTap: '👆 試撳(走位)',
        btnClone: '👥 召喚分身',
        btnComplete: '🎉 模擬完成',
        btnOutfit: '👔 換裝',
        btnDone: '✅ 我做完啦！(打卡離開)',
        btnSafe: '🙏 放過我 / 聽電話'
      },
      zh: {
        tabReminder: '⏰ Overkill 催促提醒',
        tabDiary: '📖 晚间日记 (Diary 预览)',
        btnTimeUp: '⏰ 时间到',
        btnTap: '👆 试点(走位)',
        btnClone: '👥 召唤分身',
        btnComplete: '🎉 模拟完成',
        btnOutfit: '👔 换装',
        btnDone: '✅ 我做完了！(打卡离开)',
        btnSafe: '🙏 放过我 / 接电话'
      },
      en: {
        tabReminder: '⏰ Overkill Reminder',
        tabDiary: '📖 Night Diary (Preview)',
        btnTimeUp: '⏰ Time Up',
        btnTap: '👆 Tap Test',
        btnClone: '👥 Summon Clones',
        btnComplete: '🎉 Simulate Done',
        btnOutfit: '👔 Change Outfit',
        btnDone: '✅ I Finished! (Check out)',
        btnSafe: '🙏 Let me go / Answer call'
      }
    };
    const L = labels[this.lang] || labels.yue;
    const map = [
      ['tabReminder', L.tabReminder],
      ['tabDiary', L.tabDiary],
    ];
    // Buttons via text content match is harder; we update known IDs / classes later if needed
  },

  init(stageInstance) {
    this.stage = stageInstance;
    // Restore language
    const savedLang = localStorage.getItem('boy_companion_lang');
    if (savedLang && this.i18n[savedLang]) this.lang = savedLang;

    this.loadCareData();
    this.updateCareUI();
    this.startTimer();
    this.startIdleTalkLoop();
    this.applyLanguage();

    // Set initial boy quote
    if (this.stage.mainBoy) {
      const d = this.getDialogues();
      this.stage.mainBoy.setPoseAndMood('sitting', 'waiting', d.idle[0]);
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
        const quotes = this.getDialogues().idle;
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        this.stage.mainBoy.quote = q;
        SoundEffects.playPop();
      }
    }, 6500);
  },

  // 1. 時間到觸發催促
  triggerTimeUp() {
    if (window.AndroidBridge && window.AndroidBridge.triggerAlarmPattern) {
        window.AndroidBridge.triggerAlarmPattern();
    }
    this.state = 'URGING';
    this.updateCareUI();
    SoundEffects.playAlarm();
    if (navigator.vibrate) navigator.vibrate([100, 70, 100]);

    this.showToast("⏰ 到時間啦！小人仔開始催促你做嘢！");
    document.getElementById('careStatusText').innerText = "🔥 時間到！佢開始急喇！";

    if (this.stage.mainBoy) {
      const d = this.getDialogues();
      const q = d.urging[Math.floor(Math.random() * d.urging.length)];
      this.stage.mainBoy.setPoseAndMood('standing', 'urging', q);
      this.stage.addDustPuff(this.stage.mainBoy.x, this.stage.mainBoy.y + 60);
    }
  },

  // 2. 核心手感：點擊逃跑 (Runaway Mode)
  handleBoyTap(boy, clickX, clickY) {
    if (this.state === 'CELEBRATING' || this.state === 'EXITED') return;

    this.tapCount++;
    SoundEffects.playWhoosh();
    SoundEffects.playBoing();
    if (navigator.vibrate) navigator.vibrate(80);
    if (window.AndroidBridge && window.AndroidBridge.vibrate) {
        window.AndroidBridge.vibrate(80);
    }

    // Dynamic Runaway: Dash across the screen to a random opposite position!
    const boundsWidth = this.stage ? this.stage.width : 360;
    const boundsHeight = this.stage ? this.stage.height : 400;
    
    // Choose a target far from current position
    const targetX = Math.random() < 0.5 ? (40 + Math.random() * 80) : (boundsWidth - 120 + Math.random() * 80);
    const targetY = 80 + Math.random() * (boundsHeight - 180);
    const dashX = (targetX - boy.x) * 0.25;
    const dashY = (targetY - boy.y) * 0.25;

    boy.impulse(dashX, dashY);
    if (this.stage && this.stage.addDustPuff) {
      this.stage.addDustPuff(boy.x, boy.y + 50);
    }

    // If tapped 3+ times, trigger clone swarm
    if (this.tapCount >= 3 && this.stage && this.stage.boys.length < 6) {
      this.triggerClone();
      return;
    }

    // Runaway quote & pose
    this.state = 'RUNAWAY';
    this.updateCareUI();
    const d = this.getDialogues();
    const quote = d.runaway[Math.floor(Math.random() * d.runaway.length)];
    boy.setPoseAndMood('running', 'teasing', quote);

    this.showToast();
  },

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
      const d = this.getDialogues();
      const quote = d.clones[idx % d.clones.length];
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
    const d = this.getDialogues();
    this.stage.boys.forEach((b, idx) => {
      b.setPoseAndMood('celebrating', 'happy', idx === 0 ? d.celebrating : (this.lang === 'en' ? "Nice! Done!" : "好嘢！做咗咪得囉！"));
      b.impulse(0, -6);
    });

    // 2.0s later: wave goodbye and exit
    setTimeout(() => {
      if (this.stage.mainBoy) {
        this.stage.mainBoy.quote = d.departure;
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
      this.stage.mainBoy.quote = this.getDialogues().safeExit;
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
    if (!text || !text.trim()) {
      return {
        reply: "👤「咦？入面空嘅？唔好呃我喎，今日外面就算發生一件好細嘅事我都想聽㗎……」",
        pose: "sitting",
        mood: "waiting"
      };
    }

    this.care.diaryCount++;
    this.care.happiness = Math.min(100, this.care.happiness + 15);
    this.saveCareData();
    this.updateCareUI();

    SoundEffects.playCheer();
    if (this.stage && this.stage.addConfettiShower) {
      this.stage.addConfettiShower();
    }

    const t = text.toLowerCase();

    // 1. 辛苦 / 疲累 / OT / 受氣 / 傷心
    if (/辛苦|好攰|好累|好烦|好煩|ot|加班|老闆|老細|開會|委屈|唔開心|難過|分手|失戀|哭|喊/i.test(t)) {
      return {
        reply: "👤「辛苦晒你呀主人……抱抱！出面世界咁辛苦，今晚返到嚟等我同小白貓陪你靜一靜。快啲沖個熱水涼早啲休息，有我喺手機入面一直撐住你！」",
        pose: "sitting",
        mood: "calm" // 溫柔陪伴抱貓
      };
    }

    // 2. 開心 / 美食 / 慶祝 / 購物
    if (/開心|大餐|好食|好味|好正|買咗|購物|放假|旅行|拍拖|慶祝|正呀|正啊|爽/i.test(t)) {
      return {
        reply: "👤「哇！真係咁正？！聽你講到我都流晒口水！主人努力賺到錢去食好嘢玩好嘢，我都戥你超級開心！下次講多啲細節俾我知呀～嘻嘻！」",
        pose: "celebrating",
        mood: "happy" // 興奮慶祝
      };
    }

    // 3. 讀書 / 溫習 / 目標 / 努力
    if (/溫書|溫習|考試|功課|做野|做嘢|報告|project|deadline|目標|減肥|運動/i.test(t)) {
      return {
        reply: "👤「好有幹勁呀主人！你今日為我哋嘅好生活又跨出咗一大步！我喺手機入面幫你好好記低晒，辛苦晒你，我哋一齊繼續加油！」",
        pose: "sitting",
        mood: "happy"
      };
    }

    // 4. 思考 / 迷惘 / 煩惱
    if (/諗緊|諗唔通|唔知點|點算|選擇|抉擇|決定|迷惘/i.test(t)) {
      return {
        reply: "👤「嗯……等我幫你一齊諗下！雖然我困喺手機入面，但我會一直做你最忠實嘅聽眾。無論你最後點決定，我都一定全力撐你！」",
        pose: "sitting",
        mood: "waiting"
      };
    }

    // 5. 深夜 / 睡意 / 晚安
    if (/瞓覺|訓覺|好眼瞓|好眼困|瞓喇|夜喇|晚安|早點睡|瞓啦/i.test(t)) {
      return {
        reply: "👤「夜喇主人～今日辛苦晒你喇，唔好再捱夜碌電話喇。快啲合埋眼瞓啦，我喺度守護你，聽日外面世界再見，晚安～」",
        pose: "sitting",
        mood: "calm"
      };
    }

    // 6. 普通日常分享
    return {
      reply: "👤「多謝你今日返嚟同我講外面世界嘅事！聽完你講，我覺得手機入面都充滿陽光，冇咁寂寞喇！聽日都要繼續同我講故事喎～」",
      pose: "standing",
      mood: "happy"
    };
  },

  showToast(msg) {
    if (window.AndroidBridge && window.AndroidBridge.showToast) {
        window.AndroidBridge.showToast(msg);
    }
    const t = document.getElementById('toast');
    if (t) {
      t.innerText = msg;
      t.style.opacity = '1';
      setTimeout(() => { t.style.opacity = '0'; }, 2400);
    }
  }
};

window.CharacterEngine = CharacterEngine;
