document.addEventListener('DOMContentLoaded', () => {
  const selectors = [
    '.mx-auto.w-full.max-w-sm',
    '.sc-card', 
    '.prev-glass-card', 
    '.bg-white.rounded-2xl', 
    '.glass-card', 
    'section.bg-white', 
    '.pro-card'
  ].join(', ');
  
  const cards = document.querySelectorAll(selectors);
  
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(40px)';
    card.style.transition = 'opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1), transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
    const delay = (index % 4) * 0.1;
    card.style.transitionDelay = `${delay}s`;
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        obs.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  cards.forEach(card => observer.observe(card));
});
