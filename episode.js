(() => {
  const root = document.querySelector('[data-episode]');
  if (!root || root.dataset.mounted === 'true') return;
  root.dataset.mounted = 'true';
  const forceMotion = ['localhost','127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('motion') === '1';
  if (forceMotion) document.documentElement.classList.add('force-motion');

  const steps = [
    {id:'raw-input', group:'input', duration:2400, short:'Life arrives', caption:'Blood glucose, insulin, sleep, heart rate, and context arrive as one messy moment.'},
    {id:'perceive', group:'perception', duration:2300, short:'Perception', caption:'Perception circles the raw observations and compresses them into a compact current state.'},
    {id:'retrieve', group:'memory', duration:2400, short:'Memory', caption:'Memory recognizes the shape of the moment and retrieves similar episodes, context, and beliefs.'},
    {id:'configure', group:'configure', duration:2100, short:'Configure', caption:'The configurator joins the current state, relevant memory, goals, and constraints into one working brief.'},
    {id:'propose', group:'search', duration:1750, short:'Propose', caption:'Inside MCTS, the actor proposes a few plausible actions.'},
    {id:'simulate', group:'search', duration:2050, short:'Imagine', caption:'The world model grows a small tree of futures for those candidates.'},
    {id:'score', group:'search', duration:1550, short:'Score', caption:'Cost annotates the branches while constraints identify what is not allowed.'},
    {id:'prune', group:'search', duration:1600, short:'Search deeper', caption:'Metacognition spends more search where another look could change the answer.'},
    {id:'choose', group:'action', duration:1500, short:'Choose', caption:'Search returns the best-supported root action; the other imagined branches fall back into pencil.'},
    {id:'act', group:'action', duration:1300, short:'Act', caption:'The chosen action leaves the model and is implemented in the real world.'},
    {id:'observe', group:'reality', duration:2300, short:'Reality answers', caption:'Reality answers. The observed glucose trace is compared with what the system expected.'},
    {id:'learn', group:'feedback', duration:2100, short:'Learn', caption:'The outcome returns as an episode, prediction error, and reward or regret—not one generic flash.'},
    {id:'consolidate', group:'sleep', duration:2100, short:'Consolidate', caption:'Sleep replays the episode and keeps the patterns and skills that earn a place.'}
  ];
  const groupOrder = ['input','perception','memory','configure','search','action','reality','feedback','sleep'];
  const groupStart = Object.fromEntries(groupOrder.map(group => [group, steps.findIndex(step => step.group === group)]));
  const caption = root.querySelector('[data-flow-caption]');
  const progress = root.querySelector('[data-flow-progress]');
  const live = root.querySelector('[data-flow-live]');
  const toggle = root.querySelector('[data-flow-toggle]');
  const replay = root.querySelector('[data-flow-replay]');
  const previous = root.querySelector('[data-flow-prev]');
  const next = root.querySelector('[data-flow-next]');
  const markers = [...root.querySelectorAll('[data-flow-jump]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => reduced.matches && !forceMotion;
  let index = 0;
  let timer = 0;
  let dueAt = 0;
  let remaining = steps[0].duration;
  let playing = false;
  let autoplayed = false;

  const clearTimer = () => { if (timer) clearTimeout(timer); timer = 0; };

  function updateMarkers() {
    const activeGroup = steps[index].group;
    const activeGroupIndex = groupOrder.indexOf(activeGroup);
    markers.forEach(button => {
      const group = button.dataset.flowJump;
      const markerIndex = groupOrder.indexOf(group);
      const active = group === activeGroup;
      button.classList.toggle('is-active', active);
      button.classList.toggle('is-visited', markerIndex < activeGroupIndex);
      if (active) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
  }

  function setStep(nextIndex, {announce=false} = {}) {
    index = Math.max(0, Math.min(nextIndex, steps.length - 1));
    const step = steps[index];
    root.dataset.state = step.id;
    root.dataset.group = step.group;
    steps.forEach((item, i) => root.classList.toggle(`has-visited-${item.id}`, i <= index));
    caption.textContent = step.caption;
    progress.textContent = `Step ${index + 1} of ${steps.length} · ${step.short}`;
    previous.disabled = index === 0;
    next.disabled = index === steps.length - 1;
    updateMarkers();
    if (announce) live.textContent = `Step ${index + 1} of ${steps.length}: ${step.caption}`;
  }

  function finish() {
    playing = false;
    clearTimer();
    root.classList.remove('is-playing','is-paused');
    root.classList.add('is-complete');
    toggle.textContent = 'play again';
    toggle.setAttribute('aria-pressed','false');
  }

  function schedule(ms = steps[index].duration) {
    clearTimer();
    if (!playing) return;
    remaining = ms;
    dueAt = performance.now() + ms;
    timer = setTimeout(() => {
      if (!playing) return;
      if (index >= steps.length - 1) finish();
      else { setStep(index + 1); schedule(); }
    }, ms);
  }

  function play({restart=false} = {}) {
    if (isReduced()) return renderStatic();
    if (restart || index >= steps.length - 1) {
      clearTimer();
      setStep(0);
      remaining = steps[0].duration;
      root.classList.remove('is-complete');
      void root.offsetWidth;
    }
    playing = true;
    root.classList.add('is-playing');
    root.classList.remove('is-paused','is-complete','is-static');
    toggle.textContent = 'pause';
    toggle.setAttribute('aria-pressed','false');
    schedule(remaining || steps[index].duration);
  }

  function pause({announce=false} = {}) {
    if (!playing) return;
    remaining = Math.max(120, dueAt - performance.now());
    playing = false;
    clearTimer();
    root.classList.remove('is-playing');
    root.classList.add('is-paused');
    toggle.textContent = 'resume';
    toggle.setAttribute('aria-pressed','true');
    if (announce) live.textContent = 'Episode paused.';
  }

  function jump(nextIndex, {announce=true} = {}) {
    if (playing) pause();
    clearTimer();
    setStep(nextIndex, {announce});
    remaining = steps[index].duration;
    root.classList.remove('is-complete');
    root.classList.add('is-paused');
    toggle.textContent = 'resume';
    toggle.setAttribute('aria-pressed','true');
  }

  function renderStatic() {
    playing = false;
    clearTimer();
    root.classList.remove('is-playing','is-paused');
    root.classList.add('is-static','is-complete');
    setStep(steps.length - 1);
    root.dataset.state = 'static';
    caption.textContent = 'Observations become a perceived state; memory and planning shape an action; the observed outcome returns as learning.';
    progress.textContent = 'Complete causal path';
  }

  toggle.addEventListener('click', () => {
    if (playing) pause({announce:true});
    else play({restart:index >= steps.length - 1});
  });
  replay.addEventListener('click', () => { live.textContent = 'Replaying the episode from the beginning.'; play({restart:true}); });
  previous.addEventListener('click', () => jump(index - 1));
  next.addEventListener('click', () => jump(index + 1));
  markers.forEach(button => button.addEventListener('click', () => jump(groupStart[button.dataset.flowJump])));

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && entry.intersectionRatio >= .45 && !autoplayed && !isReduced()) {
      autoplayed = true;
      play({restart:true});
    } else if (!entry.isIntersecting && playing) pause();
  }, {threshold:[0,.2,.45]});

  reduced.addEventListener('change', () => {
    if (isReduced()) renderStatic();
    else {
      root.classList.remove('is-static');
      setStep(0);
      remaining = steps[0].duration;
      toggle.textContent = 'play episode';
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });

  setStep(0);
  if (isReduced()) renderStatic(); else observer.observe(root);
})();
