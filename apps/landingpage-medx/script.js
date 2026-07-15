/* ═══════════════════════════════════════════════════
   MEDX LABORATORY — INTERACTIONS (GSAP + Vanilla JS)
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────────────
     1. CUSTOM CURSOR
     ───────────────────────────────────────────────── */
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorGlow = document.querySelector('.cursor-glow');

  if (cursorDot && cursorGlow) {
    window.addEventListener('mousemove', e => {
      cursorDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });

    document.querySelectorAll('a, button, .interactive').forEach(el => {
      el.addEventListener('mouseenter', () => cursorGlow.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursorGlow.classList.remove('hovering'));
    });
  }

  /* ─────────────────────────────────────────────────
     2. SCROLL PROGRESS BAR
     ───────────────────────────────────────────────── */
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      progressBar.style.width = (winScroll / height) * 100 + "%";
    });
  }

  /* ─────────────────────────────────────────────────
     3. STICKY NAVBAR EFFECT
     ───────────────────────────────────────────────── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('navbar-scrolled', 'py-2');
        navbar.classList.remove('py-4');
      } else {
        navbar.classList.remove('navbar-scrolled', 'py-2');
        navbar.classList.add('py-4');
      }
    });
  }

  /* ─────────────────────────────────────────────────
     4. MOBILE MENU
     ───────────────────────────────────────────────── */
  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuToggle && menuClose && mobileMenu) {
    const toggleMenu = () => mobileMenu.classList.toggle('open');
    menuToggle.addEventListener('click', toggleMenu);
    menuClose.addEventListener('click', toggleMenu);
    
    document.querySelectorAll('.menu-link').forEach(link => {
      link.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  /* ─────────────────────────────────────────────────
     5. NUMBER COUNTER ANIMATION
     ───────────────────────────────────────────────── */
  const animateValue = (obj, start, end, duration, suffix = '') => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(progress * (end - start) + start);
      obj.innerHTML = current + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerHTML = end + suffix;
      }
    };
    window.requestAnimationFrame(step);
  };

  const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
  const statsObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-target'));
        const suffix = entry.target.getAttribute('data-suffix') || '';
        animateValue(entry.target, 0, target, 2500, suffix);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.stat-number').forEach(el => statsObserver.observe(el));

  /* ─────────────────────────────────────────────────
     6. REVEAL ANIMATIONS ON SCROLL (GSAP)
     ───────────────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('.reveal').forEach(el => {
    gsap.fromTo(el, 
      { opacity: 0, y: 40 },
      {
        opacity: 1, 
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      }
    );
  });

  /* ─────────────────────────────────────────────────
     7. PARALLAX CARDS
     ───────────────────────────────────────────────── */
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
  });

  /* ─────────────────────────────────────────────────
     8. SECTION MORPHING (GSAP)
     ───────────────────────────────────────────────── */
  document.querySelectorAll('.section-morph').forEach(section => {
    gsap.fromTo(section,
      { borderTopLeftRadius: "50%", borderTopRightRadius: "50%" },
      {
        borderTopLeftRadius: "0%", borderTopRightRadius: "0%",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "top center",
          scrub: true
        }
      }
    );
  });

  /* ─────────────────────────────────────────────────
     9. INTERACTIVE FEATURE SPOTLIGHT
     ───────────────────────────────────────────────── */
  document.querySelectorAll('.card-spotlight').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
      
      // Inject gradient dynamically
      const color = card.style.background.includes('216') ? 'rgba(29,78,216,0.06)' : 
                    card.style.background.includes('233') ? 'rgba(14,165,233,0.06)' : 'rgba(5,150,105,0.06)';
      
      card.style.background = `radial-gradient(circle at ${x}px ${y}px, ${color} 0%, transparent 50%), #F4F7FE`;
    });
    
    card.addEventListener('mouseleave', () => {
      // Revert to original background based on content
      if (card.innerHTML.includes('Reports stuck')) {
        card.style.background = 'linear-gradient(135deg, rgba(29,78,216,0.03) 0%, transparent 50%)';
      } else if (card.innerHTML.includes('Doctors calling')) {
        card.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.03) 0%, transparent 50%)';
      } else {
        card.style.background = 'linear-gradient(135deg, rgba(5,150,105,0.03) 0%, transparent 50%)';
      }
    });
  });

  /* ─────────────────────────────────────────────────
     10. MAGNETIC BUTTON EFFECT
     ───────────────────────────────────────────────── */
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = `translate(0px, 0px)`;
    });

    btn.addEventListener('click', function(e) {
      let ripple = document.createElement('span');
      ripple.classList.add('btn-ripple');
      this.appendChild(ripple);
      let x = e.clientX - e.target.offsetLeft;
      let y = e.clientY - e.target.offsetTop;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add('active');
      setTimeout(() => ripple.remove(), 600);
    });
  });

  /* ─────────────────────────────────────────────────
     11. FORM SUBMISSIONS (GOOGLE SHEETS INTEGRATION)
     ───────────────────────────────────────────────── */
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setupForm(formId, inputId, errorId, successId, isDark = false) {
    const form = document.getElementById(formId);
    if (!form) return;

    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    const ok = document.getElementById(successId);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = input.value.trim();
      err.classList.add('hidden');

      if (!emailRx.test(email)) {
        err.textContent = 'Please enter a valid email';
        err.classList.remove('hidden');
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Adding you…';
      btn.style.opacity = '0.7';

      const scriptURL = 'https://script.google.com/macros/s/AKfycby15uZ-wK3LV1ChikaalOCnN5o9_MRwdRvbdTpHsWbgjpLgeu9jKObG1w0BB4G8jK9lVA/exec';
      const formData = new FormData();
      formData.append('Email', email);

      fetch(scriptURL, { method: 'POST', body: formData, mode: 'no-cors' })
        .then(response => {
          form.style.display = 'none';
          const tc = isDark ? 'text-white' : 'text-ink';
          const mc = isDark ? 'text-white/60' : 'text-muted';
          const bc = isDark ? 'border-white/30 text-white hover:bg-white/10' : 'border-ink/20 text-ink hover:bg-surface';
          const ref = Math.random().toString(36).slice(2, 8);
          ok.innerHTML =
            `<div class="font-display font-bold text-2xl ${tc}">✅ You're on the list!</div>` +
            `<p class="${mc} text-sm mt-2 font-body">We'll email you at <strong>${email}</strong> when MedX launches.</p>` +
            `<button onclick="navigator.clipboard.writeText(location.href+'?ref=${ref}').then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy referral link',2e3)})" class="mt-4 border ${bc} px-6 py-2 rounded-full font-display font-semibold text-sm transition min-h-[44px] cursor-none">Copy referral link</button>`;
          ok.classList.remove('hidden');
          document.querySelectorAll('.waitlist-count').forEach(c => c.textContent = '513');
        })
        .catch(error => {
          console.error('Error!', error.message);
          err.textContent = 'Something went wrong. Please try again.';
          err.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = originalText;
          btn.style.opacity = '1';
        });
    });
  }

  setupForm('hero-form', 'hero-email', 'hero-form-error', 'hero-form-success', false);
  setupForm('waitlist-form', 'waitlist-email', 'waitlist-form-error', 'waitlist-form-success', true);

  /* ─────────────────────────────────────────────────
     12. SMOOTH ANCHOR SCROLL
     ───────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ─────────────────────────────────────────────────
     13. HERO SPARKLE PARTICLES
     ───────────────────────────────────────────────── */
  const heroSection = document.querySelector('.hero-section');
  if (heroSection) {
    for (let i = 0; i < 20; i++) {
      const s = document.createElement('div');
      s.classList.add('sparkle');
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.width = (2 + Math.random() * 4) + 'px';
      s.style.height = s.style.width;
      s.style.background = ['#1D4ED8', '#0EA5E9', '#059669'][Math.floor(Math.random() * 3)];
      heroSection.appendChild(s);
      gsap.to(s, {
        opacity: 0.6, duration: 1 + Math.random() * 2,
        repeat: -1, yoyo: true,
        delay: Math.random() * 3,
        y: -20 - Math.random() * 40,
        x: -10 + Math.random() * 20,
        ease: 'sine.inOut'
      });
    }
  }

});