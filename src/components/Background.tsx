'use client';

import { useEffect, useRef } from 'react';

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let stars: { x: number; y: number; radius: number; alpha: number; speed: number }[] = [];
    let shootingStars: { x: number; y: number; length: number; speed: number; alpha: number }[] = [];

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars = [];
      for (let i = 0; i < 300; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.5 + 0.1
        });
      }
    };

    const drawStars = () => {
      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
        
        // Мерцание звезд
        star.alpha += (Math.random() - 0.5) * 0.02;
        star.alpha = Math.min(Math.max(star.alpha, 0.1), 0.9);
      }
    };

    const drawNebula = () => {
      // Синяя туманность
      const gradient1 = ctx.createRadialGradient(
        canvas.width * 0.2, canvas.height * 0.3, 50,
        canvas.width * 0.2, canvas.height * 0.3, 250
      );
      gradient1.addColorStop(0, 'rgba(79, 140, 255, 0.08)');
      gradient1.addColorStop(1, 'rgba(79, 140, 255, 0)');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Фиолетовая туманность
      const gradient2 = ctx.createRadialGradient(
        canvas.width * 0.8, canvas.height * 0.7, 50,
        canvas.width * 0.8, canvas.height * 0.7, 300
      );
      gradient2.addColorStop(0, 'rgba(106, 92, 255, 0.06)');
      gradient2.addColorStop(1, 'rgba(106, 92, 255, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const createShootingStar = () => {
      if (Math.random() < 0.01 && shootingStars.length < 3) {
        shootingStars.push({
          x: Math.random() * canvas.width,
          y: 0,
          length: 60 + Math.random() * 40,
          speed: 4 + Math.random() * 4,
          alpha: 0.8
        });
      }
    };

    const drawShootingStars = () => {
      for (let i = 0; i < shootingStars.length; i++) {
        const star = shootingStars[i];
        
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x - star.length, star.y + star.length);
        ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Добавляем свечение
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x - star.length, star.y + star.length);
        ctx.strokeStyle = `rgba(106, 92, 255, ${star.alpha * 0.5})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Движение
        star.x += star.speed;
        star.y += star.speed;
        star.alpha -= 0.02;
        
        if (star.alpha <= 0 || star.x > canvas.width || star.y > canvas.height) {
          shootingStars.splice(i, 1);
          i--;
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawNebula();
      drawStars();
      drawShootingStars();
      createShootingStar();
      
      animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      setCanvasSize();
      initStars();
    };

    setCanvasSize();
    initStars();
    animate();

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}
