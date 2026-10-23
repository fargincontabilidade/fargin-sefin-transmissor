// Ícones de itens (arte original). O Selo de Vínculo é um cristal hexagonal
// com uma runa — propositalmente diferente de qualquer "bola" de captura.
import { shade, rgba, ellipse, roundRect, fillStroke, volumeFill } from './draw.js';
import { ELEMENTS } from '../data/elements.js';

export function drawSeal(ctx, cx, cy, r, color, glow = true) {
  if (glow) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.6);
    g.addColorStop(0, rgba(color, 0.55)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
  }
  const hex = (rr) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; const x = cx + Math.cos(a) * rr; const y = cy + Math.sin(a) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); };
  hex(r);
  const g2 = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g2.addColorStop(0, shade(color, 0.6)); g2.addColorStop(0.5, color); g2.addColorStop(1, shade(color, -0.4));
  fillStroke(ctx, g2, shade(color, -0.65), Math.max(2, r * 0.12));
  // facetas
  ctx.strokeStyle = rgba('#ffffff', 0.45); ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); }
  hex(r * 0.5);
  ctx.fillStyle = rgba('#ffffff', 0.85); ctx.fill();
  // runa central
  ctx.strokeStyle = shade(color, -0.4); ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.32); ctx.lineTo(cx, cy + r * 0.32); ctx.moveTo(cx - r * 0.26, cy - r * 0.08); ctx.lineTo(cx, cy + r * 0.12); ctx.lineTo(cx + r * 0.26, cy - r * 0.08); ctx.stroke();
  ellipse(ctx, cx - r * 0.42, cy - r * 0.45, r * 0.16, r * 0.1, -0.6); ctx.fillStyle = rgba('#ffffff', 0.9); ctx.fill();
}

function bottle(ctx, color) {
  roundRect(ctx, 26, 8, 12, 10, 3); fillStroke(ctx, '#c9894f', '#4a2a14', 2);
  ctx.beginPath(); ctx.moveTo(24, 18); ctx.lineTo(40, 18); ctx.lineTo(40, 24); ctx.quadraticCurveTo(54, 30, 52, 44); ctx.quadraticCurveTo(50, 58, 32, 58); ctx.quadraticCurveTo(14, 58, 12, 44); ctx.quadraticCurveTo(10, 30, 24, 24); ctx.closePath();
  fillStroke(ctx, rgba('#e8f8ff', 0.6), '#3a4a6a', 2.5);
  ctx.beginPath(); ctx.moveTo(14, 40); ctx.quadraticCurveTo(32, 34, 50, 40); ctx.quadraticCurveTo(50, 56, 32, 56); ctx.quadraticCurveTo(14, 56, 14, 40); ctx.fillStyle = volumeFill(ctx, 32, 46, 20, color); ctx.fill();
  ellipse(ctx, 22, 34, 3, 7, 0.3); ctx.fillStyle = rgba('#fff', 0.8); ctx.fill();
}

function rune(ctx, element) {
  const el = ELEMENTS[element] || ELEMENTS.neutro;
  ellipse(ctx, 32, 34, 25, 25); fillStroke(ctx, volumeFill(ctx, 32, 34, 25, '#6a6478'), '#2a2433', 3);
  ellipse(ctx, 32, 34, 18, 18); fillStroke(ctx, volumeFill(ctx, 32, 34, 18, el.color, { hi: 0.5 }), shade(el.color, -0.6), 2);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText({ fogo: '✹', agua: '≈', planta: '❦', eletrico: 'ϟ', pedra: '◆', neutro: '✦' }[element] || '✦', 32, 35);
}

export function drawItemIcon(ctx, item) {
  ctx.save();
  switch (item.category) {
    case 'captura': drawSeal(ctx, 32, 32, 22, item.color || '#5ad1ff'); break;
    case 'recuperacao':
      if (item.revive) {
        for (const [a, c] of [[-0.6, '#5fbf4a'], [0, '#7fe06a'], [0.6, '#4aa645']]) { ctx.save(); ctx.translate(32, 54); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, -22, 0, -44); ctx.quadraticCurveTo(-14, -22, 0, 0); fillStroke(ctx, c, '#1f5e1c', 2); ctx.restore(); }
        ellipse(ctx, 32, 14, 6, 6); ctx.fillStyle = '#ffe36b'; ctx.fill();
      } else bottle(ctx, item.heal >= 80 ? '#b06aff' : '#ff8a3c');
      break;
    case 'runa': rune(ctx, item.element); break;
    case 'missao':
      roundRect(ctx, 8, 16, 48, 34, 4); fillStroke(ctx, '#fff6e0', '#6a5a3a', 2.5);
      ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(32, 36); ctx.lineTo(56, 16); ctx.strokeStyle = '#6a5a3a'; ctx.stroke();
      ellipse(ctx, 32, 36, 6, 6); ctx.fillStyle = '#d9453a'; ctx.fill();
      break;
    default:
      roundRect(ctx, 8, 10, 48, 44, 6); fillStroke(ctx, '#f3e1b5', '#6a5a3a', 2.5);
      ctx.strokeStyle = '#5aa86a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 40); ctx.quadraticCurveTo(26, 20, 36, 34); ctx.quadraticCurveTo(44, 44, 50, 18); ctx.stroke();
      ctx.fillStyle = '#d9453a'; ellipse(ctx, 50, 18, 4, 4); ctx.fill();
  }
  ctx.restore();
}
