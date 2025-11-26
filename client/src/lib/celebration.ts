import confetti from 'canvas-confetti';

/**
 * Премиальная праздничная анимация в стиле luxury
 * Элегантное золотое сияние с shimmer эффектами
 * Анимация длится 2 секунды
 */
export function celebrateJackpot() {
  const duration = 2000; // 2 секунды элегантной анимации
  const animationEnd = Date.now() + duration;

  // Премиальная цветовая палитра: только золото, платина, шампанское
  const luxuryGold = ['#D4AF37', '#F4E4C1', '#CFB53B'];
  const luxuryPlatinum = ['#E5E4E2', '#C0C0C0', '#F7E7CE'];
  const allLuxury = [...luxuryGold, ...luxuryPlatinum];

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  // ✨ Центральный элегантный burst с золотым сиянием
  confetti({
    particleCount: 80,
    spread: 100,
    startVelocity: 30,
    origin: { y: 0.5 },
    colors: luxuryGold,
    shapes: ['circle'],
    scalar: 1.2,
    gravity: 0.4,
    ticks: 80,
    zIndex: 9999,
  });

  // 💫 Shimmer эффект - маленькие золотые частицы плавно дрейфуют
  const shimmerInterval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(shimmerInterval);
      return;
    }

    const particleCount = 8 * (timeLeft / duration);

    // Левый shimmer
    confetti({
      particleCount,
      spread: 60,
      startVelocity: 15,
      origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.3, 0.7) },
      colors: allLuxury,
      shapes: ['circle', 'star'],
      scalar: 0.8,
      gravity: 0.3,
      ticks: 60,
      zIndex: 9999,
    });

    // Правый shimmer
    confetti({
      particleCount,
      spread: 60,
      startVelocity: 15,
      origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.3, 0.7) },
      colors: allLuxury,
      shapes: ['circle', 'star'],
      scalar: 0.8,
      gravity: 0.3,
      ticks: 60,
      zIndex: 9999,
    });
  }, 150);

  // 🌟 Золотые звёзды сверху - элегантный спуск (400мс)
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0 },
      colors: luxuryGold,
      shapes: ['star'],
      scalar: 1.3,
      gravity: 0.35,
      ticks: 90,
      zIndex: 9999,
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 0.8, y: 0 },
      colors: luxuryGold,
      shapes: ['star'],
      scalar: 1.3,
      gravity: 0.35,
      ticks: 90,
      zIndex: 9999,
    });
  }, 400);

  // 💎 Платиновое сияние - роскошные блики (800мс)
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 80,
      startVelocity: 25,
      origin: { y: 0.3, x: 0.5 },
      colors: luxuryPlatinum,
      shapes: ['circle', 'star'],
      scalar: 1.1,
      gravity: 0.4,
      ticks: 70,
      zIndex: 9999,
    });
  }, 800);

  // ✨ Финальное золотое сияние - элегантный финиш (1300мс)
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 120,
      startVelocity: 35,
      origin: { y: 0.4, x: 0.5 },
      colors: allLuxury,
      shapes: ['circle', 'star'],
      scalar: 1.0,
      gravity: 0.45,
      ticks: 80,
      zIndex: 9999,
    });
  }, 1300);

  // Очистка интервалов в конце анимации
  setTimeout(() => {
    clearInterval(shimmerInterval);
  }, duration);
}

/**
 * Запускает быструю праздничную анимацию (для небольших событий)
 */
export function celebrateQuick() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#D4AF37', '#F4E4C1', '#CFB53B'],
    zIndex: 9999,
  });
}
