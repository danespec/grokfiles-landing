(() => {
  'use strict';
  const list = [...document.querySelectorAll('.story-index li')];
  const search = document.getElementById('atlas-search');
  const tier = document.getElementById('atlas-tier');
  const update = () => {
    const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    list.forEach(item => {
      const show = (tier.value === 'all' || item.dataset.tier === tier.value) && terms.every(term => item.dataset.search.includes(term));
      item.hidden = !show;
      if (show) count++;
    });
    document.getElementById('atlas-results').textContent = count + (count === 1 ? ' story' : ' stories') + (count === 72 ? '' : ' of 72');
    document.getElementById('atlas-empty').hidden = count !== 0;
  };
  document.getElementById('atlas-filters').hidden = false;
  search.addEventListener('input', update);
  tier.addEventListener('change', update);
  const openTarget = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    if (target && target.classList.contains('story-entry')) {
      target.open = true;
      requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
    }
  };
  window.addEventListener('hashchange', openTarget);
  openTarget();
})();
