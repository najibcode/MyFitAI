// ─────────────────────────────────────────────────────────────
// MyFitAI — High-Resolution Share Card Canvas Renderer
// Renders vector anatomical muscle maps, user physique photos,
// training metrics, and MyFitAI branding to offscreen canvas
// at target export resolutions (1080×1350, 1080×1080, 1080×1920).
// ─────────────────────────────────────────────────────────────

import type {
  ShareCardConfig,
  ShareableMuscleData,
  ShareCardFormat,
} from '../../types/shareCard';
import { FRONT_MUSCLE_PATHS } from '../../components/muscleMap/AnatomicalFrontBody';
import { BACK_MUSCLE_PATHS } from '../../components/muscleMap/AnatomicalBackBody';

export interface CardDimensions {
  width: number;
  height: number;
}

export function getDimensionsForFormat(format: ShareCardFormat): CardDimensions {
  switch (format) {
    case 'instagram_square':
      return { width: 1080, height: 1080 };
    case 'instagram_story':
      return { width: 1080, height: 1920 };
    case 'instagram_portrait':
    case 'whatsapp':
    default:
      return { width: 1080, height: 1350 };
  }
}

/**
 * Loads an HTMLImageElement asynchronously
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = e => reject(e);
    img.src = src;
  });
}

/**
 * Helper to draw a rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renders user photo into a bounded rectangular clipping path with zoom, pan, and rotation
 */
function drawUserPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  transform = { zoom: 1.0, x: 0, y: 0, rotation: 0, fit: 'cover' as 'cover' | 'contain' },
  radius = 24
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  // Dark photo backing
  ctx.fillStyle = '#121214';
  ctx.fillRect(x, y, w, h);

  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.translate(cx, cy);
  if (transform.rotation) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }

  // Pan offsets
  const panX = (transform.x / 100) * w;
  const panY = (transform.y / 100) * h;
  ctx.translate(panX, panY);

  const imgRatio = img.width / img.height;
  const containerRatio = w / h;

  let renderW = w;
  let renderH = h;

  if (transform.fit === 'contain') {
    if (imgRatio > containerRatio) {
      renderW = w;
      renderH = w / imgRatio;
    } else {
      renderH = h;
      renderW = h * imgRatio;
    }
  } else {
    // cover
    if (imgRatio > containerRatio) {
      renderH = h;
      renderW = h * imgRatio;
    } else {
      renderW = w;
      renderH = w / imgRatio;
    }
  }

  const zoom = Math.max(0.5, Math.min(4.0, transform.zoom || 1.0));
  renderW *= zoom;
  renderH *= zoom;

  ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);

  ctx.restore();

  // Subtle inner border stroke
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the official MyFitAI Brand Header onto the canvas
 */
function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isDarkTheme: boolean,
  tagline = 'TRAIN SMARTER'
) {
  ctx.save();

  // Logo Icon Square - Obsidian base
  const iconSize = 44;
  drawRoundedRect(ctx, x, y, iconSize, iconSize, 12);
  ctx.fillStyle = '#080808';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#2A2A2D';
  ctx.stroke();

  // Kinetic Apex Mark
  ctx.save();
  ctx.translate(x, y);
  const s = iconSize / 100;
  ctx.scale(s, s);

  // Outer primary chevron (Athletic Green)
  ctx.fillStyle = '#30D158';
  const p1 = new Path2D('M 25 78 L 50 48 L 75 78 L 84 70 L 50 30 L 16 70 Z');
  ctx.fill(p1);

  // Upper inner chevron (Pure White)
  ctx.fillStyle = '#FFFFFF';
  const p2 = new Path2D('M 35 44 L 50 26 L 65 44 L 72 37 L 50 12 L 28 37 Z');
  ctx.fill(p2);

  // Apex core (Athletic Green)
  ctx.fillStyle = '#30D158';
  const p3 = new Path2D('M 50 49 L 55 55 L 50 61 L 45 55 Z');
  ctx.fill(p3);
  ctx.restore();

  // Typography: MYFITAI
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Inter", "Outfit", sans-serif';
  ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#09090B';
  ctx.letterSpacing = '-0.5px';
  ctx.fillText('MyFitAI', x + iconSize + 14, y + 26);

  // Subtitle / Tagline
  ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Inter", "Outfit", sans-serif';
  ctx.fillStyle = isDarkTheme ? '#A1A1AA' : '#71717A';
  ctx.letterSpacing = '2px';
  ctx.fillText(tagline.toUpperCase(), x + iconSize + 14, y + 42);

  ctx.restore();
}

/**
 * Gets path color for an anatomical muscle depending on mode and metric
 */
function getMusclePathColor(
  muscleId: string,
  data: ShareableMuscleData,
  mode: ShareCardConfig['mode'],
  isDarkTheme: boolean
): { fill: string; fillOpacity: number; stroke: string } {
  const metric = data.metrics[muscleId];
  const stroke = isDarkTheme ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.16)';

  if (mode === 'fatigue') {
    if (!metric || (metric.recoveryPercentage === 100 && metric.hoursSinceLastTrained === null)) {
      return { fill: isDarkTheme ? '#1E1E24' : '#E4E4E7', fillOpacity: 0.6, stroke };
    }
    const rec = metric.recoveryPercentage;
    if (rec >= 90) return { fill: '#10B981', fillOpacity: 0.9, stroke }; // Fresh emerald
    if (rec >= 55) return { fill: '#F59E0B', fillOpacity: 0.92, stroke }; // Recovering amber
    return { fill: '#EF4444', fillOpacity: 0.95, stroke }; // Fatigued rose
  }

  if (mode === 'volume') {
    const sets = metric?.effectiveSets || 0;
    if (sets === 0) return { fill: isDarkTheme ? '#1E1E24' : '#E4E4E7', fillOpacity: 0.6, stroke };
    if (sets < 6) return { fill: '#38BDF8', fillOpacity: 0.85, stroke };
    if (sets <= 14) return { fill: '#10B981', fillOpacity: 0.9, stroke };
    if (sets <= 20) return { fill: '#F59E0B', fillOpacity: 0.95, stroke };
    return { fill: '#EF4444', fillOpacity: 0.98, stroke };
  }

  // Training load mode (default)
  if (!metric || (!metric.targetRole && metric.effectiveSets === 0)) {
    return { fill: isDarkTheme ? '#1E1E24' : '#E4E4E7', fillOpacity: 0.6, stroke };
  }

  if (metric.targetRole === 'primary' || metric.effectiveSets >= 8) {
    return { fill: '#FF7A00', fillOpacity: 0.96, stroke: '#FFFFFF' };
  }

  return { fill: '#0284C7', fillOpacity: 0.88, stroke };
}

/**
 * Draws the vector anatomical body (Front or Back) into the specified canvas rect
 */
function drawAnatomicalBody(
  ctx: CanvasRenderingContext2D,
  paths: typeof FRONT_MUSCLE_PATHS,
  x: number,
  y: number,
  w: number,
  h: number,
  data: ShareableMuscleData,
  mode: ShareCardConfig['mode'],
  isDarkTheme: boolean,
  label: string
) {
  ctx.save();
  ctx.translate(x, y);

  // SVG viewBox is 0 0 200 360
  const scale = Math.min(w / 200, h / 360);
  const offsetX = (w - 200 * scale) / 2;
  const offsetY = (h - 360 * scale) / 2;

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Neutral skeleton / cranium outline
  ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Head
  ctx.arc(100, 26, 16, 0, Math.PI * 2);
  ctx.stroke();

  // Hands & Feet
  ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  ctx.beginPath();
  ctx.ellipse(34, 200, 4.5, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(166, 200, 4.5, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(80, 336, 6, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(120, 336, 6, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Render each muscle path
  for (const p of paths) {
    const style = getMusclePathColor(p.id, data, mode, isDarkTheme);
    const path2d = new Path2D(p.d);

    ctx.save();
    ctx.fillStyle = style.fill;
    ctx.globalAlpha = style.fillOpacity;
    ctx.fill(path2d);

    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.stroke === '#FFFFFF' ? 1.5 : 0.6;
    ctx.globalAlpha = 1.0;
    ctx.stroke(path2d);
    ctx.restore();
  }

  ctx.restore();

  // Subtle label at bottom
  ctx.save();
  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1.5px';
  ctx.fillText(label.toUpperCase(), x + w / 2, y + h + 16);
  ctx.restore();
}

/**
 * Draws the top muscle load breakdown bars
 */
function drawMuscleLoadBars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  muscles: ShareableMuscleData['topMuscles'],
  isDarkTheme: boolean
) {
  ctx.save();

  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  ctx.fillStyle = isDarkTheme ? '#A1A1AA' : '#71717A';
  ctx.letterSpacing = '1.2px';
  ctx.fillText('MUSCLE TRAINING STIMULUS', x, y);

  const rowHeight = 28;
  const startY = y + 16;
  const maxSets = muscles.length > 0 ? Math.max(...muscles.map(m => m.sets), 1) : 1;

  muscles.slice(0, 5).forEach((m, idx) => {
    const rowY = startY + idx * rowHeight;

    // Muscle name
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#09090B';
    ctx.textAlign = 'left';
    ctx.fillText(m.name, x, rowY + 14);

    // Load Tier Badge
    ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = m.fillColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${m.sets} sets · ${m.loadTier.toUpperCase()}`, x + w, rowY + 14);

    // Progress Bar Background
    const barY = rowY + 19;
    const barHeight = 4;
    drawRoundedRect(ctx, x, barY, w, barHeight, 2);
    ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    ctx.fill();

    // Progress Bar Fill
    const fillWidth = Math.max(8, (m.sets / maxSets) * w);
    drawRoundedRect(ctx, x, barY, fillWidth, barHeight, 2);
    ctx.fillStyle = m.fillColor;
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Draws the 4-metric statistics grid
 */
function drawStatsGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: ShareableMuscleData,
  isDarkTheme: boolean
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, 20);
  ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const stats = [
    { label: 'WORKOUTS', value: `${data.totalWorkouts}` },
    { label: 'SETS LOGGED', value: `${data.totalSets}` },
    { label: 'VOLUME LOAD', value: `${data.totalVolumeKg.toLocaleString()} kg` },
    { label: 'TRAINED GROUPS', value: `${data.topMuscles.length}` },
  ];

  const colW = w / 4;
  stats.forEach((st, idx) => {
    const cx = x + idx * colW + colW / 2;

    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#09090B';
    ctx.textAlign = 'center';
    ctx.fillText(st.value, cx, y + 36);

    ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = isDarkTheme ? '#71717A' : '#A1A1AA';
    ctx.letterSpacing = '1px';
    ctx.fillText(st.label, cx, y + 54);

    if (idx < 3) {
      ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
      ctx.beginPath();
      ctx.moveTo(x + (idx + 1) * colW, y + 16);
      ctx.lineTo(x + (idx + 1) * colW, y + h - 16);
      ctx.stroke();
    }
  });

  ctx.restore();
}

/**
 * Draws PR achievement banner if any PRs exist
 */
function drawPRBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  prs: ShareableMuscleData['prs'],
  isDarkTheme: boolean
) {
  if (!prs || prs.length === 0) return;

  ctx.save();
  const bannerH = 46;
  drawRoundedRect(ctx, x, y, w, bannerH, 14);

  // Gradient background
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(255, 122, 0, 0.2)');
  grad.addColorStop(1, 'rgba(251, 191, 36, 0.1)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 122, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Trophy Icon
  ctx.font = '18px sans-serif';
  ctx.fillText('🏆', x + 16, y + 29);

  // PR text
  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  ctx.fillStyle = '#FF7A00';
  ctx.textAlign = 'left';
  ctx.fillText(`${prs.length} NEW PERSONAL RECORD${prs.length > 1 ? 'S' : ''}!`, x + 44, y + 22);

  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  ctx.fillStyle = isDarkTheme ? '#D4D4D8' : '#3F3F46';
  const prSummary = prs.slice(0, 2).map(p => `${p.exerciseName}: ${p.value}`).join(' • ');
  ctx.fillText(prSummary, x + 44, y + 36);

  ctx.restore();
}

/**
 * Draws Push / Pull / Legs training balance breakdown bar
 */
function drawTrainingBalance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  balance: ShareableMuscleData['balance'],
  isDarkTheme: boolean
) {
  const push = balance.pushSets || 0;
  const pull = balance.pullSets || 0;
  const legs = (balance.quadSets || 0) + (balance.hamstringSets || 0);
  const total = push + pull + legs;

  if (total === 0) return;

  const pushPct = Math.round((push / total) * 100);
  const pullPct = Math.round((pull / total) * 100);
  const legsPct = Math.max(0, 100 - pushPct - pullPct);

  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = isDarkTheme ? '#18181B' : '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  ctx.stroke();

  // Title
  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  ctx.fillStyle = isDarkTheme ? '#A1A1AA' : '#71717A';
  ctx.textAlign = 'left';
  ctx.fillText('TRAINING BALANCE (PUSH / PULL / LEGS)', x + 16, y + 18);

  // Segmented Bar
  const barY = y + 26;
  const barH = 8;
  const barW = w - 32;
  const barX = x + 16;

  drawRoundedRect(ctx, barX, barY, barW, barH, 4);
  ctx.fillStyle = isDarkTheme ? '#27272A' : '#E4E4E7';
  ctx.fill();

  const pushW = Math.max(0, (pushPct / 100) * barW);
  const pullW = Math.max(0, (pullPct / 100) * barW);
  const legsW = Math.max(0, (legsPct / 100) * barW);

  if (pushW > 0) {
    ctx.beginPath();
    drawRoundedRect(ctx, barX, barY, pushW, barH, 4);
    ctx.fillStyle = '#FF7A00';
    ctx.fill();
  }

  if (pullW > 0) {
    ctx.beginPath();
    drawRoundedRect(ctx, barX + pushW, barY, pullW, barH, 0);
    ctx.fillStyle = '#0284C7';
    ctx.fill();
  }

  if (legsW > 0) {
    ctx.beginPath();
    drawRoundedRect(ctx, barX + pushW + pullW, barY, legsW, barH, 4);
    ctx.fillStyle = '#10B981';
    ctx.fill();
  }

  // Segment labels
  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  ctx.fillStyle = '#FF7A00';
  ctx.textAlign = 'left';
  ctx.fillText(`PUSH ${pushPct}%`, barX, y + h - 10);

  ctx.fillStyle = '#0284C7';
  ctx.textAlign = 'center';
  ctx.fillText(`PULL ${pullPct}%`, barX + barW / 2, y + h - 10);

  ctx.fillStyle = '#10B981';
  ctx.textAlign = 'right';
  ctx.fillText(`LEGS ${legsPct}%`, barX + barW, y + h - 10);

  ctx.restore();
}

/**
 * Main Canvas Render Function
 */
export async function renderShareCard(
  config: ShareCardConfig,
  data: ShareableMuscleData
): Promise<HTMLCanvasElement> {
  const { width, height } = getDimensionsForFormat(config.format);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Determine theme colors
  const isDark = config.theme !== 'light';
  let bgColor = '#09090B';
  if (config.theme === 'light') bgColor = '#F8FAFC';
  else if (config.theme === 'cyber') bgColor = '#030712';
  else if (config.theme === 'stealth') bgColor = '#121214';

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient radial glow behind map
  if (isDark) {
    const radial = ctx.createRadialGradient(
      width * 0.7,
      height * 0.4,
      50,
      width * 0.7,
      height * 0.4,
      width * 0.6
    );
    radial.addColorStop(0, 'rgba(255, 122, 0, 0.08)');
    radial.addColorStop(0.5, 'rgba(2, 132, 199, 0.05)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);
  }

  // Preload user images if available
  let userImg: HTMLImageElement | null = null;
  if (config.photoUrl) {
    try {
      userImg = await loadImage(config.photoUrl);
    } catch {
      // Continue without photo or with placeholder
    }
  }

  let secondaryUserImg: HTMLImageElement | null = null;
  if (config.secondaryPhotoUrl) {
    try {
      secondaryUserImg = await loadImage(config.secondaryPhotoUrl);
    } catch {
      // Continue without secondary photo
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TEMPLATE SELECTION RENDERING
  // ─────────────────────────────────────────────────────────────

  const padding = 56;
  const contentWidth = width - padding * 2;

  // Draw Header
  if (config.showLogo) {
    drawBrandHeader(ctx, padding, padding, isDark, data.periodLabel);
  }

  // Date Tag on top right
  if (config.showDate) {
    ctx.save();
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = isDark ? '#A1A1AA' : '#71717A';
    ctx.textAlign = 'right';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(data.dateRangeFormatted, width - padding, padding + 28);
    ctx.restore();
  }

  const topOffset = padding + 70;

  // ── TEMPLATE B: SPLIT 50/50 DUAL-PANEL (Default & Popular) ──
  if (config.template === 'split') {
    const columnGap = 32;
    const colWidth = (contentWidth - columnGap) / 2;
    const bodyHeight = height - topOffset - 160;

    // Left Column: User Physique Photo
    if (userImg) {
      drawUserPhoto(
        ctx,
        userImg,
        padding,
        topOffset,
        colWidth,
        bodyHeight,
        config.photoTransform,
        28
      );
    } else {
      // Empty Photo Placeholder / Silhouette
      drawRoundedRect(ctx, padding, topOffset, colWidth, bodyHeight, 28);
      ctx.fillStyle = isDark ? '#18181B' : '#E4E4E7';
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
      ctx.stroke();

      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillStyle = isDark ? '#71717A' : '#A1A1AA';
      ctx.textAlign = 'center';
      ctx.fillText('PHYSIQUE PROGRESS', padding + colWidth / 2, topOffset + bodyHeight / 2 - 10);
      ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillText('Tap to add photo in editor', padding + colWidth / 2, topOffset + bodyHeight / 2 + 14);
    }

    // Right Column: Dual Anatomical Maps + Top Muscle Loads
    const rightX = padding + colWidth + columnGap;
    const mapH = bodyHeight * 0.62;
    const halfMapW = (colWidth - 16) / 2;

    // Front & Back Maps
    drawAnatomicalBody(
      ctx,
      FRONT_MUSCLE_PATHS,
      rightX,
      topOffset,
      halfMapW,
      mapH,
      data,
      config.mode,
      isDark,
      'Front'
    );
    drawAnatomicalBody(
      ctx,
      BACK_MUSCLE_PATHS,
      rightX + halfMapW + 16,
      topOffset,
      halfMapW,
      mapH,
      data,
      config.mode,
      isDark,
      'Back'
    );

    // Top Muscle Load Bars
    const barsY = topOffset + mapH + 40;
    drawMuscleLoadBars(ctx, rightX, barsY, colWidth, data.topMuscles, isDark);

    // Bottom Stats Grid
    if (config.showStats) {
      drawStatsGrid(ctx, padding, height - 120, contentWidth, 76, data, isDark);
    }
  }

  // ── TEMPLATE A: HERO PHOTO + ANATOMICAL INSET ──
  else if (config.template === 'hero_photo') {
    const heroH = height * 0.54;
    if (userImg) {
      drawUserPhoto(
        ctx,
        userImg,
        padding,
        topOffset,
        contentWidth,
        heroH,
        config.photoTransform,
        28
      );
    } else {
      drawRoundedRect(ctx, padding, topOffset, contentWidth, heroH, 28);
      ctx.fillStyle = isDark ? '#18181B' : '#E4E4E7';
      ctx.fill();
    }

    // Inset Anatomical Dual Map Card on lower-left / center
    const lowerY = topOffset + heroH + 24;
    const lowerH = height - lowerY - 60;
    const mapAreaW = contentWidth * 0.44;

    drawAnatomicalBody(
      ctx,
      FRONT_MUSCLE_PATHS,
      padding,
      lowerY,
      mapAreaW / 2 - 8,
      lowerH - 40,
      data,
      config.mode,
      isDark,
      'Anterior'
    );
    drawAnatomicalBody(
      ctx,
      BACK_MUSCLE_PATHS,
      padding + mapAreaW / 2 + 8,
      lowerY,
      mapAreaW / 2 - 8,
      lowerH - 40,
      data,
      config.mode,
      isDark,
      'Posterior'
    );

    // Muscle Load Bars & Stats on lower-right
    const loadX = padding + mapAreaW + 36;
    const loadW = contentWidth - mapAreaW - 36;
    drawMuscleLoadBars(ctx, loadX, lowerY, loadW, data.topMuscles, isDark);

    if (config.showStats) {
      drawStatsGrid(ctx, loadX, lowerY + lowerH - 80, loadW, 72, data, isDark);
    }
  }

  // ── TEMPLATE C: ANATOMICAL FOCUS (Large Maps + Circular Photo) ──
  else if (config.template === 'anatomical_focus') {
    const mapW = (contentWidth - 40) / 2;
    const mapH = height * 0.52;

    drawAnatomicalBody(
      ctx,
      FRONT_MUSCLE_PATHS,
      padding,
      topOffset,
      mapW,
      mapH,
      data,
      config.mode,
      isDark,
      'Anterior View'
    );
    drawAnatomicalBody(
      ctx,
      BACK_MUSCLE_PATHS,
      padding + mapW + 40,
      topOffset,
      mapW,
      mapH,
      data,
      config.mode,
      isDark,
      'Posterior View'
    );

    // Floating Circular User Photo Badge in center-top
    if (userImg) {
      const badgeSize = 130;
      const bx = width / 2 - badgeSize / 2;
      const by = topOffset + mapH / 2 - badgeSize / 2;
      drawUserPhoto(
        ctx,
        userImg,
        bx,
        by,
        badgeSize,
        badgeSize,
        config.photoTransform,
        badgeSize / 2
      );
    }

    const lowerY = topOffset + mapH + 40;
    drawMuscleLoadBars(ctx, padding, lowerY, contentWidth * 0.52, data.topMuscles, isDark);

    if (data.prs.length > 0) {
      drawPRBanner(ctx, padding + contentWidth * 0.56, lowerY, contentWidth * 0.44, data.prs, isDark);
    }

    if (config.showStats) {
      drawStatsGrid(ctx, padding, height - 120, contentWidth, 76, data, isDark);
    }
  }

  // ── TEMPLATE D: BEFORE / AFTER PROGRESS COMPARISON ──
  else if (config.template === 'progress_compare') {
    const colGap = 24;
    const photoW = (contentWidth - colGap) / 2;
    const photoH = (height - topOffset) * 0.44;

    // Left Panel: BEFORE Photo
    if (secondaryUserImg) {
      drawUserPhoto(
        ctx,
        secondaryUserImg,
        padding,
        topOffset,
        photoW,
        photoH,
        config.secondaryPhotoTransform || config.photoTransform,
        24
      );
    } else {
      drawRoundedRect(ctx, padding, topOffset, photoW, photoH, 24);
      ctx.fillStyle = isDark ? '#18181B' : '#E4E4E7';
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
      ctx.stroke();

      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillStyle = isDark ? '#71717A' : '#A1A1AA';
      ctx.textAlign = 'center';
      ctx.fillText('BEFORE PHOTO', padding + photoW / 2, topOffset + photoH / 2 - 8);
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillText('Add in editor', padding + photoW / 2, topOffset + photoH / 2 + 12);
    }

    // "BEFORE" Badge pill
    drawRoundedRect(ctx, padding + 16, topOffset + 16, 76, 26, 8);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fill();
    ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = '#E4E4E7';
    ctx.textAlign = 'center';
    ctx.fillText('BEFORE', padding + 16 + 38, topOffset + 16 + 17);

    // Right Panel: AFTER Photo
    const rightPhotoX = padding + photoW + colGap;
    if (userImg) {
      drawUserPhoto(
        ctx,
        userImg,
        rightPhotoX,
        topOffset,
        photoW,
        photoH,
        config.photoTransform,
        24
      );
    } else {
      drawRoundedRect(ctx, rightPhotoX, topOffset, photoW, photoH, 24);
      ctx.fillStyle = isDark ? '#18181B' : '#E4E4E7';
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
      ctx.stroke();

      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillStyle = isDark ? '#71717A' : '#A1A1AA';
      ctx.textAlign = 'center';
      ctx.fillText('AFTER PHOTO', rightPhotoX + photoW / 2, topOffset + photoH / 2 - 8);
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillText('Add in editor', rightPhotoX + photoW / 2, topOffset + photoH / 2 + 12);
    }

    // "AFTER" Badge pill
    drawRoundedRect(ctx, rightPhotoX + 16, topOffset + 16, 72, 26, 8);
    ctx.fillStyle = 'rgba(255, 122, 0, 0.9)';
    ctx.fill();
    ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('AFTER', rightPhotoX + 16 + 36, topOffset + 16 + 17);

    // Mid Section: Dual Anatomical Maps + Muscle Breakdown
    const midY = topOffset + photoH + 20;
    const bottomH = height - midY - (config.showStats ? 100 : 40);
    const mapColW = contentWidth * 0.46;
    const halfMap = (mapColW - 16) / 2;

    drawAnatomicalBody(
      ctx,
      FRONT_MUSCLE_PATHS,
      padding,
      midY,
      halfMap,
      bottomH,
      data,
      config.mode,
      isDark,
      'Front'
    );
    drawAnatomicalBody(
      ctx,
      BACK_MUSCLE_PATHS,
      padding + halfMap + 16,
      midY,
      halfMap,
      bottomH,
      data,
      config.mode,
      isDark,
      'Back'
    );

    const rightStatsX = padding + mapColW + 20;
    const rightStatsW = contentWidth - mapColW - 20;
    drawMuscleLoadBars(ctx, rightStatsX, midY, rightStatsW, data.topMuscles.slice(0, 4), isDark);

    // Training Balance
    drawTrainingBalance(ctx, rightStatsX, midY + bottomH - 64, rightStatsW, 58, data.balance, isDark);

    // Bottom Stats
    if (config.showStats) {
      drawStatsGrid(ctx, padding, height - 90, contentWidth, 64, data, isDark);
    }
  }

  // ── TEMPLATE E: MINIMAL ATHLETIC (Editorial & Sleek) ──
  else if (config.template === 'minimal') {
    const fullPhotoH = height - topOffset - 100;
    if (userImg) {
      drawUserPhoto(
        ctx,
        userImg,
        padding,
        topOffset,
        contentWidth,
        fullPhotoH,
        config.photoTransform,
        32
      );
    }

    // Floating glassmorphic corner card with anatomical map
    const cardW = 340;
    const cardH = 380;
    const cardX = width - padding - cardW - 24;
    const cardY = topOffset + fullPhotoH - cardH - 24;

    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawAnatomicalBody(
      ctx,
      FRONT_MUSCLE_PATHS,
      cardX + 16,
      cardY + 16,
      (cardW - 48) / 2,
      cardH - 50,
      data,
      config.mode,
      true,
      'Front'
    );
    drawAnatomicalBody(
      ctx,
      BACK_MUSCLE_PATHS,
      cardX + 16 + (cardW - 48) / 2 + 16,
      cardY + 16,
      (cardW - 48) / 2,
      cardH - 50,
      data,
      config.mode,
      true,
      'Back'
    );
    ctx.restore();

    // Floating bottom stats pill
    if (config.showStats) {
      drawStatsGrid(ctx, padding + 24, topOffset + fullPhotoH - 90, contentWidth - cardW - 70, 66, data, isDark);
    }
  }

  // ── TEMPLATE F / DEFAULT: HEATMAP ONLY (No Photo Needed) ──
  else {
    const mapW = (contentWidth - 60) / 2;
    const mapH = height * 0.54;

    drawAnatomicalBody(
      ctx,
      FRONT_MUSCLE_PATHS,
      padding,
      topOffset,
      mapW,
      mapH,
      data,
      config.mode,
      isDark,
      'Anterior (Front)'
    );
    drawAnatomicalBody(
      ctx,
      BACK_MUSCLE_PATHS,
      padding + mapW + 60,
      topOffset,
      mapW,
      mapH,
      data,
      config.mode,
      isDark,
      'Posterior (Back)'
    );

    const lowerY = topOffset + mapH + 45;
    drawMuscleLoadBars(ctx, padding, lowerY, contentWidth * 0.52, data.topMuscles, isDark);

    const rightColX = padding + contentWidth * 0.56;
    const rightColW = contentWidth * 0.44;

    if (data.prs.length > 0) {
      drawPRBanner(ctx, rightColX, lowerY, rightColW, data.prs, isDark);
      drawTrainingBalance(ctx, rightColX, lowerY + 54, rightColW, 58, data.balance, isDark);
    } else {
      drawTrainingBalance(ctx, rightColX, lowerY, rightColW, 64, data.balance, isDark);
    }

    if (config.showStats) {
      drawStatsGrid(ctx, padding, height - 120, contentWidth, 76, data, isDark);
    }
  }

  // Subtle Watermark at bottom center
  if (config.showWatermark) {
    ctx.save();
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('MYFITAI · TRAIN SMARTER', width / 2, height - 20);
    ctx.restore();
  }

  return canvas;
}

/**
 * Renders to Blob (PNG or JPEG)
 */
export async function renderShareCardToBlob(
  config: ShareCardConfig,
  data: ShareableMuscleData,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.95
): Promise<Blob> {
  const canvas = await renderShareCard(config, data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      mimeType,
      quality
    );
  });
}

/**
 * Renders to base64 Data URL
 */
export async function renderShareCardToDataUrl(
  config: ShareCardConfig,
  data: ShareableMuscleData,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.95
): Promise<string> {
  const canvas = await renderShareCard(config, data);
  return canvas.toDataURL(mimeType, quality);
}
