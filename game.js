/* =========================================================
   果园叠叠乐 — 游戏逻辑
   纯原生 Canvas 2D + 自写圆形刚体物理，无外部依赖
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 基础配置 ---------- */

  var W = 420;
  var H = 610;
  var WALL = 9;
  var FLOOR = 12;
  var LINE_Y = 112;
  var DROP_Y = 52;
  var GRAVITY = 1500;
  var RESTITUTION = 0.07;
  var FIXED_STEP = 1 / 120;
  var MAX_STEPS_PER_FRAME = 8;
  var SPAWN_DELAY = 0.32;
  var DANGER_LIMIT = 2;
  var MAX_DROP_TIER = 4;
  var TAU = Math.PI * 2;

  var STORAGE_BEST = 'orchard-stack-best-v1';
  var STORAGE_PLAYERS = 'orchard-stack-leaderboard-v1';
  var STORAGE_PLAYER_NAME = 'orchard-stack-player-name-v1';
  var STORAGE_SOUND = 'orchard-stack-sound-v1';
  var LEADERBOARD_CHANNEL = 'orchard-stack-leaderboard-live';
  var MAX_PLAYER_NAME = 12;

  var AVATAR_PALETTE = [
    ['#efb08d', '#cf6e4d'],
    ['#b9d58c', '#708e4c'],
    ['#c8ace9', '#7f5aab'],
    ['#f4d080', '#c98e2d'],
    ['#9fd4d0', '#4b8b86'],
    ['#f2a8b8', '#c6556e'],
    ['#d6bd96', '#94724a'],
    ['#a9c1e8', '#607bb5']
  ];

  var FRUIT_TYPES = [
    {
      name: '樱桃', radius: 15, points: 1, style: 'cherry',
      light: '#ffb2bf', base: '#e8435e', dark: '#a21f3b', accent: '#ffe8df',
      leaf: '#648449', tip: '两颗樱桃就能变成草莓，先从小果开始。'
    },
    {
      name: '草莓', radius: 20, points: 3, style: 'strawberry',
      light: '#ff9b90', base: '#ef4e59', dark: '#aa253b', accent: '#fff0ca',
      leaf: '#587e42', tip: '小水果更灵活，适合塞进堆叠的缝隙里。'
    },
    {
      name: '葡萄', radius: 26, points: 6, style: 'grape',
      light: '#c8a5ee', base: '#9666cf', dark: '#5d398f', accent: '#f2dcff',
      leaf: '#567a45', tip: '圆滚滚的葡萄容易滚，落点要稳一点。'
    },
    {
      name: '柠檬', radius: 32, points: 10, style: 'lemon',
      light: '#ffe88a', base: '#f2c43b', dark: '#b88413', accent: '#fff8d0',
      leaf: '#5f8148', tip: '先把它放在同类旁边，别急着把果堆堆高。'
    },
    {
      name: '猕猴桃', radius: 39, points: 15, style: 'kiwi',
      light: '#d5e99a', base: '#90c05d', dark: '#577a37', accent: '#f0f5cf',
      leaf: '#526f3e', tip: '猕猴桃个头不小，落下前记得留好空间。'
    },
    {
      name: '橘子', radius: 46, points: 21, style: 'orange',
      light: '#ffc563', base: '#f59b2c', dark: '#b96108', accent: '#ffe4bc',
      leaf: '#557b46', tip: '大水果会占更多位置，尽量往中间放。'
    },
    {
      name: '水蜜桃', radius: 54, points: 28, style: 'peach',
      light: '#ffcdbf', base: '#f89b8b', dark: '#bd635b', accent: '#fff0e4',
      leaf: '#5a7b45', tip: '水蜜桃很软，别让它从边上滚下去。'
    },
    {
      name: '苹果', radius: 63, points: 36, style: 'apple',
      light: '#ff8f83', base: '#df3e44', dark: '#971c2c', accent: '#ffe0d4',
      leaf: '#5b814a', tip: '到苹果啦，给下一颗大水果腾点地方。'
    },
    {
      name: '哈密瓜', radius: 73, points: 45, style: 'melon',
      light: '#dceaa6', base: '#a7ca6e', dark: '#6d893e', accent: '#f5f6d3',
      leaf: '#5d7c40', tip: '哈密瓜很占地方，留出整片空间再合。'
    },
    {
      name: '西瓜', radius: 85, points: 55, style: 'watermelon',
      light: '#91d286', base: '#4bab65', dark: '#286b41', accent: '#f4b6a9',
      leaf: '#4f7c43', tip: '西瓜登场！两颗西瓜相撞会直接爆开。'
    }
  ];

  var MAX_TIER = FRUIT_TYPES.length - 1;

  var NEXT_TIPS = [
    '两颗樱桃就能变成草莓，先从小果开始。',
    '小水果更灵活，适合塞进堆叠的缝隙里。',
    '圆滚滚的葡萄容易滚，落点要稳一点。',
    '先把它放在同类旁边，别急着把果堆堆高。',
    '猕猴桃个头不小，落下前记得留好空间。'
  ];

  /* ---------- DOM ---------- */

  var el = {
    canvas: document.getElementById('gameCanvas'),
    score: document.getElementById('scoreValue'),
    best: document.getElementById('bestValue'),
    pauseBtn: document.getElementById('pauseBtn'),
    pauseLabel: document.getElementById('pauseLabel'),
    soundBtn: document.getElementById('soundBtn'),
    soundLabel: document.getElementById('soundLabel'),
    introOverlay: document.getElementById('introOverlay'),
    gameOverOverlay: document.getElementById('gameOverOverlay'),
    pauseOverlay: document.getElementById('pauseOverlay'),
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
    restartSide: document.getElementById('restartSide'),
    resumeBtn: document.getElementById('resumeBtn'),
    nextCanvas: document.getElementById('nextCanvas'),
    nextName: document.getElementById('nextName'),
    nextMeta: document.getElementById('nextMeta'),
    nextHint: document.getElementById('nextHint'),
    introCanvas: document.getElementById('introCanvas'),
    evolutionChain: document.getElementById('evolutionChain'),
    dangerToast: document.getElementById('dangerToast'),
    dangerCountdown: document.getElementById('dangerCountdown'),
    finalScore: document.getElementById('finalScore'),
    finalBest: document.getElementById('finalBest'),
    resultNote: document.getElementById('resultNote'),
    newRecordBadge: document.getElementById('newRecordBadge'),
    resultAvatar: document.getElementById('resultAvatar'),
    resultPlayerName: document.getElementById('resultPlayerName'),
    resultRank: document.getElementById('resultRank'),
    playerNameInput: document.getElementById('playerNameInput'),
    playerNameError: document.getElementById('playerNameError'),
    playerOverlay: document.getElementById('playerOverlay'),
    playerSwitchCopy: document.getElementById('playerSwitchCopy'),
    switchPlayerBtn: document.getElementById('switchPlayerBtn'),
    switchNameInput: document.getElementById('switchNameInput'),
    switchNameError: document.getElementById('switchNameError'),
    switchStartBtn: document.getElementById('switchStartBtn'),
    switchCancelBtn: document.getElementById('switchCancelBtn'),
    savedPlayers: document.getElementById('savedPlayers'),
    currentAvatar: document.getElementById('currentAvatar'),
    currentPlayerName: document.getElementById('currentPlayerName'),
    currentPlayerBest: document.getElementById('currentPlayerBest'),
    leaderboardList: document.getElementById('leaderboardList'),
    leaderboardEmpty: document.getElementById('leaderboardEmpty'),
    leaderboardCount: document.getElementById('leaderboardCount'),
    leaderboardCard: document.getElementById('leaderboardCard'),
    mobileNext: document.getElementById('mobileNext'),
    mobileNextCanvas: document.getElementById('mobileNextCanvas'),
    mobileBoardBtn: document.getElementById('mobileBoardBtn'),
    closeBoardBtn: document.getElementById('closeBoardBtn'),
    mobileBoardScrim: document.getElementById('mobileBoardScrim'),
    liveStatus: document.getElementById('liveStatus')
  };

  /* ---------- 小工具 ---------- */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hexToRgba(hex, alpha) {
    var value = hex.replace('#', '');
    if (value.length === 3) {
      value = value.charAt(0) + value.charAt(0) +
        value.charAt(1) + value.charAt(1) +
        value.charAt(2) + value.charAt(2);
    }
    var number = parseInt(value, 16);
    var r = (number >> 16) & 255;
    var g = (number >> 8) & 255;
    var b = number & 255;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function readStored(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStored(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      /* localStorage 不可用时静默降级 */
    }
  }

  function formatScore(value) {
    try {
      return Number(value).toLocaleString('zh-CN');
    } catch (error) {
      return String(value);
    }
  }

  function setLiveMessage(message) {
    if (el.liveStatus) {
      el.liveStatus.textContent = message;
    }
  }

  /* ---------- 玩家与实时排行榜 ---------- */

  function normalizePlayerName(raw) {
    var text = String(raw === null || raw === undefined ? '' : raw)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    var characters = Array.from(text);
    if (characters.length > MAX_PLAYER_NAME) {
      characters = characters.slice(0, MAX_PLAYER_NAME);
    }
    return characters.join('');
  }

  function playerIdFromName(name) {
    return normalizePlayerName(name).toLowerCase();
  }

  function clonePlayer(player) {
    return {
      id: player.id,
      name: player.name,
      best: player.best,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt
    };
  }

  function sanitizePlayer(rawPlayer) {
    if (!rawPlayer || typeof rawPlayer !== 'object') return null;
    var name = normalizePlayerName(rawPlayer.name);
    if (!name) return null;

    var best = Number(rawPlayer.best);
    if (!isFinite(best) || best < 0) best = 0;

    var now = Date.now();
    var createdAt = Number(rawPlayer.createdAt);
    var updatedAt = Number(rawPlayer.updatedAt);
    if (!isFinite(createdAt) || createdAt <= 0) createdAt = now;
    if (!isFinite(updatedAt) || updatedAt <= 0) updatedAt = now;

    return {
      id: playerIdFromName(name),
      name: name,
      best: Math.floor(best),
      createdAt: Math.floor(createdAt),
      updatedAt: Math.floor(updatedAt)
    };
  }

  function sanitizePlayerList(list) {
    var byId = {};
    if (!Array.isArray(list)) return [];

    list.forEach(function (rawPlayer) {
      var player = sanitizePlayer(rawPlayer);
      if (!player) return;
      var existing = byId[player.id];
      if (!existing) {
        byId[player.id] = player;
        return;
      }

      if (player.best > existing.best) {
        existing.best = player.best;
        existing.name = player.name;
      }
      existing.createdAt = Math.min(existing.createdAt, player.createdAt);
      existing.updatedAt = Math.max(existing.updatedAt, player.updatedAt);
    });

    return Object.keys(byId).map(function (id) {
      return byId[id];
    });
  }

  function loadPlayers() {
    var raw = readStored(STORAGE_PLAYERS, null);
    var parsed = null;

    if (raw !== null) {
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        parsed = null;
      }
    }

    if (!Array.isArray(parsed)) {
      if (memoryPlayers) {
        return memoryPlayers.map(clonePlayer);
      }
      return [];
    }

    var players = sanitizePlayerList(parsed);
    memoryPlayers = players.map(clonePlayer);
    return players;
  }

  function savePlayers(players) {
    var sanitized = sanitizePlayerList(players);
    memoryPlayers = sanitized.map(clonePlayer);
    writeStored(STORAGE_PLAYERS, JSON.stringify(sanitized));
    notifyLeaderboardUpdate();
  }

  function comparePlayers(a, b) {
    if (b.best !== a.best) return b.best - a.best;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt - b.updatedAt;
    return a.name.localeCompare(b.name, 'zh-CN');
  }

  function sortPlayers(players) {
    return players.slice().sort(comparePlayers);
  }

  function findPlayerById(players, id) {
    for (var i = 0; i < players.length; i += 1) {
      if (players[i].id === id) return players[i];
    }
    return null;
  }

  function getAvatarInfo(name) {
    var characters = Array.from(name || '果');
    var hash = 0;
    for (var i = 0; i < characters.length; i += 1) {
      hash = (hash * 31 + characters[i].charCodeAt(0)) >>> 0;
    }
    var colors = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
    return {
      text: characters[0] || '果',
      background: 'linear-gradient(145deg, ' + colors[0] + ', ' + colors[1] + ')'
    };
  }

  function paintAvatar(element, name) {
    if (!element) return;
    var info = getAvatarInfo(name);
    element.textContent = info.text;
    element.style.background = info.background;
  }

  function setFieldError(input, errorElement, message) {
    var hasError = Boolean(message);
    if (input) {
      input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
      var field = input.closest('.name-field');
      if (field) field.classList.toggle('is-invalid', hasError);
    }
    if (errorElement) {
      if (hasError) {
        errorElement.textContent = message;
        errorElement.hidden = false;
      } else {
        errorElement.hidden = true;
      }
    }
  }

  function readNameField(input, errorElement) {
    var name = normalizePlayerName(input ? input.value : '');
    if (!name) {
      setFieldError(input, errorElement, '请输入 1–12 个字符的昵称');
      if (input) input.focus();
      return null;
    }
    setFieldError(input, errorElement, '');
    return name;
  }

  function updateCurrentPlayerUI() {
    if (!game.player) return;
    var name = game.player.name;

    el.currentPlayerName.textContent = name;
    el.currentPlayerBest.textContent = formatScore(game.player.best);
    paintAvatar(el.currentAvatar, name);
    el.resultPlayerName.textContent = name;
    paintAvatar(el.resultAvatar, name);

    if (document.activeElement !== el.playerNameInput) {
      el.playerNameInput.value = name;
    }
    if (!game.playerOverlayOpen && document.activeElement !== el.switchNameInput) {
      el.switchNameInput.value = name;
    }
  }

  function renderLeaderboard(flashPlayerId) {
    var players = sortPlayers(loadPlayers());
    el.leaderboardList.innerHTML = '';

    if (!players.length) {
      el.leaderboardEmpty.hidden = false;
      el.leaderboardCount.textContent = '0 位玩家';
      return;
    }

    el.leaderboardEmpty.hidden = true;

    players.forEach(function (player, index) {
      var row = document.createElement('li');
      row.className = 'leaderboard-row';
      row.setAttribute('aria-label', '第 ' + (index + 1) + ' 名，' + player.name + '，最高 ' + player.best + ' 分');

      var isCurrent = game.player && player.id === game.player.id;
      if (isCurrent) row.classList.add('is-current');
      if (flashPlayerId && player.id === flashPlayerId) row.classList.add('is-updated');

      var rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      if (index < 3) rank.classList.add('rank-' + (index + 1));
      rank.textContent = String(index + 1);

      var avatar = document.createElement('span');
      avatar.className = 'leaderboard-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      paintAvatar(avatar, player.name);

      var name = document.createElement('span');
      name.className = 'leaderboard-name';
      var nameText = document.createElement('span');
      nameText.className = 'leaderboard-name-text';
      nameText.textContent = player.name;
      name.appendChild(nameText);
      if (isCurrent) {
        var youTag = document.createElement('em');
        youTag.textContent = '你';
        name.appendChild(youTag);
      }

      var score = document.createElement('strong');
      score.className = 'leaderboard-score';
      score.textContent = formatScore(player.best);

      row.appendChild(rank);
      row.appendChild(avatar);
      row.appendChild(name);
      row.appendChild(score);
      el.leaderboardList.appendChild(row);
    });

    el.leaderboardCount.textContent = players.length + ' 位玩家';
  }

  function getPlayerRank(playerId) {
    var players = sortPlayers(loadPlayers());
    for (var i = 0; i < players.length; i += 1) {
      if (players[i].id === playerId) return i + 1;
    }
    return 0;
  }

  function generateDefaultPlayerName(players) {
    var base = '小果农';
    if (!findPlayerById(players, playerIdFromName(base))) return base;
    for (var i = 2; i < 100; i += 1) {
      var candidate = base + ' ' + i;
      if (!findPlayerById(players, playerIdFromName(candidate))) return candidate;
    }
    return base + ' ' + String(Date.now()).slice(-4);
  }

  function selectPlayer(name) {
    var cleanName = normalizePlayerName(name);
    if (!cleanName) return null;

    var players = loadPlayers();
    var id = playerIdFromName(cleanName);
    var player = findPlayerById(players, id);
    var now = Date.now();

    if (!player) {
      player = {
        id: id,
        name: cleanName,
        best: 0,
        createdAt: now,
        updatedAt: now
      };
      players.push(player);
      savePlayers(players);
    }

    writeStored(STORAGE_PLAYER_NAME, player.name);
    game.player = player;
    game.best = player.best;
    game.newRecordThisRun = false;
    updateBestDisplay();
    updateCurrentPlayerUI();
    renderLeaderboard();
    return player;
  }

  function initializePlayer() {
    var players = loadPlayers();
    var savedName = normalizePlayerName(readStored(STORAGE_PLAYER_NAME, ''));
    var player = null;

    if (savedName) {
      player = findPlayerById(players, playerIdFromName(savedName));
    } else if (players.length) {
      player = sortPlayers(players)[0];
    }

    if (!player) {
      var name = savedName || generateDefaultPlayerName(players);
      var now = Date.now();
      var startingBest = players.length === 0 ? legacyBest : 0;
      player = {
        id: playerIdFromName(name),
        name: name,
        best: startingBest,
        createdAt: now,
        updatedAt: now
      };
      players.push(player);
      savePlayers(players);
    }

    selectPlayer(player.name);
  }

  function updatePlayerBest(score) {
    if (!game.player) {
      return { player: null, improved: false };
    }

    var players = loadPlayers();
    var player = findPlayerById(players, game.player.id);
    var needsSave = false;
    var now = Date.now();

    if (!player) {
      player = {
        id: game.player.id,
        name: game.player.name,
        best: 0,
        createdAt: now,
        updatedAt: now
      };
      players.push(player);
      needsSave = true;
    }

    var improved = false;
    if (score > player.best) {
      player.best = Math.floor(score);
      player.updatedAt = now;
      needsSave = true;
      improved = true;
    }

    if (needsSave) {
      savePlayers(players);
    }

    game.player = player;
    if (player.best > game.best) {
      game.best = player.best;
      updateBestDisplay();
    }

    updateCurrentPlayerUI();
    renderLeaderboard(improved ? player.id : null);
    return { player: player, improved: improved };
  }

  function notifyLeaderboardUpdate() {
    if (!leaderboardChannel) return;
    try {
      leaderboardChannel.postMessage({ type: 'leaderboard-updated', at: Date.now() });
    } catch (error) {
      /* 广播不可用时忽略，当前标签页仍然正常更新 */
    }
  }

  function scheduleLeaderboardSync() {
    if (leaderboardSyncTimer) {
      window.clearTimeout(leaderboardSyncTimer);
    }
    leaderboardSyncTimer = window.setTimeout(function () {
      leaderboardSyncTimer = 0;
      syncLeaderboardFromStorage();
    }, 70);
  }

  function syncLeaderboardFromStorage() {
    var players = loadPlayers();
    if (game.player) {
      var current = findPlayerById(players, game.player.id);
      if (current) {
        game.player = current;
        if (current.best > game.best) {
          game.best = current.best;
          updateBestDisplay();
        }
        updateCurrentPlayerUI();
      }
    }

    renderLeaderboard();

    if (game.state === 'gameover' && game.player) {
      el.finalBest.textContent = formatScore(game.best);
      var rank = getPlayerRank(game.player.id);
      if (rank) el.resultRank.textContent = '第 ' + rank + ' 名';
    }
  }

  function setupLeaderboardSync() {
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_PLAYERS) {
        scheduleLeaderboardSync();
      }
    });

    try {
      if (typeof window.BroadcastChannel === 'function') {
        leaderboardChannel = new window.BroadcastChannel(LEADERBOARD_CHANNEL);
        leaderboardChannel.addEventListener('message', function (event) {
          if (event.data && event.data.type === 'leaderboard-updated') {
            scheduleLeaderboardSync();
          }
        });
      }
    } catch (error) {
      leaderboardChannel = null;
    }
  }

  function renderSavedPlayers() {
    el.savedPlayers.innerHTML = '';
    var players = sortPlayers(loadPlayers());

    players.forEach(function (player) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'saved-player';
      if (game.player && player.id === game.player.id) {
        button.classList.add('is-selected');
      }

      var avatar = document.createElement('span');
      avatar.className = 'saved-player-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      paintAvatar(avatar, player.name);

      var name = document.createElement('span');
      name.className = 'saved-player-name';
      name.textContent = player.name;

      var score = document.createElement('span');
      score.className = 'saved-player-score';
      score.textContent = formatScore(player.best) + ' 分';

      button.appendChild(avatar);
      button.appendChild(name);
      button.appendChild(score);

      button.addEventListener('click', function () {
        el.switchNameInput.value = player.name;
        setFieldError(el.switchNameInput, el.switchNameError, '');
        Array.prototype.forEach.call(el.savedPlayers.children, function (child) {
          child.classList.remove('is-selected');
        });
        button.classList.add('is-selected');
        el.switchNameInput.focus();
      });

      el.savedPlayers.appendChild(button);
    });
  }

  function openPlayerOverlay() {
    if (game.playerOverlayOpen || game.mobileBoardOpen) return;

    if (game.state === 'intro') {
      el.playerNameInput.focus();
      el.playerNameInput.select();
      return;
    }

    game.playerOverlayOpen = true;
    game.playerOverlayReturnState = game.state;
    game.keys.left = false;
    game.keys.right = false;
    game.touchAiming = false;
    game.touchPointerId = null;

    if (game.state === 'playing') {
      game.state = 'paused';
    }

    el.pauseOverlay.hidden = true;
    el.switchNameInput.value = game.player ? game.player.name : '';
    setFieldError(el.switchNameInput, el.switchNameError, '');

    if (game.playerOverlayReturnState === 'playing') {
      el.playerSwitchCopy.textContent = '切换后会开始新的一局。当前这局的最高分已经实时记录。';
    } else {
      el.playerSwitchCopy.textContent = '选择已有昵称，或输入新的昵称。确认后会开始新的一局。';
    }

    renderSavedPlayers();
    el.playerOverlay.hidden = false;
    updatePauseButton();

    window.setTimeout(function () {
      if (game.playerOverlayOpen) {
        el.switchNameInput.focus({ preventScroll: true });
        el.switchNameInput.select();
      }
    }, 80);
  }

  function closePlayerOverlay() {
    if (!game.playerOverlayOpen) return;

    var returnState = game.playerOverlayReturnState;
    game.playerOverlayOpen = false;
    game.playerOverlayReturnState = null;
    el.playerOverlay.hidden = true;

    if (returnState === 'playing') {
      game.state = 'playing';
      game.accumulator = 0;
      el.pauseOverlay.hidden = true;
      try {
        el.canvas.focus({ preventScroll: true });
      } catch (error) {
        el.canvas.focus();
      }
    } else if (returnState === 'paused') {
      game.state = 'paused';
      el.pauseOverlay.hidden = false;
      el.resumeBtn.focus({ preventScroll: true });
    } else if (returnState === 'gameover') {
      game.state = 'gameover';
      el.switchPlayerBtn.focus({ preventScroll: true });
    } else {
      game.state = returnState || 'intro';
      el.switchPlayerBtn.focus({ preventScroll: true });
    }

    updatePauseButton();
    setLiveMessage(returnState === 'playing' ? '继续游戏。' : '已取消切换玩家。');
  }

  function confirmPlayerSwitch() {
    var name = readNameField(el.switchNameInput, el.switchNameError);
    if (!name) return;

    var player = selectPlayer(name);
    if (!player) return;

    game.playerOverlayOpen = false;
    game.playerOverlayReturnState = null;
    el.playerOverlay.hidden = true;
    startGame();
  }

  function openMobileBoard() {
    if (game.mobileBoardOpen || game.playerOverlayOpen) return;

    game.mobileBoardOpen = true;
    game.mobileBoardReturnState = game.state;
    game.keys.left = false;
    game.keys.right = false;
    game.touchAiming = false;
    game.touchPointerId = null;

    if (game.state === 'playing') {
      game.state = 'paused';
    }

    document.body.classList.add('mobile-board-open');
    el.mobileBoardScrim.hidden = false;
    el.mobileBoardBtn.setAttribute('aria-expanded', 'true');
    el.leaderboardCard.setAttribute('role', 'dialog');
    el.leaderboardCard.setAttribute('aria-modal', 'true');
    renderLeaderboard();
    updatePauseButton();

    window.setTimeout(function () {
      if (game.mobileBoardOpen) {
        el.closeBoardBtn.focus({ preventScroll: true });
      }
    }, 60);
  }

  function closeMobileBoard() {
    if (!game.mobileBoardOpen) return;

    var returnState = game.mobileBoardReturnState;
    game.mobileBoardOpen = false;
    game.mobileBoardReturnState = null;
    document.body.classList.remove('mobile-board-open');
    el.mobileBoardScrim.hidden = true;
    el.mobileBoardBtn.setAttribute('aria-expanded', 'false');
    el.leaderboardCard.removeAttribute('role');
    el.leaderboardCard.removeAttribute('aria-modal');

    if (returnState === 'playing' && game.state === 'paused') {
      game.state = 'playing';
      game.accumulator = 0;
      el.pauseOverlay.hidden = true;
      updatePauseButton();
      try {
        el.canvas.focus({ preventScroll: true });
      } catch (error) {
        el.canvas.focus();
      }
    } else {
      if (returnState === 'paused') {
        el.pauseOverlay.hidden = false;
      }
      updatePauseButton();
      el.mobileBoardBtn.focus({ preventScroll: true });
    }

    setLiveMessage(returnState === 'playing' ? '继续游戏。' : '排行榜已关闭。');
  }

  function createSurface(canvas, width, height) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    var context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return {
      canvas: canvas,
      context: context,
      dpr: dpr,
      width: width,
      height: height
    };
  }

  var gameSurface = createSurface(el.canvas, W, H);
  var ctx = gameSurface.context;
  var nextSurface = createSurface(el.nextCanvas, 112, 112);
  var introSurface = createSurface(el.introCanvas, 320, 112);
  var mobileNextSurface = createSurface(el.mobileNextCanvas, 52, 52);

  function resetSurface(surface) {
    surface.context.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    surface.context.clearRect(0, 0, surface.width, surface.height);
  }

  /* ---------- 游戏状态 ---------- */

  var legacyBest = Number(readStored(STORAGE_BEST, 0));
  if (!isFinite(legacyBest) || legacyBest < 0) {
    legacyBest = 0;
  }
  legacyBest = Math.floor(legacyBest);

  var soundEnabled = readStored(STORAGE_SOUND, 'on') !== 'off';

  var game = {
    state: 'intro',
    fruits: [],
    particles: [],
    rings: [],
    floaters: [],
    score: 0,
    best: 0,
    player: null,
    newRecordThisRun: false,
    playerOverlayOpen: false,
    playerOverlayReturnState: null,
    mobileBoardOpen: false,
    mobileBoardReturnState: null,
    touchAiming: false,
    touchPointerId: null,
    currentTier: 0,
    nextTier: 0,
    cooldown: 0,
    aimX: W / 2,
    overflow: 0,
    dangerAnnounced: false,
    shake: 0,
    elapsed: 0,
    maxTierReached: 0,
    accumulator: 0,
    lastFrame: 0,
    keys: { left: false, right: false }
  };

  var fruitId = 0;
  var lastDangerText = '';
  var audioContext = null;
  var memoryPlayers = null;
  var leaderboardChannel = null;
  var leaderboardSyncTimer = 0;

  /* ---------- 水果工厂 ---------- */

  function randomDropTier() {
    var weights = [0.28, 0.27, 0.22, 0.15, 0.08];
    var roll = Math.random();
    var total = 0;
    for (var i = 0; i < weights.length && i <= MAX_DROP_TIER; i += 1) {
      total += weights[i];
      if (roll <= total) {
        return i;
      }
    }
    return MAX_DROP_TIER;
  }

  function randomStarterTier() {
    var roll = Math.random();
    if (roll < 0.42) return 0;
    if (roll < 0.76) return 1;
    return 2;
  }

  function createFruit(tier, x, y, options) {
    var type = FRUIT_TYPES[tier];
    var opts = options || {};
    var mass = Math.pow(type.radius / 15, 2);
    return {
      id: ++fruitId,
      tier: tier,
      x: x,
      y: y,
      vx: typeof opts.vx === 'number' ? opts.vx : 0,
      vy: typeof opts.vy === 'number' ? opts.vy : 0,
      radius: type.radius,
      mass: mass,
      invMass: 1 / mass,
      angle: typeof opts.angle === 'number' ? opts.angle : (Math.random() - 0.5) * 0.16,
      spin: typeof opts.spin === 'number' ? opts.spin : (Math.random() - 0.5) * 0.24,
      age: 0,
      dead: false
    };
  }

  function heldRadius() {
    var tier = game.currentTier === null ? game.nextTier : game.currentTier;
    return FRUIT_TYPES[tier].radius;
  }

  function clampAim() {
    var radius = heldRadius();
    game.aimX = clamp(game.aimX, WALL + radius + 1, W - WALL - radius - 1);
  }

  /* ---------- 界面同步 ---------- */

  function updateScoreDisplay(withBump) {
    el.score.textContent = formatScore(game.score);
    el.score.style.fontSize = '';
    if (String(game.score).length >= 6) {
      el.score.style.fontSize = '25px';
    } else if (String(game.score).length === 5) {
      el.score.style.fontSize = '29px';
    }

    if (withBump) {
      el.score.classList.remove('bump');
      void el.score.offsetWidth;
      el.score.classList.add('bump');
    }

    if (game.score > game.best) {
      game.best = game.score;
      updateBestDisplay();

      var bestResult = updatePlayerBest(game.score);
      if (bestResult.player && bestResult.player.best > game.best) {
        game.best = bestResult.player.best;
        updateBestDisplay();
      }
      if (bestResult.improved) {
        game.newRecordThisRun = true;
      }
    }
  }

  function updateBestDisplay() {
    el.best.textContent = formatScore(game.best);
  }

  function updateNextPanel() {
    var type = FRUIT_TYPES[game.nextTier];
    el.nextName.textContent = type.name;
    el.nextMeta.textContent = '第 ' + (game.nextTier + 1) + ' 级水果';
    el.nextHint.textContent = NEXT_TIPS[Math.min(game.nextTier, NEXT_TIPS.length - 1)];
    if (el.mobileNext) {
      el.mobileNext.setAttribute('aria-label', '下一颗水果：' + type.name);
    }
    drawNextPreview(game.nextTier);
  }

  function updatePauseButton() {
    var canPause = (game.state === 'playing' || game.state === 'paused') && !game.playerOverlayOpen && !game.mobileBoardOpen;
    var isPaused = game.state === 'paused';
    el.pauseBtn.disabled = !canPause;
    el.pauseBtn.classList.toggle('is-paused', isPaused);
    el.pauseLabel.textContent = isPaused ? '继续' : '暂停';
    el.pauseBtn.setAttribute('aria-label', isPaused ? '继续游戏' : '暂停游戏');
    el.pauseBtn.title = isPaused ? '继续游戏（P）' : '暂停游戏（P）';
  }

  function hideDangerToast() {
    el.dangerToast.hidden = true;
    lastDangerText = '';
  }

  function showDangerToast() {
    if (el.dangerToast.hidden) {
      el.dangerToast.hidden = false;
    }
    var remaining = Math.max(0, DANGER_LIMIT - game.overflow).toFixed(1);
    if (remaining !== lastDangerText) {
      lastDangerText = remaining;
      el.dangerCountdown.textContent = remaining;
    }
  }

  /* ---------- 下一颗 / 介绍画面 ---------- */

  function drawNextPreview(tier) {
    resetSurface(nextSurface);
    var pctx = nextSurface.context;
    var cx = 56;
    var cy = 58;
    var previewRadius = Math.min(30, 22 + tier * 0.86);

    pctx.save();
    pctx.strokeStyle = 'rgba(166, 119, 56, 0.14)';
    pctx.lineWidth = 1;
    pctx.setLineDash([2, 5]);
    pctx.beginPath();
    pctx.arc(cx, cy, 39, 0, TAU);
    pctx.stroke();
    pctx.restore();

    drawFruit(pctx, cx, cy, previewRadius, tier, -0.07);

    resetSurface(mobileNextSurface);
    var mobileContext = mobileNextSurface.context;
    drawFruit(mobileContext, 26, 27, Math.min(18, 15 + tier * 0.65), tier, -0.06);
  }

  function drawIntroPreview() {
    resetSurface(introSurface);
    var pctx = introSurface.context;

    pctx.save();
    pctx.fillStyle = 'rgba(152, 113, 65, 0.075)';
    pctx.beginPath();
    pctx.ellipse(104, 101, 26, 5, 0, 0, TAU);
    pctx.ellipse(169, 101, 32, 5, 0, 0, TAU);
    pctx.ellipse(237, 101, 38, 5.5, 0, 0, TAU);
    pctx.fill();
    pctx.restore();

    pctx.save();
    pctx.fillStyle = 'rgba(224, 161, 88, 0.45)';
    pctx.beginPath();
    pctx.arc(60, 34, 2.2, 0, TAU);
    pctx.arc(287, 42, 1.6, 0, TAU);
    pctx.fill();
    pctx.fillStyle = 'rgba(110, 143, 78, 0.38)';
    pctx.beginPath();
    pctx.arc(277, 83, 2.4, 0, TAU);
    pctx.fill();
    pctx.restore();

    drawFruit(pctx, 104, 64, 22, 0, -0.09);
    drawFruit(pctx, 169, 59, 28, 1, 0.05);
    drawFruit(pctx, 237, 62, 35, 6, -0.035);
  }

  function buildEvolutionChain() {
    el.evolutionChain.innerHTML = '';
    FRUIT_TYPES.forEach(function (type, index) {
      var item = document.createElement('span');
      item.className = 'chain-item';
      item.title = type.name + ' · 第 ' + (index + 1) + ' 级';

      var dot = document.createElement('span');
      dot.className = 'chain-dot';
      var size = 8 + index * 1.3;
      dot.style.width = size.toFixed(1) + 'px';
      dot.style.height = size.toFixed(1) + 'px';
      dot.style.setProperty('--dot-light', type.light);
      dot.style.setProperty('--dot', type.base);
      dot.style.setProperty('--dot-dark', type.dark);
      item.appendChild(dot);

      if (index < FRUIT_TYPES.length - 1) {
        var arrow = document.createElement('span');
        arrow.className = 'chain-arrow';
        arrow.textContent = '›';
        item.appendChild(arrow);
      }

      el.evolutionChain.appendChild(item);
    });
  }

  /* ---------- 音效 ---------- */

  function ensureAudio() {
    if (!soundEnabled) return null;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContext) {
      try {
        audioContext = new AudioCtx();
      } catch (error) {
        return null;
      }
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(function () {});
    }
    return audioContext;
  }

  function playTone(frequency, duration, type, volume, slideTo, delay) {
    if (!soundEnabled) return;
    var ac = ensureAudio();
    if (!ac) return;
    try {
      var start = ac.currentTime + (delay || 0);
      var oscillator = ac.createOscillator();
      var gain = ac.createGain();
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      if (slideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ac.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.035);
    } catch (error) {
      /* 某些浏览器会拒绝被中断的音频节点，忽略即可 */
    }
  }

  function sfxStart() {
    playTone(392, 0.12, 'sine', 0.026, 470);
    playTone(587, 0.16, 'sine', 0.019, 660, 0.07);
  }

  function sfxDrop() {
    playTone(185, 0.08, 'sine', 0.018, 120);
  }

  function sfxMerge(tier) {
    var base = 280 * Math.pow(2, Math.min(tier, 6) / 12);
    playTone(base, 0.12, 'triangle', 0.03, base * 1.14);
    playTone(base * 1.5, 0.15, 'sine', 0.019, base * 1.7, 0.045);
  }

  function sfxExplode() {
    playTone(150, 0.25, 'sawtooth', 0.024, 70);
    playTone(290, 0.3, 'triangle', 0.022, 140, 0.03);
    playTone(520, 0.22, 'sine', 0.018, 210, 0.08);
  }

  function sfxGameOver() {
    var notes = [330, 277, 220, 165];
    notes.forEach(function (frequency, index) {
      playTone(frequency, 0.22, 'triangle', 0.025, frequency * 0.86, index * 0.12);
    });
  }

  function setSoundEnabled(enabled, withFeedback) {
    soundEnabled = Boolean(enabled);
    el.soundBtn.setAttribute('aria-pressed', String(soundEnabled));
    el.soundBtn.setAttribute('aria-label', soundEnabled ? '关闭音效' : '打开音效');
    el.soundLabel.textContent = soundEnabled ? '音效开' : '音效关';
    writeStored(STORAGE_SOUND, soundEnabled ? 'on' : 'off');
    if (soundEnabled && withFeedback) {
      ensureAudio();
      playTone(620, 0.09, 'sine', 0.018, 760);
    }
  }

  /* ---------- 回合控制 ---------- */

  function prepareRound() {
    game.fruits = [];
    game.particles = [];
    game.rings = [];
    game.floaters = [];
    game.score = 0;
    game.newRecordThisRun = false;
    game.currentTier = randomStarterTier();
    game.nextTier = randomDropTier();
    game.cooldown = 0;
    game.aimX = W / 2;
    game.overflow = 0;
    game.dangerAnnounced = false;
    game.shake = 0;
    game.elapsed = 0;
    game.maxTierReached = game.currentTier;
    game.accumulator = 0;
    game.keys.left = false;
    game.keys.right = false;
    game.touchAiming = false;
    game.touchPointerId = null;
    lastDangerText = '';
    hideDangerToast();
    updateScoreDisplay(false);
    updateBestDisplay();
    updateNextPanel();
    clampAim();
  }

  function startGame() {
    if (!game.player) {
      initializePlayer();
    }

    var latestPlayers = loadPlayers();
    if (game.player) {
      var latestPlayer = findPlayerById(latestPlayers, game.player.id);
      if (latestPlayer) {
        game.player = latestPlayer;
        game.best = latestPlayer.best;
      }
    }

    updateBestDisplay();
    updateCurrentPlayerUI();
    prepareRound();

    game.state = 'playing';
    game.playerOverlayOpen = false;
    game.playerOverlayReturnState = null;
    game.mobileBoardOpen = false;
    game.mobileBoardReturnState = null;
    game.lastFrame = performance.now();
    document.body.classList.remove('mobile-board-open');
    el.mobileBoardScrim.hidden = true;
    el.mobileBoardBtn.setAttribute('aria-expanded', 'false');
    el.leaderboardCard.removeAttribute('role');
    el.leaderboardCard.removeAttribute('aria-modal');
    el.introOverlay.hidden = true;
    el.gameOverOverlay.hidden = true;
    el.pauseOverlay.hidden = true;
    el.playerOverlay.hidden = true;
    renderLeaderboard();
    updatePauseButton();
    ensureAudio();
    sfxStart();
    setLiveMessage('游戏开始。当前玩家 ' + (game.player ? game.player.name : '') + '，移动指针选择位置，点击或按空格投下水果。');
    try {
      el.canvas.focus({ preventScroll: true });
    } catch (error) {
      el.canvas.focus();
    }
  }

  function handleIntroStart() {
    var name = readNameField(el.playerNameInput, el.playerNameError);
    if (!name) return;
    if (!selectPlayer(name)) return;
    startGame();
  }

  function endGame() {
    if (game.state !== 'playing') return;

    game.state = 'gameover';
    game.accumulator = 0;
    game.keys.left = false;
    game.keys.right = false;
    game.touchAiming = false;
    game.touchPointerId = null;
    hideDangerToast();
    updatePauseButton();

    var finalBestResult = updatePlayerBest(game.score);
    if (finalBestResult.player && finalBestResult.player.best > game.best) {
      game.best = finalBestResult.player.best;
    }
    var madeRecord = (game.newRecordThisRun || finalBestResult.improved) && game.score > 0;

    updateBestDisplay();
    updateCurrentPlayerUI();
    el.finalScore.textContent = formatScore(game.score);
    el.finalBest.textContent = formatScore(game.best);
    el.newRecordBadge.hidden = !madeRecord;

    var finalRank = game.player ? getPlayerRank(game.player.id) : 0;
    el.resultRank.textContent = finalRank ? '第 ' + finalRank + ' 名' : '未上榜';

    if (game.maxTierReached >= 9) {
      el.resultNote.textContent = '你把水果合到了西瓜，果园已经很热闹了。再来一局，冲击更高分。';
    } else if (game.maxTierReached >= 7) {
      el.resultNote.textContent = '苹果和水蜜桃都出现了，离西瓜只差一点点。';
    } else if (game.maxTierReached >= 5) {
      el.resultNote.textContent = '果堆越叠越高，下一局记得给大水果留一点空间。';
    } else {
      el.resultNote.textContent = '水果们挤成了一团，试着先从角落慢慢合成。';
    }

    el.gameOverOverlay.hidden = false;
    game.shake = 7;
    sfxGameOver();
    setLiveMessage('游戏结束。玩家 ' + (game.player ? game.player.name : '') + '，本局得分 ' + game.score + ' 分，' + (finalRank ? '排行榜第 ' + finalRank + ' 名' : '暂未上榜') + '。按 R 或点击再玩一次重新开始。');

    window.setTimeout(function () {
      if (game.state === 'gameover') {
        el.restartBtn.focus({ preventScroll: true });
      }
    }, 220);
  }

  function togglePause() {
    if (game.playerOverlayOpen || game.mobileBoardOpen) return;

    if (game.state === 'playing') {
      game.state = 'paused';
      game.keys.left = false;
      game.keys.right = false;
      el.pauseOverlay.hidden = false;
      updatePauseButton();
      setLiveMessage('游戏已暂停。按 P 或点击继续游戏。');
      el.resumeBtn.focus({ preventScroll: true });
    } else if (game.state === 'paused') {
      game.state = 'playing';
      game.accumulator = 0;
      el.pauseOverlay.hidden = true;
      updatePauseButton();
      setLiveMessage('继续游戏。');
      try {
        el.canvas.focus({ preventScroll: true });
      } catch (error) {
        el.canvas.focus();
      }
    }
  }

  /* ---------- 投果与合成 ---------- */

  function dropHeldFruit() {
    if (game.state !== 'playing' || game.currentTier === null || game.cooldown > 0) {
      return;
    }

    var tier = game.currentTier;
    var radius = FRUIT_TYPES[tier].radius;
    var x = clamp(game.aimX, WALL + radius + 1, W - WALL - radius - 1);
    var fruit = createFruit(tier, x, DROP_Y, {
      vy: 55,
      angle: (Math.random() - 0.5) * 0.12,
      spin: (Math.random() - 0.5) * 0.42
    });

    game.fruits.push(fruit);
    game.maxTierReached = Math.max(game.maxTierReached, tier);
    game.aimX = x;
    game.currentTier = null;
    game.cooldown = SPAWN_DELAY;
    sfxDrop();
  }

  function processMerges(merges) {
    if (!merges.length) return;

    var removedAny = false;

    merges.forEach(function (pair) {
      var a = pair[0];
      var b = pair[1];
      if (a.dead || b.dead) return;

      a.dead = true;
      b.dead = true;
      removedAny = true;

      var baseTier = a.tier;
      var midX = (a.x + b.x) / 2;
      var midY = (a.y + b.y) / 2;
      var averageVx = (a.vx + b.vx) * 0.5;
      var averageVy = (a.vy + b.vy) * 0.5;

      if (baseTier >= MAX_TIER) {
        game.score += 300;
        game.maxTierReached = MAX_TIER;
        spawnMergeEffect(midX, midY, baseTier, MAX_TIER, 300, true);
        game.shake = Math.max(game.shake, 8);
        updateScoreDisplay(true);
        sfxExplode();
        return;
      }

      var newTier = baseTier + 1;
      var newType = FRUIT_TYPES[newTier];
      var newRadius = newType.radius;
      var newX = clamp(midX, WALL + newRadius + 1, W - WALL - newRadius - 1);
      var newY = Math.max(newRadius + 3, midY);
      var merged = createFruit(newTier, newX, newY, {
        vx: averageVx * 0.55,
        vy: Math.min(-20, averageVy * 0.32 - 25),
        angle: (Math.random() - 0.5) * 0.14,
        spin: (Math.random() - 0.5) * 0.38
      });

      game.fruits.push(merged);
      game.score += newType.points;
      game.maxTierReached = Math.max(game.maxTierReached, newTier);
      spawnMergeEffect(newX, newY, baseTier, newTier, newType.points, false);
      game.shake = Math.max(game.shake, Math.min(6, 1.6 + newTier * 0.52));
      updateScoreDisplay(true);
      sfxMerge(newTier);
    });

    if (removedAny) {
      game.fruits = game.fruits.filter(function (fruit) {
        return !fruit.dead;
      });
    }
  }

  function spawnMergeEffect(x, y, baseTier, newTier, points, isMax) {
    var sourceType = FRUIT_TYPES[baseTier];
    var resultType = FRUIT_TYPES[newTier];
    var palette = [sourceType.light, sourceType.base, resultType.accent, '#f3c66f'];
    var amount = isMax ? 28 : 12 + Math.min(10, newTier);
    var power = isMax ? 1.65 : 0.75 + newTier * 0.065;

    for (var i = 0; i < amount; i += 1) {
      var angle = Math.random() * TAU;
      var speed = (42 + Math.random() * 115) * power;
      var maxLife = 0.48 + Math.random() * 0.52;
      game.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        size: 1.8 + Math.random() * 4.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        rotation: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 8,
        life: maxLife,
        maxLife: maxLife,
        gravity: 380 + Math.random() * 180,
        shape: Math.random() < 0.18 ? 'leaf' : 'dot'
      });
    }

    game.rings.push({
      x: x,
      y: y,
      radius: 8,
      maxRadius: isMax ? 118 : 34 + newTier * 4.2,
      speed: isMax ? 175 : 105,
      life: isMax ? 0.6 : 0.42,
      maxLife: isMax ? 0.6 : 0.42,
      color: isMax ? 'rgba(236, 174, 84, 0.55)' : hexToRgba(resultType.light, 0.55)
    });

    game.floaters.push({
      x: x,
      y: y - 8,
      vy: -38,
      life: 1.0,
      maxLife: 1.0,
      text: '+' + points,
      color: isMax ? '#a45a1f' : '#a64632',
      size: isMax ? 19 : 14
    });

    if (isMax) {
      game.floaters.push({
        x: x,
        y: y - 34,
        vy: -26,
        life: 1.35,
        maxLife: 1.35,
        text: '西瓜爆汁！',
        color: '#7b4d24',
        size: 14
      });
    } else if (newTier >= 7) {
      game.floaters.push({
        x: x,
        y: y - 32,
        vy: -26,
        life: 1.2,
        maxLife: 1.2,
        text: '合成 ' + resultType.name,
        color: '#7c5a3b',
        size: 12
      });
    }
  }

  /* ---------- 物理 ---------- */

  function updateCooldown(dt) {
    if (game.currentTier !== null || game.cooldown <= 0) return;
    game.cooldown -= dt;
    if (game.cooldown <= 0) {
      game.cooldown = 0;
      game.currentTier = game.nextTier;
      game.nextTier = randomDropTier();
      clampAim();
      updateNextPanel();
    }
  }

  function moveAimWithKeyboard(dt) {
    var direction = 0;
    if (game.keys.left) direction -= 1;
    if (game.keys.right) direction += 1;
    if (!direction) return;
    game.aimX += direction * 340 * dt;
    clampAim();
  }

  function constrainToWalls(fruit) {
    var minX = WALL + fruit.radius;
    var maxX = W - WALL - fruit.radius;
    var floorY = H - FLOOR - fruit.radius;
    var ceilingY = fruit.radius + 1;

    if (fruit.x < minX) {
      fruit.x = minX;
      if (fruit.vx < 0) fruit.vx = -fruit.vx * 0.12;
    } else if (fruit.x > maxX) {
      fruit.x = maxX;
      if (fruit.vx > 0) fruit.vx = -fruit.vx * 0.12;
    }

    if (fruit.y > floorY) {
      fruit.y = floorY;
      if (fruit.vy > 0) fruit.vy = -fruit.vy * 0.045;
      fruit.vx *= 0.965;
      fruit.spin *= 0.91;
      if (Math.abs(fruit.vx) < 1.2) fruit.vx = 0;
    }

    if (fruit.y < ceilingY) {
      fruit.y = ceilingY;
      if (fruit.vy < 0) fruit.vy *= -0.08;
    }
  }

  function resolvePair(a, b, distance, normalX, normalY) {
    var minDistance = a.radius + b.radius;
    var overlap = minDistance - distance;
    if (overlap <= 0) return;

    var invSum = a.invMass + b.invMass;
    if (invSum <= 0) return;

    var correction = overlap * 0.82 / invSum;
    a.x -= normalX * correction * a.invMass;
    a.y -= normalY * correction * a.invMass;
    b.x += normalX * correction * b.invMass;
    b.y += normalY * correction * b.invMass;

    var relativeVx = b.vx - a.vx;
    var relativeVy = b.vy - a.vy;
    var normalSpeed = relativeVx * normalX + relativeVy * normalY;

    if (normalSpeed < 0) {
      var impulse = -(1 + RESTITUTION) * normalSpeed / invSum;
      a.vx -= impulse * normalX * a.invMass;
      a.vy -= impulse * normalY * a.invMass;
      b.vx += impulse * normalX * b.invMass;
      b.vy += impulse * normalY * b.invMass;

      var tangentX = -normalY;
      var tangentY = normalX;
      var tangentSpeed = (b.vx - a.vx) * tangentX + (b.vy - a.vy) * tangentY;
      var frictionImpulse = -tangentSpeed / invSum;
      var maxFriction = Math.abs(impulse) * 0.34;
      frictionImpulse = clamp(frictionImpulse, -maxFriction, maxFriction);

      a.vx -= frictionImpulse * tangentX * a.invMass;
      a.vy -= frictionImpulse * tangentY * a.invMass;
      b.vx += frictionImpulse * tangentX * b.invMass;
      b.vy += frictionImpulse * tangentY * b.invMass;
    }
  }

  function stepPhysics(dt) {
    var fruits = game.fruits;
    var i;
    var j;

    for (i = 0; i < fruits.length; i += 1) {
      var fruit = fruits[i];
      fruit.age += dt;
      fruit.vy += GRAVITY * dt;
      fruit.vx *= 0.9993;
      fruit.vy *= 0.9997;
      fruit.x += fruit.vx * dt;
      fruit.y += fruit.vy * dt;
      fruit.angle += fruit.spin * dt;
      fruit.spin *= 1 - 1.15 * dt;

      if (fruit.vx > 1250) fruit.vx = 1250;
      if (fruit.vx < -1250) fruit.vx = -1250;
      if (fruit.vy > 1400) fruit.vy = 1400;
      if (fruit.vy < -1100) fruit.vy = -1100;
    }

    var merges = [];
    var pending = {};

    for (var iteration = 0; iteration < 4; iteration += 1) {
      for (i = 0; i < fruits.length; i += 1) {
        constrainToWalls(fruits[i]);
      }

      for (i = 0; i < fruits.length; i += 1) {
        var a = fruits[i];
        if (a.dead) continue;

        for (j = i + 1; j < fruits.length; j += 1) {
          var b = fruits[j];
          if (b.dead) continue;

          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var minDistance = a.radius + b.radius;
          var distanceSquared = dx * dx + dy * dy;

          if (distanceSquared >= minDistance * minDistance) continue;

          var distance = Math.sqrt(distanceSquared);
          if (distance < 0.001) {
            distance = 0.001;
            dx = 0.001;
            dy = 0;
          }

          if (a.tier === b.tier) {
            if (!pending[a.id] && !pending[b.id]) {
              pending[a.id] = true;
              pending[b.id] = true;
              merges.push([a, b]);
            }
            continue;
          }

          resolvePair(a, b, distance, dx / distance, dy / distance);
        }
      }
    }

    for (i = 0; i < fruits.length; i += 1) {
      constrainToWalls(fruits[i]);
    }

    if (merges.length) {
      processMerges(merges);
    }
  }

  function updateDanger(dt) {
    var aboveLine = false;

    for (var i = 0; i < game.fruits.length; i += 1) {
      var fruit = game.fruits[i];
      if (!fruit.dead && fruit.age > 0.75 && fruit.y - fruit.radius < LINE_Y) {
        aboveLine = true;
        break;
      }
    }

    if (aboveLine) {
      game.overflow += dt;
      showDangerToast();

      if (!game.dangerAnnounced) {
        game.dangerAnnounced = true;
        setLiveMessage('注意，果堆超过警戒线，两秒后游戏结束。');
      }

      if (game.overflow >= DANGER_LIMIT) {
        endGame();
      }
    } else {
      if (game.overflow > 0) {
        game.overflow = 0;
        hideDangerToast();
      }
      game.dangerAnnounced = false;
    }
  }

  function stepGame(dt) {
    game.elapsed += dt;
    updateCooldown(dt);
    moveAimWithKeyboard(dt);
    stepPhysics(dt);
    updateDanger(dt);
  }

  /* ---------- 特效 ---------- */

  function updateEffects(dt) {
    if (game.state === 'paused' || game.state === 'intro') return;

    game.shake = Math.max(0, game.shake - 26 * dt);

    for (var i = game.particles.length - 1; i >= 0; i -= 1) {
      var particle = game.particles[i];
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rotation += particle.spin * dt;
      particle.life -= dt;
      if (particle.life <= 0) {
        game.particles.splice(i, 1);
      }
    }

    for (var r = game.rings.length - 1; r >= 0; r -= 1) {
      var ring = game.rings[r];
      ring.radius += ring.speed * dt;
      ring.life -= dt;
      if (ring.life <= 0) {
        game.rings.splice(r, 1);
      }
    }

    for (var f = game.floaters.length - 1; f >= 0; f -= 1) {
      var floater = game.floaters[f];
      floater.y += floater.vy * dt;
      floater.vy *= 0.985;
      floater.life -= dt;
      if (floater.life <= 0) {
        game.floaters.splice(f, 1);
      }
    }
  }

  /* ---------- 绘制：水果 ---------- */

  function roundedRectPath(context, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawStemAndLeaf(context, radius, type) {
    var r = radius;
    var leafColor = type.leaf;

    if (type.style === 'strawberry') {
      context.save();
      context.translate(0, -r * 0.84);
      context.fillStyle = leafColor;
      for (var leaf = -2; leaf <= 2; leaf += 1) {
        context.save();
        context.rotate(leaf * 0.38);
        context.beginPath();
        context.ellipse(0, -r * 0.13, r * 0.11, r * 0.23, 0, 0, TAU);
        context.fill();
        context.restore();
      }
      context.restore();

      context.save();
      context.strokeStyle = '#6f5a36';
      context.lineWidth = Math.max(1.2, r * 0.045);
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(0, -r * 0.92);
      context.quadraticCurveTo(r * 0.03, -r * 1.08, r * 0.13, -r * 1.05);
      context.stroke();
      context.restore();
      return;
    }

    context.save();
    context.strokeStyle = type.style === 'watermelon' || type.style === 'melon' ? '#6b7040' : '#70583a';
    context.lineWidth = Math.max(1.2, r * 0.05);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-r * 0.05, -r * 0.84);
    context.quadraticCurveTo(r * 0.01, -r * 1.02, r * 0.12, -r * 1.07);
    context.stroke();
    context.restore();

    context.save();
    context.translate(r * 0.18, -r * 0.92);
    context.rotate(-0.54);
    context.fillStyle = leafColor;
    context.beginPath();
    context.ellipse(0, 0, r * 0.3, r * 0.13, 0, 0, TAU);
    context.fill();
    context.strokeStyle = 'rgba(52, 81, 39, 0.23)';
    context.lineWidth = Math.max(0.8, r * 0.018);
    context.beginPath();
    context.moveTo(-r * 0.2, 0);
    context.lineTo(r * 0.22, 0);
    context.stroke();
    context.restore();
  }

  function drawFruitPattern(context, radius, type) {
    var r = radius;
    var i;

    context.save();

    if (type.style === 'cherry') {
      context.strokeStyle = 'rgba(255, 244, 235, 0.22)';
      context.lineWidth = r * 0.08;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(-r * 0.2, -r * 0.16, r * 0.48, Math.PI * 1.05, Math.PI * 1.47);
      context.stroke();
      context.fillStyle = 'rgba(109, 22, 40, 0.12)';
      context.beginPath();
      context.arc(r * 0.34, r * 0.4, r * 0.23, 0, TAU);
      context.fill();
    } else if (type.style === 'strawberry') {
      var seeds = [
        [-0.4, -0.56], [-0.07, -0.64], [0.3, -0.57], [0.53, -0.35],
        [-0.55, -0.26], [-0.25, -0.3], [0.12, -0.35], [0.42, -0.18],
        [-0.45, 0.1], [-0.1, 0.05], [0.28, 0.08], [0.52, 0.24],
        [-0.28, 0.4], [0.08, 0.36], [0.36, 0.46]
      ];
      context.fillStyle = 'rgba(255, 240, 195, 0.82)';
      seeds.forEach(function (seed, index) {
        context.save();
        context.translate(seed[0] * r, seed[1] * r);
        context.rotate(-0.35 + (index % 2) * 0.25);
        context.beginPath();
        context.ellipse(0, 0, r * 0.032, r * 0.06, 0, 0, TAU);
        context.fill();
        context.restore();
      });
    } else if (type.style === 'grape') {
      var grapes = [
        [-0.42, -0.48], [-0.13, -0.55], [0.22, -0.52], [0.48, -0.3],
        [-0.53, -0.16], [-0.22, -0.19], [0.16, -0.22], [0.45, -0.02],
        [-0.42, 0.2], [-0.1, 0.17], [0.22, 0.2], [0.46, 0.3]
      ];
      grapes.forEach(function (position, index) {
        context.fillStyle = index % 3 === 0 ? 'rgba(255, 236, 255, 0.16)' : 'rgba(86, 42, 128, 0.1)';
        context.beginPath();
        context.arc(position[0] * r, position[1] * r, r * 0.155, 0, TAU);
        context.fill();
      });
    } else if (type.style === 'lemon') {
      context.fillStyle = 'rgba(154, 108, 12, 0.14)';
      var lemonDots = [
        [-0.52, -0.4], [-0.18, -0.55], [0.25, -0.48], [0.53, -0.18],
        [-0.4, -0.05], [0.42, 0.12], [-0.52, 0.32], [0.06, 0.48],
        [0.38, 0.46], [-0.25, 0.28], [0.15, 0.1], [-0.05, -0.22]
      ];
      lemonDots.forEach(function (dot) {
        context.beginPath();
        context.arc(dot[0] * r, dot[1] * r, r * 0.022, 0, TAU);
        context.fill();
      });
    } else if (type.style === 'kiwi') {
      context.fillStyle = 'rgba(240, 247, 205, 0.94)';
      context.beginPath();
      context.arc(0, 0, r * 0.54, 0, TAU);
      context.fill();
      context.strokeStyle = 'rgba(228, 239, 183, 0.9)';
      context.lineWidth = r * 0.035;
      context.beginPath();
      context.arc(0, 0, r * 0.54, 0, TAU);
      context.stroke();
      context.fillStyle = 'rgba(63, 83, 39, 0.56)';
      for (i = 0; i < 14; i += 1) {
        var angle = (i / 14) * TAU + 0.12;
        var distance = r * (0.31 + (i % 3) * 0.045);
        context.save();
        context.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
        context.rotate(angle + Math.PI / 2);
        context.beginPath();
        context.ellipse(0, 0, r * 0.025, r * 0.055, 0, 0, TAU);
        context.fill();
        context.restore();
      }
      context.fillStyle = 'rgba(255, 251, 220, 0.85)';
      context.beginPath();
      context.arc(0, 0, r * 0.1, 0, TAU);
      context.fill();
    } else if (type.style === 'orange') {
      context.fillStyle = 'rgba(255, 229, 185, 0.28)';
      var orangeDots = [
        [-0.5, -0.46], [-0.17, -0.56], [0.21, -0.5], [0.5, -0.26],
        [-0.44, -0.12], [0.42, 0.03], [-0.55, 0.25], [0.12, 0.48],
        [0.39, 0.39], [-0.27, 0.43], [0.03, 0.22], [0.22, -0.14]
      ];
      orangeDots.forEach(function (dot) {
        context.beginPath();
        context.arc(dot[0] * r, dot[1] * r, r * 0.03, 0, TAU);
        context.fill();
      });
      context.strokeStyle = 'rgba(184, 101, 10, 0.12)';
      context.lineWidth = r * 0.018;
      context.beginPath();
      context.arc(0, 0, r * 0.68, Math.PI * 1.13, Math.PI * 1.48);
      context.stroke();
    } else if (type.style === 'peach') {
      context.strokeStyle = 'rgba(169, 77, 73, 0.22)';
      context.lineWidth = r * 0.032;
      context.beginPath();
      context.moveTo(-r * 0.04, -r * 0.63);
      context.quadraticCurveTo(r * 0.18, r * 0.02, -r * 0.05, r * 0.63);
      context.stroke();
      context.fillStyle = 'rgba(255, 236, 226, 0.23)';
      context.beginPath();
      context.ellipse(-r * 0.28, -r * 0.32, r * 0.32, r * 0.16, -0.6, 0, TAU);
      context.fill();
    } else if (type.style === 'apple') {
      context.strokeStyle = 'rgba(126, 23, 42, 0.13)';
      context.lineWidth = r * 0.04;
      context.beginPath();
      context.arc(-r * 0.49, -r * 0.02, r * 0.48, Math.PI * 1.55, Math.PI * 0.48);
      context.stroke();
      context.fillStyle = 'rgba(255, 231, 212, 0.2)';
      context.beginPath();
      context.ellipse(-r * 0.24, -r * 0.42, r * 0.25, r * 0.13, -0.55, 0, TAU);
      context.fill();
    } else if (type.style === 'melon') {
      context.strokeStyle = 'rgba(255, 251, 223, 0.42)';
      context.lineWidth = Math.max(0.8, r * 0.018);
      var verticals = [-0.58, -0.2, 0.18, 0.55];
      verticals.forEach(function (offset) {
        context.beginPath();
        context.moveTo(offset * r, -r * 0.98);
        context.bezierCurveTo(
          offset * r + r * 0.22, -r * 0.4,
          offset * r - r * 0.2, r * 0.4,
          offset * r, r * 0.98
        );
        context.stroke();
      });
      var horizontals = [-0.55, -0.12, 0.32, 0.7];
      horizontals.forEach(function (offset) {
        context.beginPath();
        context.moveTo(-r * 0.96, offset * r);
        context.bezierCurveTo(
          -r * 0.33, offset * r + r * 0.18,
          r * 0.33, offset * r - r * 0.18,
          r * 0.96, offset * r
        );
        context.stroke();
      });
    } else if (type.style === 'watermelon') {
      context.strokeStyle = 'rgba(30, 100, 55, 0.52)';
      context.lineWidth = r * 0.125;
      context.lineCap = 'round';
      var stripes = [-0.67, -0.28, 0.16, 0.59];
      stripes.forEach(function (offset) {
        context.beginPath();
        context.moveTo(offset * r, -r * 1.02);
        context.bezierCurveTo(
          offset * r + r * 0.23, -r * 0.37,
          offset * r - r * 0.21, r * 0.37,
          offset * r, r * 1.02
        );
        context.stroke();
      });
      context.fillStyle = 'rgba(255, 255, 231, 0.14)';
      context.beginPath();
      context.arc(r * 0.38, r * 0.46, r * 0.17, 0, TAU);
      context.fill();
    }

    context.restore();
  }

  function drawFace(context, radius) {
    var r = radius;
    var eyeY = -r * 0.055;
    var eyeX = r * 0.235;
    var eyeRadius = Math.max(1.25, r * 0.056);
    var glint = Math.max(0.5, eyeRadius * 0.36);
    var mouthY = r * 0.15;

    context.save();

    context.fillStyle = 'rgba(241, 101, 107, 0.2)';
    context.beginPath();
    context.ellipse(-r * 0.4, r * 0.19, r * 0.12, r * 0.068, 0, 0, TAU);
    context.ellipse(r * 0.4, r * 0.19, r * 0.12, r * 0.068, 0, 0, TAU);
    context.fill();

    context.fillStyle = '#493329';
    context.beginPath();
    context.ellipse(-eyeX, eyeY, eyeRadius, eyeRadius * 1.24, 0, 0, TAU);
    context.ellipse(eyeX, eyeY, eyeRadius, eyeRadius * 1.24, 0, 0, TAU);
    context.fill();

    context.fillStyle = 'rgba(255, 253, 245, 0.94)';
    context.beginPath();
    context.arc(-eyeX - eyeRadius * 0.23, eyeY - eyeRadius * 0.34, glint, 0, TAU);
    context.arc(eyeX - eyeRadius * 0.23, eyeY - eyeRadius * 0.34, glint, 0, TAU);
    context.fill();

    context.strokeStyle = 'rgba(77, 48, 37, 0.86)';
    context.lineWidth = Math.max(1.05, r * 0.024);
    context.lineCap = 'round';
    context.beginPath();
    context.arc(0, mouthY - r * 0.02, r * 0.135, Math.PI * 0.17, Math.PI * 0.83);
    context.stroke();

    context.restore();
  }

  function drawFruit(context, x, y, radius, tier, angle, alpha) {
    var type = FRUIT_TYPES[tier];
    var r = radius;
    var opacity = typeof alpha === 'number' ? alpha : 1;

    context.save();
    context.globalAlpha *= opacity;
    context.translate(x, y);
    context.rotate(typeof angle === 'number' ? angle : 0);

    drawStemAndLeaf(context, r, type);

    context.save();
    context.shadowColor = 'rgba(77, 50, 24, 0.19)';
    context.shadowBlur = Math.max(3, r * 0.18);
    context.shadowOffsetY = Math.max(2, r * 0.075);

    var bodyGradient = context.createRadialGradient(
      -r * 0.34, -r * 0.38, Math.max(1, r * 0.08),
      0, 0, r * 1.04
    );
    bodyGradient.addColorStop(0, type.light);
    bodyGradient.addColorStop(0.48, type.base);
    bodyGradient.addColorStop(1, type.dark);

    context.beginPath();
    context.arc(0, 0, r, 0, TAU);
    context.fillStyle = bodyGradient;
    context.fill();
    context.restore();

    context.save();
    context.beginPath();
    context.arc(0, 0, r, 0, TAU);
    context.clip();

    drawFruitPattern(context, r, type);

    var rimGradient = context.createRadialGradient(0, 0, r * 0.64, 0, 0, r);
    rimGradient.addColorStop(0, 'rgba(70, 35, 20, 0)');
    rimGradient.addColorStop(1, hexToRgba(type.dark, 0.25));
    context.fillStyle = rimGradient;
    context.beginPath();
    context.arc(0, 0, r, 0, TAU);
    context.fill();

    context.fillStyle = 'rgba(255, 252, 240, 0.3)';
    context.beginPath();
    context.ellipse(-r * 0.34, -r * 0.43, r * 0.24, r * 0.12, -0.58, 0, TAU);
    context.fill();

    context.restore();

    context.beginPath();
    context.arc(0, 0, r - 0.4, 0, TAU);
    context.strokeStyle = hexToRgba(type.dark, 0.58);
    context.lineWidth = Math.max(1.15, r * 0.028);
    context.stroke();

    drawFace(context, r);

    context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    context.lineWidth = Math.max(1, r * 0.028);
    context.beginPath();
    context.arc(0, 0, r * 0.87, Math.PI * 1.1, Math.PI * 1.36);
    context.stroke();

    context.restore();
  }

  /* ---------- 绘制：场景 ---------- */

  var backgroundDots = [];
  (function buildBackgroundDots() {
    for (var y = 25; y < H; y += 27) {
      for (var x = 23; x < W; x += 27) {
        var seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        var fraction = seed - Math.floor(seed);
        backgroundDots.push([
          x + (fraction - 0.5) * 8,
          y + (fraction * 6.71 - Math.floor(fraction * 6.71) - 0.5) * 7
        ]);
      }
    }
  }());

  function drawBoard(time) {
    var background = ctx.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, '#fffbf3');
    background.addColorStop(0.52, '#fcf5e8');
    background.addColorStop(1, '#f7eddb');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);

    var sunlight = ctx.createRadialGradient(72, 34, 0, 72, 34, 285);
    sunlight.addColorStop(0, 'rgba(255, 234, 194, 0.46)');
    sunlight.addColorStop(0.55, 'rgba(255, 241, 213, 0.13)');
    sunlight.addColorStop(1, 'rgba(255, 247, 231, 0)');
    ctx.fillStyle = sunlight;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.fillStyle = 'rgba(126, 94, 55, 0.12)';
    backgroundDots.forEach(function (dot) {
      ctx.beginPath();
      ctx.arc(dot[0], dot[1], 0.72, 0, TAU);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(155, 116, 70, 0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(50, 330, 122, 0, TAU);
    ctx.arc(385, 215, 93, 0, TAU);
    ctx.arc(210, 565, 146, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 252, 244, 0.48)';
    ctx.fillRect(WALL, 0, W - WALL * 2, LINE_Y);

    var topFade = ctx.createLinearGradient(0, LINE_Y, 0, LINE_Y + 26);
    topFade.addColorStop(0, 'rgba(255, 250, 239, 0.28)');
    topFade.addColorStop(1, 'rgba(255, 250, 239, 0)');
    ctx.fillStyle = topFade;
    ctx.fillRect(WALL, LINE_Y, W - WALL * 2, 26);

    var leftWall = ctx.createLinearGradient(0, 0, WALL, 0);
    leftWall.addColorStop(0, '#d5b781');
    leftWall.addColorStop(0.55, '#ead2a8');
    leftWall.addColorStop(1, '#f0ddba');
    ctx.fillStyle = leftWall;
    ctx.fillRect(0, 0, WALL, H);

    var rightWall = ctx.createLinearGradient(W - WALL, 0, W, 0);
    rightWall.addColorStop(0, '#f0ddba');
    rightWall.addColorStop(0.45, '#ead2a8');
    rightWall.addColorStop(1, '#d5b781');
    ctx.fillStyle = rightWall;
    ctx.fillRect(W - WALL, 0, WALL, H);

    ctx.fillStyle = 'rgba(255, 251, 237, 0.44)';
    ctx.fillRect(WALL, 0, 1, H - FLOOR);
    ctx.fillRect(W - WALL - 1, 0, 1, H - FLOOR);

    var floorY = H - FLOOR;
    var floorGradient = ctx.createLinearGradient(0, floorY, 0, H);
    floorGradient.addColorStop(0, '#e2c795');
    floorGradient.addColorStop(0.28, '#d6b783');
    floorGradient.addColorStop(1, '#c3a06d');
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, floorY, W, FLOOR);

    ctx.fillStyle = 'rgba(255, 251, 238, 0.5)';
    ctx.fillRect(WALL, floorY, W - WALL * 2, 1);

    ctx.save();
    ctx.strokeStyle = 'rgba(128, 91, 49, 0.13)';
    ctx.lineWidth = 1;
    for (var x = 22; x < W; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, floorY + 4);
      ctx.lineTo(x - 7, H - 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCordon(time) {
    var danger = game.state === 'playing' && game.overflow > 0;

    if (danger) {
      var warningGlow = ctx.createLinearGradient(0, 0, 0, LINE_Y + 8);
      warningGlow.addColorStop(0, 'rgba(213, 74, 55, 0.13)');
      warningGlow.addColorStop(0.72, 'rgba(213, 74, 55, 0.045)');
      warningGlow.addColorStop(1, 'rgba(213, 74, 55, 0)');
      ctx.fillStyle = warningGlow;
      ctx.fillRect(WALL, 0, W - WALL * 2, LINE_Y + 8);
    }

    var pulse = danger ? 0.7 + Math.sin(time * 9) * 0.15 : 1;
    ctx.save();
    ctx.strokeStyle = danger
      ? 'rgba(188, 57, 43, ' + (0.54 + pulse * 0.25).toFixed(3) + ')'
      : 'rgba(178, 107, 71, 0.46)';
    ctx.lineWidth = danger ? 2.2 : 1.4;
    ctx.setLineDash(danger ? [6, 5] : [6, 7]);
    ctx.lineDashOffset = danger ? -time * 26 : 0;
    ctx.beginPath();
    ctx.moveTo(WALL + 4, LINE_Y + 0.5);
    ctx.lineTo(W - WALL - 4, LINE_Y + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = danger ? 'rgba(188, 57, 43, 0.72)' : 'rgba(178, 107, 71, 0.38)';
    ctx.beginPath();
    ctx.arc(WALL + 4, LINE_Y + 0.5, 2.1, 0, TAU);
    ctx.arc(W - WALL - 4, LINE_Y + 0.5, 2.1, 0, TAU);
    ctx.fill();

    var label = danger
      ? Math.max(0, DANGER_LIMIT - game.overflow).toFixed(1) + 's'
      : '警戒线';
    ctx.font = danger ? '800 10px "Microsoft YaHei", sans-serif' : '700 9.5px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var labelWidth = ctx.measureText(label).width + (danger ? 16 : 18);
    var tagX = W - WALL - labelWidth - 7;
    var tagY = LINE_Y - 24;
    roundedRectPath(ctx, tagX, tagY, labelWidth, 18, 6);
    ctx.fillStyle = danger ? '#b84032' : 'rgba(255, 249, 238, 0.92)';
    ctx.fill();
    if (!danger) {
      ctx.strokeStyle = 'rgba(178, 107, 71, 0.28)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.fillStyle = danger ? '#fff5e8' : '#a47150';
    ctx.fillText(label, tagX + labelWidth / 2, tagY + 9.2);
    ctx.restore();
  }

  function drawFruits() {
    var ordered = game.fruits.slice().sort(function (a, b) {
      return a.y - b.y;
    });
    ordered.forEach(function (fruit) {
      drawFruit(ctx, fruit.x, fruit.y, fruit.radius, fruit.tier, fruit.angle);
    });
  }

  function drawAim(time) {
    if (game.state !== 'playing' || game.currentTier === null) return;

    var radius = FRUIT_TYPES[game.currentTier].radius;
    var x = clamp(game.aimX, WALL + radius + 1, W - WALL - radius - 1);
    var bobY = DROP_Y + Math.sin(time * 3.1) * 2.2;

    ctx.save();
    ctx.strokeStyle = game.touchAiming ? 'rgba(201, 102, 72, 0.38)' : 'rgba(201, 102, 72, 0.24)';
    ctx.lineWidth = game.touchAiming ? 1.5 : 1.1;
    ctx.setLineDash([3, 7]);
    ctx.lineDashOffset = -time * 8;
    ctx.beginPath();
    ctx.moveTo(x, bobY + radius + 6);
    ctx.lineTo(x, game.touchAiming ? H - FLOOR - 5 : Math.min(H - FLOOR - 12, bobY + radius + 105));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = game.touchAiming ? 'rgba(201, 102, 72, 0.42)' : 'rgba(201, 102, 72, 0.17)';
    ctx.lineWidth = game.touchAiming ? 1.8 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x - (game.touchAiming ? 10 : 6), H - FLOOR - 5);
    ctx.lineTo(x + (game.touchAiming ? 10 : 6), H - FLOOR - 5);
    ctx.stroke();

    if (game.touchAiming) {
      ctx.fillStyle = 'rgba(201, 102, 72, 0.42)';
      ctx.beginPath();
      ctx.arc(x, H - FLOOR - 5, 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    drawFruit(ctx, x, bobY, radius, game.currentTier, Math.sin(time * 1.65) * 0.045);
  }

  function drawEffects() {
    game.rings.forEach(function (ring) {
      var progress = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = progress * 0.72;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2.5 * progress + 0.4;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    });

    game.particles.forEach(function (particle) {
      var progress = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      if (particle.shape === 'leaf') {
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size * 1.7, particle.size * 0.72, 0, 0, TAU);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * progress + 0.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    });

    game.floaters.forEach(function (floater) {
      var progress = clamp(floater.life / floater.maxLife, 0, 1);
      var alpha = progress < 0.25 ? progress / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 ' + floater.size + 'px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 250, 240, 0.9)';
      ctx.lineWidth = 3.2;
      ctx.strokeText(floater.text, floater.x, floater.y);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.restore();
    });
  }

  function render(time) {
    var surface = gameSurface;
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#fbf4e5';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (game.shake > 0.1) {
      var amount = game.shake;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    drawBoard(time);
    drawFruits();
    drawCordon(time);
    drawAim(time);
    drawEffects();

    ctx.restore();
  }

  /* ---------- 帧循环 ---------- */

  function frame(now) {
    if (!game.lastFrame) {
      game.lastFrame = now;
    }

    var dt = (now - game.lastFrame) / 1000;
    game.lastFrame = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.05);

    if (game.state === 'playing') {
      game.accumulator += dt;
      var steps = 0;
      while (game.accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
        stepGame(FIXED_STEP);
        game.accumulator -= FIXED_STEP;
        steps += 1;
        if (game.state !== 'playing') break;
      }
      if (steps >= MAX_STEPS_PER_FRAME) {
        game.accumulator = 0;
      }
    }

    updateEffects(dt);
    render(now / 1000);
    window.requestAnimationFrame(frame);
  }

  /* ---------- 输入 ---------- */

  function setAimFromPointer(clientX) {
    var rect = el.canvas.getBoundingClientRect();
    if (!rect.width) return;
    var x = (clientX - rect.left) * (W / rect.width);
    game.aimX = clamp(x, 0, W);
    clampAim();
  }

  function isTouchLikePointer(event) {
    return event.pointerType === 'touch' || event.pointerType === 'pen';
  }

  function releaseTouchAim() {
    if (game.touchPointerId !== null) {
      try {
        el.canvas.releasePointerCapture(game.touchPointerId);
      } catch (error) {
        /* 指针捕获已释放时忽略 */
      }
    }
    game.touchAiming = false;
    game.touchPointerId = null;
  }

  el.canvas.addEventListener('pointermove', function (event) {
    if (game.state !== 'playing') return;
    setAimFromPointer(event.clientX);
  });

  el.canvas.addEventListener('pointerdown', function (event) {
    if (game.state !== 'playing') return;

    if (isTouchLikePointer(event)) {
      if (!event.isPrimary) return;
      event.preventDefault();
      setAimFromPointer(event.clientX);
      game.touchAiming = true;
      game.touchPointerId = event.pointerId;
      try {
        el.canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        /* 某些浏览器不支持指针捕获 */
      }
      return;
    }

    event.preventDefault();
    setAimFromPointer(event.clientX);
    dropHeldFruit();
  });

  el.canvas.addEventListener('pointerup', function (event) {
    if (!isTouchLikePointer(event)) return;
    if (!game.touchAiming || event.pointerId !== game.touchPointerId) return;

    event.preventDefault();
    var shouldDrop = game.state === 'playing';
    if (shouldDrop) {
      setAimFromPointer(event.clientX);
    }
    releaseTouchAim();

    if (shouldDrop) {
      dropHeldFruit();
    }
  });

  el.canvas.addEventListener('pointercancel', function (event) {
    if (event.pointerId === game.touchPointerId) {
      releaseTouchAim();
    }
  });

  el.canvas.addEventListener('pointerleave', function () {
    if (game.state === 'playing') {
      el.canvas.style.cursor = 'crosshair';
    }
  });

  window.addEventListener('keydown', function (event) {
    var target = event.target;
    var isButton = target && target.closest && target.closest('button, a, input, textarea, select');
    var isTypingTarget = target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]');

    if (game.mobileBoardOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileBoard();
      }
      return;
    }

    if (game.playerOverlayOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePlayerOverlay();
      }
      return;
    }

    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      if (game.state === 'playing') {
        if (event.code === 'ArrowLeft') game.keys.left = true;
        if (event.code === 'ArrowRight') game.keys.right = true;
        event.preventDefault();
      }
      return;
    }

    if (event.code === 'Space') {
      if (game.state === 'playing' && !isButton) {
        event.preventDefault();
        dropHeldFruit();
      }
      return;
    }

    var key = event.key ? event.key.toLowerCase() : '';

    if (key === 'p') {
      if (!isTypingTarget && (game.state === 'playing' || game.state === 'paused')) {
        event.preventDefault();
        togglePause();
      }
      return;
    }

    if (key === 'r') {
      if (!isTypingTarget) {
        event.preventDefault();
        if (game.state === 'intro') {
          handleIntroStart();
        } else {
          startGame();
        }
      }
      return;
    }

    if (key === 'escape') {
      if (!isTypingTarget && (game.state === 'playing' || game.state === 'paused')) {
        event.preventDefault();
        togglePause();
      }
    }
  });

  window.addEventListener('keyup', function (event) {
    if (event.code === 'ArrowLeft') game.keys.left = false;
    if (event.code === 'ArrowRight') game.keys.right = false;
  });

  window.addEventListener('blur', function () {
    game.keys.left = false;
    game.keys.right = false;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && game.state === 'playing') {
      togglePause();
    }
  });

  el.startBtn.addEventListener('click', handleIntroStart);
  el.restartBtn.addEventListener('click', startGame);
  el.restartSide.addEventListener('click', function () {
    if (game.state === 'intro') {
      handleIntroStart();
    } else {
      startGame();
    }
  });
  el.resumeBtn.addEventListener('click', togglePause);
  el.pauseBtn.addEventListener('click', togglePause);
  el.mobileBoardBtn.addEventListener('click', openMobileBoard);
  el.closeBoardBtn.addEventListener('click', closeMobileBoard);
  el.mobileBoardScrim.addEventListener('click', closeMobileBoard);
  el.switchPlayerBtn.addEventListener('click', function () {
    if (game.playerOverlayOpen) return;
    if (game.mobileBoardOpen) {
      closeMobileBoard();
    }
    openPlayerOverlay();
  });
  el.switchStartBtn.addEventListener('click', confirmPlayerSwitch);
  el.switchCancelBtn.addEventListener('click', closePlayerOverlay);

  var mobileViewportQuery = window.matchMedia('(max-width: 620px)');
  var handleMobileViewportChange = function (event) {
    if (!event.matches && game.mobileBoardOpen) {
      closeMobileBoard();
    }
  };
  if (mobileViewportQuery.addEventListener) {
    mobileViewportQuery.addEventListener('change', handleMobileViewportChange);
  } else if (mobileViewportQuery.addListener) {
    mobileViewportQuery.addListener(handleMobileViewportChange);
  }

  el.playerNameInput.addEventListener('input', function () {
    setFieldError(el.playerNameInput, el.playerNameError, '');
  });

  el.switchNameInput.addEventListener('input', function () {
    setFieldError(el.switchNameInput, el.switchNameError, '');
  });

  el.playerNameInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      handleIntroStart();
    }
  });

  el.switchNameInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      confirmPlayerSwitch();
    }
  });

  el.soundBtn.addEventListener('click', function () {
    setSoundEnabled(!soundEnabled, true);
  });

  /* ---------- 初始化 ---------- */

  buildEvolutionChain();
  setupLeaderboardSync();
  initializePlayer();
  setSoundEnabled(soundEnabled, false);
  updateBestDisplay();
  prepareRound();
  game.state = 'intro';
  updatePauseButton();
  drawIntroPreview();
  game.lastFrame = performance.now();
  window.requestAnimationFrame(frame);
}());
