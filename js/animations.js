/**
 * GSAP Animations
 * Handles scroll-triggered animations and interactive effects
 */

class Animations {
    constructor() {
        this.init();
    }

    init() {
        // Register GSAP plugins
        gsap.registerPlugin(ScrollTrigger);

        // Initialize all animations
        this.initHeroAnimations();
        this.initScrollAnimations();
        this.initSkillBars();
        this.initCounters();
        this.initTiltEffect();
        this.initNavAnimation();
    }

    // Hero Section Animations
    initHeroAnimations() {
        const heroTimeline = gsap.timeline({
            defaults: { ease: 'power3.out' }
        });

        heroTimeline
            .to('.hero-greeting', {
                opacity: 1,
                y: 0,
                duration: 0.8,
                delay: 0.5
            })
            .to('.title-line', {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.15
            }, '-=0.4')
            .to('.hero-role', {
                opacity: 1,
                y: 0,
                duration: 0.6
            }, '-=0.4')
            .to('.hero-description', {
                opacity: 1,
                y: 0,
                duration: 0.6
            }, '-=0.3')
            .to('.hero-cta', {
                opacity: 1,
                y: 0,
                duration: 0.6
            }, '-=0.3')
            .to('.hero-social', {
                opacity: 1,
                y: 0,
                duration: 0.6
            }, '-=0.3');
    }

    // Scroll-triggered animations for sections
    initScrollAnimations() {
        // Section headers
        gsap.utils.toArray('.section-header').forEach(header => {
            gsap.from(header, {
                opacity: 0,
                y: 50,
                duration: 0.8,
                scrollTrigger: {
                    trigger: header,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // About card
        gsap.from('.about-card', {
            opacity: 0,
            y: 60,
            duration: 1,
            scrollTrigger: {
                trigger: '.about-card',
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });

        // Skill cards
        gsap.utils.toArray('.skill-card').forEach((card, index) => {
            gsap.from(card, {
                opacity: 0,
                y: 50,
                duration: 0.8,
                delay: index * 0.1,
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // Project cards
        gsap.utils.toArray('.project-card').forEach((card, index) => {
            gsap.from(card, {
                opacity: 0,
                y: 60,
                scale: 0.95,
                duration: 0.8,
                delay: index * 0.1,
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // Timeline items
        gsap.utils.toArray('.timeline-item').forEach((item, index) => {
            const direction = index % 2 === 0 ? 50 : -50;

            gsap.from(item.querySelector('.timeline-marker'), {
                scale: 0,
                duration: 0.5,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse'
                }
            });

            gsap.from(item.querySelector('.timeline-content'), {
                opacity: 0,
                x: direction,
                duration: 0.8,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // Contact section
        gsap.from('.contact-info', {
            opacity: 0,
            x: -50,
            duration: 0.8,
            scrollTrigger: {
                trigger: '.contact-content',
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });

        gsap.from('.contact-form', {
            opacity: 0,
            x: 50,
            duration: 0.8,
            scrollTrigger: {
                trigger: '.contact-content',
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });

        // Tech badges - simple fade in without getting stuck
        gsap.utils.toArray('.tech-badges').forEach(container => {
            const badges = container.querySelectorAll('.tech-badge');
            // Set initial state explicitly
            gsap.set(badges, { opacity: 1, scale: 1, y: 0 });
        });
    }

    // Skill bars animation
    initSkillBars() {
        gsap.utils.toArray('.skill-progress').forEach(bar => {
            const width = bar.dataset.width;

            gsap.to(bar, {
                width: `${width}%`,
                duration: 1.5,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: bar,
                    start: 'top 90%',
                    toggleActions: 'play none none reverse'
                }
            });
        });
    }

    // Counter animation
    initCounters() {
        gsap.utils.toArray('.stat-number').forEach(counter => {
            const target = parseInt(counter.dataset.count);

            ScrollTrigger.create({
                trigger: counter,
                start: 'top 85%',
                onEnter: () => {
                    gsap.to(counter, {
                        innerText: target,
                        duration: 2,
                        snap: { innerText: 1 },
                        ease: 'power2.out'
                    });
                },
                once: true
            });
        });
    }

    // 3D Tilt effect for cards
    initTiltEffect() {
        const cards = document.querySelectorAll('[data-tilt]');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;

                gsap.to(card, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    transformPerspective: 1000,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            });
        });
    }

    // Navigation scroll animation
    initNavAnimation() {
        ScrollTrigger.create({
            start: 'top -80',
            onUpdate: (self) => {
                const navbar = document.getElementById('navbar');
                if (self.direction === 1 && self.progress > 0.1) {
                    navbar.classList.add('scrolled');
                } else if (self.progress < 0.05) {
                    navbar.classList.remove('scrolled');
                }
            }
        });
    }
}

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if GSAP is loaded
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        window.animations = new Animations();
    } else {
        console.warn('GSAP not loaded, skipping animations');
    }
});
