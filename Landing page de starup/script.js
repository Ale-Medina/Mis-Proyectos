// Animación del logo
const logo = document.querySelector('.logo');
if (logo) {
  logo.addEventListener('mouseover', () => {
    logo.querySelectorAll('span').forEach((letter, index) => {
      setTimeout(() => {
        letter.style.animation = 'bounce 0.5s';
      }, index * 50);
    });
  });

  logo.addEventListener('mouseout', () => {
    logo.querySelectorAll('span').forEach(letter => {
      letter.style.animation = 'none';
    });
  });
}

// Cambio de estilo de la barra de navegación al hacer scroll
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  header.classList.toggle('scrolled', window.scrollY > 0);
});

// Smooth scrolling para los enlaces de navegación
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Animación de aparición para los elementos
const animateOnScroll = (entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
      observer.unobserve(entry.target);
    }
  });
};

const observer = new IntersectionObserver(animateOnScroll, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach(item => {
  observer.observe(item);
});

// Validación del formulario de contacto
const contactForm = document.querySelector('.contact-form');
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  // Aquí puedes agregar la lógica para enviar el formulario
  alert('¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto.');
  contactForm.reset();
});