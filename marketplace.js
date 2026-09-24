(function () {
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const toast = document.querySelector('#toast');
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      tabs.forEach((item) => item.classList.toggle('is-active', item === tab));
      panels.forEach((panel) => {
        const isActive = panel.dataset.panel === name;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    });
  });

  const installButton = document.querySelector('#install-button');
  installButton.addEventListener('click', () => {
    const installed = installButton.classList.toggle('is-installed');
    installButton.textContent = installed ? 'Added to Obsidian' : 'Add to Obsidian';
    showToast(installed ? 'Share Page added to your plugins' : 'Share Page removed from your plugins');
  });

  const moreButton = document.querySelector('#more-button');
  const menu = document.querySelector('#overflow-menu');
  moreButton.addEventListener('click', () => {
    const isOpen = moreButton.getAttribute('aria-expanded') === 'true';
    moreButton.setAttribute('aria-expanded', String(!isOpen));
    menu.hidden = isOpen;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.menu-wrap')) {
      moreButton.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }
  });

  document.querySelectorAll('.expandable').forEach((row) => {
    row.addEventListener('click', () => row.classList.toggle('is-open'));
  });

  const search = document.querySelector('#plugin-search');
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search.focus();
    }
  });
  search.addEventListener('input', () => {
    if (search.value.trim()) showToast('Search is ready for more plugins');
  });
})();
