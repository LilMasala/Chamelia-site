(() => {
  const root = document.querySelector('[data-episode]');
  if (!root || root.dataset.mounted === 'true') return;
  root.dataset.mounted = 'true';
  const forceMotion = true;
  document.documentElement.classList.add('force-motion');

  const steps = [
    {id:'raw-input', group:'input', duration:2600, short:'Life arrives', caption:'Blood glucose, insulin, sleep, heart rate, and context arrive as one messy moment.'},
    {id:'perceive', group:'perception', duration:2900, short:'Perception', caption:'Perception circles those observations and compresses them into one current state, a.'},
    {id:'retrieve', group:'memory', duration:2800, short:'Memory', caption:'State a queries memory; related episodes, beliefs, and reusable skills return as a small set of shapes.'},
    {id:'configure', group:'configure', duration:2700, short:'Configure', caption:'State a and the retrieved memories converge in the configurator, alongside goals and constraints.'},
    {id:'propose', group:'search', duration:2500, short:'Propose', caption:'The actor reaches into the action space and pulls out a few plausible candidates.'},
    {id:'simulate', group:'search', duration:3000, short:'Imagine', caption:'The world model grows futures while metacognition sets how deeply to search under the available budget.'},
    {id:'score', group:'search', duration:2400, short:'Score', caption:'Cost annotates each branch; constraints block what is not allowed.'},
    {id:'choose', group:'action', duration:2200, short:'Choose', caption:'Among valid branches, candidate B has the lowest cost: 0.41. Search selects it.'},
    {id:'act', group:'action', duration:2700, short:'Act', caption:'The selected action travels out of the search and into the person’s real situation.'},
    {id:'observe', group:'reality', duration:2900, short:'Reality answers', caption:'Reality answers. The observed glucose trace is compared smoothly with what the system expected.'},
    {id:'learn', group:'feedback', duration:2600, short:'Learn', caption:'The outcome returns as an episode, prediction error, and reward or regret—not one generic flash.'},
    {id:'consolidate', group:'sleep', duration:2600, short:'Consolidate', caption:'Sleep replays the episode and keeps the patterns and skills that earn a place.'}
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
  const isReduced = () => false;
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
    const captionChanged = caption.textContent !== step.caption;
    caption.textContent = step.caption;
    if (captionChanged && caption.animate) {
      caption.animate([
        {opacity:.25, transform:'translateY(7px)'},
        {opacity:1, transform:'translateY(0)'}
      ], {duration:620, easing:'cubic-bezier(.2,.72,.23,1)'});
    }
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
    if (entry.isIntersecting && entry.intersectionRatio >= .18 && !autoplayed && !isReduced()) {
      autoplayed = true;
      play({restart:true});
    } else if (!entry.isIntersecting && playing) pause();
  }, {threshold:[0,.18,.35]});

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
  if (isReduced()) renderStatic();
  else {
    observer.observe(root);
    requestAnimationFrame(() => {
      if (autoplayed) return;
      const rect = root.getBoundingClientRect();
      const visible = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
      if (visible > Math.min(rect.height, innerHeight) * .18) {
        autoplayed = true;
        play({restart:true});
      }
    });
  }
})();
