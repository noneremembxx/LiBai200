const screens = Array.from(document.querySelectorAll('.screen'));
const enterButton = document.getElementById('enterButton');
const moonButton = document.getElementById('moonButton');
const poemWall = document.getElementById('poemWall');

const poem = [
  '青天有月來幾時 我今停杯一問之',
  '人攀明月不可得 月行却與人相隨',
  '皎如飛鏡臨丹闕 綠煙滅盡清輝發',
  '但見宵從海上來 寧知曉向雲間沒',
  '白兔搗藥秋復春 姮娥孤棲與誰鄰',
  '今人不見古時月 今月曾經照古人',
  '古人今人若流水 共看明月皆如此',
  '唯願當歌對酒時 月光長照金樽裏'
];

const screenRoutes = {
  index: 'mainScreen',
  main: 'mainScreen',
  home: 'mainScreen',
  characters: 'charactersScreen',
  misuhui: 'misuhuiScreen',
  young: 'youngScreen',
  yeon: 'yeonScreen',
  jeongseo: 'jeongseoScreen',
  kuro: 'kuroScreen'
};

const screenToPath = {
  mainScreen: 'index.html',
  charactersScreen: 'index.html#characters',
  misuhuiScreen: 'misuhui.html',
  youngScreen: 'young.html',
  yeonScreen: 'yeon.html',
  jeongseoScreen: 'jeongseo.html',
  kuroScreen: 'kuro.html'
};

const routeAliases = {
  '미수희': 'misuhui',
  '영': 'young',
  '연': 'yeon',
  '정서': 'jeongseo',
  '쿠로': 'kuro'
};

function getInitialScreenFromLocation() {
  const pathName = window.location.pathname.split('/').pop().replace(/\.html$/i, '');
  const hashName = window.location.hash.replace(/^#\/?/, '').trim();
  const routeName = routeAliases[hashName] || hashName || pathName || 'index';

  return screenRoutes[routeName] || 'mainScreen';
}

function updateAddressForScreen(screenId) {
  const path = screenToPath[screenId];
  if (!path) return;

  const current = `${window.location.pathname.split('/').pop()}${window.location.hash}`;
  if (current === path) return;

  window.history.pushState({ screenId }, '', path);
}


const profileScreen = document.getElementById('liBaiProfileScreen');
const profileDocument = profileScreen ? profileScreen.querySelector('.profile-document') : null;
const profileTypeTargets = [];
const PROFILE_SECTION_TYPE_DELAY = 26;
const PROFILE_SECTION_GAP_MS = 180;

let profileTypingObserver = null;
let profileScrollHandler = null;
let profileTypingActiveTarget = null;

if (profileDocument) {
  let reachedSummary = false;

  Array.from(profileDocument.children).forEach((node) => {
    if (node.tagName === 'H2' && node.textContent.trim() === '종합 소견') {
      reachedSummary = true;
      return;
    }

    if (!reachedSummary && node.tagName === 'P' && !node.classList.contains('profile-report-title')) {
      node.dataset.fullHtml = node.innerHTML;
      node.dataset.profileOrder = String(profileTypeTargets.length);
      profileTypeTargets.push(node);
    }
  });
}

function tokenizeProfileHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const tokens = [];

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const char of node.textContent) {
        tokens.push({ type: 'text', value: char });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName.toLowerCase();
    if (tagName === 'br') {
      tokens.push({ type: 'tag', value: '<br>' });
      return;
    }

    const attrs = Array.from(node.attributes)
      .map((attr) => ` ${attr.name}="${String(attr.value).replace(/"/g, '&quot;')}"`)
      .join('');

    tokens.push({ type: 'tag', value: `<${tagName}${attrs}>` });
    node.childNodes.forEach(walk);
    tokens.push({ type: 'tag', value: `</${tagName}>` });
  };

  temp.childNodes.forEach(walk);
  return tokens;
}

function clearProfileDocumentTimers(target = null) {
  const targets = target ? [target] : profileTypeTargets;

  targets.forEach((item) => {
    if (item.__profileTypingTimer) {
      clearTimeout(item.__profileTypingTimer);
      item.__profileTypingTimer = null;
    }
  });

  if (window.__profileDocumentTimer) {
    clearTimeout(window.__profileDocumentTimer);
    window.__profileDocumentTimer = null;
  }
}

function measureProfileTypingTargets() {
  profileTypeTargets.forEach((target) => {
    if (!target.dataset.fullHtml) {
      target.dataset.fullHtml = target.innerHTML;
    }

    target.innerHTML = target.dataset.fullHtml;
    target.classList.remove('profile-typing-active', 'profile-typed', 'profile-queued');
    target.style.minHeight = '';

    const measuredHeight = target.getBoundingClientRect().height;
    target.dataset.minHeight = `${Math.ceil(measuredHeight)}px`;
  });
}

function prepareProfileTypingTargets() {
  measureProfileTypingTargets();

  profileTypeTargets.forEach((target) => {
    target.innerHTML = '';
    target.style.minHeight = target.dataset.minHeight || '';
    target.classList.remove('profile-typing-active', 'profile-typed', 'profile-queued');
    target.dataset.typingStarted = 'false';
    target.dataset.queued = 'false';
  });

  profileTypingActiveTarget = null;
}

function restoreProfileTypingTargets() {
  profileTypeTargets.forEach((target) => {
    clearProfileDocumentTimers(target);

    if (target.dataset.fullHtml) {
      target.innerHTML = target.dataset.fullHtml;
    }

    target.style.minHeight = '';
    target.classList.remove('profile-typing-active', 'profile-typed', 'profile-queued');
    target.dataset.typingStarted = 'false';
    target.dataset.queued = 'false';
  });

  profileTypingActiveTarget = null;
}

function getQueuedProfileTarget() {
  return profileTypeTargets.find((target) => (
    target.dataset.queued === 'true' &&
    target.dataset.typingStarted !== 'true' &&
    !target.classList.contains('profile-typed')
  ));
}

function processProfileTypingQueue() {
  if (!profileScreen || !profileScreen.classList.contains('is-active')) return;
  if (profileTypingActiveTarget) return;

  const nextTarget = getQueuedProfileTarget();
  if (!nextTarget) return;

  typeProfileBlock(nextTarget, processProfileTypingQueue);
}

function queueProfileBlock(target) {
  if (!target) return;
  if (target.dataset.typingStarted === 'true') return;
  if (target.classList.contains('profile-typed')) return;

  target.dataset.queued = 'true';
  target.classList.add('profile-queued');
  processProfileTypingQueue();
}

function typeProfileBlock(target, onDone) {
  if (!target || target.dataset.typingStarted === 'true') {
    if (typeof onDone === 'function') onDone();
    return;
  }

  profileTypingActiveTarget = target;
  target.dataset.typingStarted = 'true';
  target.dataset.queued = 'false';
  target.classList.remove('profile-queued');
  target.classList.add('profile-typing-active');

  const tokens = tokenizeProfileHtml(target.dataset.fullHtml || target.innerHTML || '');
  let htmlBuffer = '';
  let index = 0;

  const step = () => {
    if (!profileScreen || !profileScreen.classList.contains('is-active')) return;

    let consumedText = 0;

    while (index < tokens.length && consumedText < 4) {
      const token = tokens[index];
      htmlBuffer += token.value;
      index += 1;

      if (token.type === 'text') {
        consumedText += 1;
      }
    }

    target.innerHTML = htmlBuffer;

    if (index < tokens.length) {
      const nextDelay = PROFILE_SECTION_TYPE_DELAY + Math.floor(Math.random() * 18);
      target.__profileTypingTimer = setTimeout(step, nextDelay);
      return;
    }

    target.classList.remove('profile-typing-active');
    target.classList.add('profile-typed');
    target.style.minHeight = '';
    target.__profileTypingTimer = null;
    profileTypingActiveTarget = null;

    if (typeof onDone === 'function') {
      window.__profileDocumentTimer = setTimeout(onDone, PROFILE_SECTION_GAP_MS);
    }
  };

  target.__profileTypingTimer = setTimeout(step, PROFILE_SECTION_GAP_MS);
}

function triggerVisibleProfileBlocks() {
  if (!profileScreen || !profileScreen.classList.contains('is-active')) return;

  const profileRect = profileScreen.getBoundingClientRect();
  const triggerLine = profileRect.bottom - Math.min(profileRect.height * 0.18, 140);

  profileTypeTargets.forEach((target) => {
    if (target.dataset.typingStarted === 'true') return;
    if (target.classList.contains('profile-typed')) return;
    const rect = target.getBoundingClientRect();

    if (rect.top < triggerLine && rect.bottom > profileRect.top + 12) {
      queueProfileBlock(target);
    }
  });
}

function disconnectProfileTypingObserver() {
  if (profileTypingObserver) {
    profileTypingObserver.disconnect();
    profileTypingObserver = null;
  }

  if (profileScrollHandler && profileScreen) {
    profileScreen.removeEventListener('scroll', profileScrollHandler);
    window.removeEventListener('resize', profileScrollHandler);
    profileScrollHandler = null;
  }
}

function startProfileDocumentTyping() {
  clearProfileDocumentTimers();
  disconnectProfileTypingObserver();
  prepareProfileTypingTargets();

  if (!profileScreen) return;

  if ('IntersectionObserver' in window) {
    profileTypingObserver = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Number(a.target.dataset.profileOrder || 0) - Number(b.target.dataset.profileOrder || 0))
        .forEach((entry) => {
          queueProfileBlock(entry.target);
          if (profileTypingObserver) {
            profileTypingObserver.unobserve(entry.target);
          }
        });
    }, {
      root: profileScreen,
      threshold: 0.08,
      rootMargin: '0px 0px -12% 0px'
    });

    profileTypeTargets.forEach((target) => profileTypingObserver.observe(target));
  } else {
    profileScrollHandler = () => {
      window.requestAnimationFrame(triggerVisibleProfileBlocks);
    };

    profileScreen.addEventListener('scroll', profileScrollHandler, { passive: true });
    window.addEventListener('resize', profileScrollHandler);
  }

  window.__profileDocumentTimer = setTimeout(triggerVisibleProfileBlocks, 120);
}

function stopProfileDocumentTyping() {
  clearProfileDocumentTimers();
  disconnectProfileTypingObserver();
  restoreProfileTypingTargets();
}

function showScreen(screenId, options = {}) {
  screens.forEach((screen) => {
    const isActive = screen.id === screenId;
    screen.classList.toggle('is-active', isActive);
    screen.setAttribute('aria-hidden', String(!isActive));
  });

  if (screenId === 'liBaiProfileScreen') {
    startProfileDocumentTyping();
  } else {
    stopProfileDocumentTyping();
  }

  if (!options.skipHistory) {
    updateAddressForScreen(screenId);
  }
}




function fillPoemWall() {
  poemWall.textContent = '';

  const repeatedText = `${poem.join('　')}　`;
  const lineCount = Math.ceil(window.innerHeight / 54) + 5;

  for (let i = 0; i < lineCount; i += 1) {
    const line = document.createElement('div');
    line.className = 'poem-line';
    line.textContent = repeatedText.repeat(3);
    poemWall.appendChild(line);
  }
}

fillPoemWall();
window.addEventListener('resize', fillPoemWall);

window.addEventListener('popstate', () => {
  showScreen(getInitialScreenFromLocation(), { skipHistory: true });
});

document.addEventListener('DOMContentLoaded', () => {
  showScreen(getInitialScreenFromLocation(), { skipHistory: true });
});

enterButton.addEventListener('click', () => {
  showScreen('poemScreen');
});

moonButton.addEventListener('click', () => {
  showScreen('charactersScreen');
});

document.addEventListener('click', (event) => {
  const targetButton = event.target.closest('[data-target]');
  if (!targetButton) return;
  showScreen(targetButton.dataset.target);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  const activeScreen = document.querySelector('.screen.is-active');
  if (!activeScreen || activeScreen.id === 'mainScreen') return;

  if (activeScreen.classList.contains('screen-detail')) {
    showScreen('charactersScreen');
    return;
  }

  if (activeScreen.id === 'liBaiProfileScreen') {
    showScreen('poemScreen');
    return;
  }

  showScreen('mainScreen');
});




function resetYoungSequentialText() {
  const youngScreen = document.getElementById('youngScreen');
  if (!youngScreen) return;

  const steps = Array.from(youngScreen.querySelectorAll('.young-step'));
  steps.forEach((step, index) => {
    step.classList.toggle('is-visible', index === 0);
  });

  youngScreen.querySelectorAll('.young-next-inline').forEach((button) => {
    button.classList.remove('is-used');
  });
}

function showNextYoungStep(clickedButton) {
  const youngScreen = document.getElementById('youngScreen');
  if (!youngScreen) return;

  if (clickedButton) {
    clickedButton.classList.add('is-used');
  }

  const steps = Array.from(youngScreen.querySelectorAll('.young-step'));
  const nextIndex = steps.findIndex((step) => !step.classList.contains('is-visible'));

  if (nextIndex === -1) return;

  steps[nextIndex].classList.add('is-visible');
}

document.addEventListener('click', (event) => {
  const nextButton = event.target.closest('.young-next-inline');
  if (!nextButton) return;

  event.preventDefault();
  event.stopPropagation();
  showNextYoungStep(nextButton);
});


function resetScreenSequence(screenId) {
  const screen = document.getElementById(screenId);
  if (!screen) return;

  let steps = Array.from(screen.querySelectorAll('.sequence-step'));
  if (!steps.length) {
    steps = Array.from(screen.querySelectorAll('.young-step'));
  }
  if (!steps.length) return;

  steps.forEach((step, index) => {
    step.classList.toggle('is-visible', index === 0);
  });

  screen.querySelectorAll('.sequence-next-inline, .young-next-inline').forEach((button) => {
    button.classList.remove('is-used');
  });
}

function showNextSequenceStep(clickedButton) {
  const screen = clickedButton.closest('.screen');
  if (!screen) return;

  clickedButton.classList.add('is-used');

  let steps = Array.from(screen.querySelectorAll('.sequence-step'));
  if (!steps.length) {
    steps = Array.from(screen.querySelectorAll('.young-step'));
  }

  const nextIndex = steps.findIndex((step) => !step.classList.contains('is-visible'));

  if (nextIndex === -1) return;

  steps[nextIndex].classList.add('is-visible');
}

document.addEventListener('click', (event) => {
  const nextButton = event.target.closest('.sequence-next-inline');
  if (!nextButton) return;

  event.preventDefault();
  event.stopPropagation();
  showNextSequenceStep(nextButton);
});


document.addEventListener('DOMContentLoaded', () => {
  resetScreenSequence('yeonScreen');
  resetScreenSequence('youngScreen');
});


// v61: unified blink timing for all character-page moon-phase overlays.
document.addEventListener('DOMContentLoaded', () => {
  const overlaySelectors = [
    '.misuhui-phase-overlay',
    '.young-phase-overlay',
    '.yeon-phase-overlay',
    '.jeongseo-phase-overlay',
    '.kuro-phase-overlay'
  ];

  const overlays = overlaySelectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  overlays.forEach((overlay) => {
    overlay.classList.remove('blink-off');
  });

  if (window.__phaseBlinkTimer) {
    clearInterval(window.__phaseBlinkTimer);
  }

  let isVisible = true;
  window.__phaseBlinkTimer = setInterval(() => {
    isVisible = !isVisible;
    overlays.forEach((overlay) => {
      overlay.classList.toggle('blink-off', !isVisible);
    });
  }, 650);
});


document.addEventListener('DOMContentLoaded', () => {
  const activeProfileScreen = document.getElementById('liBaiProfileScreen');
  if (activeProfileScreen && activeProfileScreen.classList.contains('is-active')) {
    startProfileDocumentTyping();
  }
});



// v73: normalize Young page steps so the common next handler always sees them.
document.addEventListener('DOMContentLoaded', () => {
  const youngScreen = document.getElementById('youngScreen');
  if (!youngScreen) return;

  youngScreen.querySelectorAll('.young-step').forEach((step) => {
    step.classList.add('sequence-step');
  });

  resetScreenSequence('youngScreen');
});
