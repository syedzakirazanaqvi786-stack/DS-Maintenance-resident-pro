/**
 * DS Maintenance Suite - Ultra-Responsive Standalone Canvas 2D Charting Engine
 * High-performance, zero-dependency, 100% offline visual analytics for Master Admin & Receptionists.
 * Theme-aware (Dark & Light Mode), unit-aware (Flats vs PKR), with auto-wrapping legends and crisp typography.
 */

window.DSCharts = {
  // Check if current theme is light mode
  isLightMode: function() {
    return document.body.classList.contains('light-mode');
  },

  // 1. Draw Multi-Dataset or Single-Dataset Bar Chart
  drawBarChart: function(canvasId, labels, datasets, options = {}) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const isLight = this.isLightMode();
      
      const rect = canvas.getBoundingClientRect();
      const fallbackWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 20 : 400;
      const width = Math.max(260, rect.width > 0 ? rect.width : fallbackWidth);
      const height = options.height || 230;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      const padding = { top: 32, right: 18, bottom: 50, left: 62 };
      const chartWidth = Math.max(50, width - padding.left - padding.right);
      const chartHeight = Math.max(50, height - padding.top - padding.bottom);

      ctx.clearRect(0, 0, width, height);

      // Find max value across datasets
      let maxVal = 10000;
      (datasets || []).forEach(ds => {
        (ds.data || []).forEach(v => { if (v > maxVal) maxVal = v; });
      });
      maxVal = Math.ceil((maxVal * 1.25) / 1000) * 1000;
      if (maxVal === 0) maxVal = 10000;

      // Draw Grid Lines & Y-Axis Labels
      const gridLines = 4;
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
      ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';

      for (let i = 0; i <= gridLines; i++) {
        const yVal = (maxVal / gridLines) * i;
        const yPos = padding.top + chartHeight - (chartHeight / gridLines) * i;
        
        ctx.beginPath();
        ctx.moveTo(padding.left, yPos);
        ctx.lineTo(width - padding.right, yPos);
        ctx.stroke();

        const labelText = yVal >= 1000000 ? `${(yVal / 1000000).toFixed(1)}M` : (yVal >= 1000 ? `${(yVal / 1000).toFixed(0)}k` : yVal);
        ctx.fillText(`PKR ${labelText}`, padding.left - 8, yPos + 3.5);
      }

      if (!labels || labels.length === 0) return;

      // Draw Bars
      const groupWidth = chartWidth / labels.length;
      const barCount = (datasets || []).length || 1;
      const barWidth = Math.max(10, Math.min(38, (groupWidth * 0.65) / barCount));
      const gap = 4;

      // Predefined rich gradient themes if not specified
      const defaultPalette = [
        { start: '#38bdf8', end: '#1d4ed8' }, // Cyan / Blue (Collections)
        { start: '#f43f5e', end: '#be123c' }, // Rose / Crimson (Expenses)
        { start: '#10b981', end: '#047857' }, // Emerald / Green (Net Margin)
        { start: '#a855f7', end: '#6b21a8' }  // Purple / Violet
      ];

      labels.forEach((label, gIdx) => {
        const groupCenter = padding.left + gIdx * groupWidth + groupWidth / 2;
        const totalGroupWidth = barCount * barWidth + (barCount - 1) * gap;
        const startX = groupCenter - totalGroupWidth / 2;

        (datasets || []).forEach((ds, dIdx) => {
          const val = (ds.data && ds.data[gIdx] !== undefined) ? Number(ds.data[gIdx]) : 0;
          const barH = Math.max(0, (val / maxVal) * chartHeight);
          const x = startX + dIdx * (barWidth + gap);
          const y = padding.top + chartHeight - barH;

          const theme = defaultPalette[dIdx % defaultPalette.length];
          const colorStart = ds.colorStart || (gIdx === 0 ? '#38bdf8' : (gIdx === 1 ? '#f43f5e' : '#10b981'));
          const colorEnd = ds.colorEnd || (gIdx === 0 ? '#1d4ed8' : (gIdx === 1 ? '#be123c' : '#047857'));

          // Gradient bar fill
          const grad = ctx.createLinearGradient(0, y, 0, y + Math.max(1, barH));
          grad.addColorStop(0, colorStart);
          grad.addColorStop(1, colorEnd);

          ctx.fillStyle = grad;
          ctx.beginPath();
          const r = Math.min(4, barWidth / 2);
          ctx.moveTo(x, y + r);
          ctx.arcTo(x, y, x + r, y, r);
          ctx.arcTo(x + barWidth, y, x + barWidth, y + r, r);
          ctx.lineTo(x + barWidth, padding.top + chartHeight);
          ctx.lineTo(x, padding.top + chartHeight);
          ctx.closePath();
          ctx.fill();

          // Value on top of bar
          if (val > 0) {
            ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
            ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            const valStr = val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val);
            ctx.fillText(`PKR ${valStr}`, x + barWidth / 2, Math.max(12, y - 5));
          } else if (val === 0) {
            ctx.fillStyle = isLight ? '#94a3b8' : '#64748b';
            ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('0', x + barWidth / 2, padding.top + chartHeight - 4);
          }
        });

        // X-Axis Labels (Multi-line auto-wrapping to prevent overlapping)
        ctx.fillStyle = isLight ? '#334155' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const words = String(label).split(' ');
        if (words.length >= 2 && String(label).length > 9) {
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');
          ctx.fillText(line1, groupCenter, height - 22);
          ctx.fillText(line2, groupCenter, height - 9);
        } else {
          ctx.fillText(label, groupCenter, height - 14);
        }
      });
    } catch (err) {
      console.warn("DSCharts.drawBarChart error suppressed:", err);
    }
  },

  // 2. Draw Donut Chart (Flats Occupancy Distribution or Financial Breakdown)
  drawDonutChart: function(canvasId, labels, data, colors, options = {}) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const isLight = this.isLightMode();

      const rect = canvas.getBoundingClientRect();
      const fallbackWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 20 : 380;
      const width = Math.max(260, rect.width > 0 ? rect.width : fallbackWidth);
      const height = options.height || 230;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const safeData = (data || []).map(v => Number(v) || 0);
      const total = safeData.reduce((a, b) => a + b, 0);

      const isCurrency = options.isCurrency !== undefined ? options.isCurrency : (options.unitLabel ? (options.unitLabel === 'PKR') : true);
      const unitLabel = options.unitLabel || (isCurrency ? 'PKR' : 'Flats');

      if (total <= 0 || safeData.length === 0) {
        ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('No data available for selected period', width / 2, height / 2);
        return;
      }

      const centerX = Math.max(50, Math.min(width * 0.28, 85));
      const centerY = height / 2;
      const outerRadius = Math.max(26, Math.min(centerX - 10, centerY - 16));
      const innerRadius = Math.max(12, outerRadius * 0.56);

      let startAngle = -Math.PI / 2;
      const safeColors = (colors && colors.length > 0) ? colors : ['#38bdf8', '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6'];

      safeData.forEach((val, i) => {
        if (val <= 0) return;
        const sliceAngle = (val / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.fillStyle = safeColors[i % safeColors.length];
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fill();

        startAngle = endAngle;
      });

      ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Total', centerX, centerY - 4);

      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#38bdf8';

      let totalFormatted = '';
      if (isCurrency) {
        totalFormatted = `PKR ${(total >= 1000000 ? (total/1000000).toFixed(1) + 'M' : (total >= 1000 ? (total/1000).toFixed(0) + 'k' : total.toLocaleString()))}`;
      } else {
        totalFormatted = `${total.toLocaleString()} ${unitLabel}`;
      }
      ctx.fillText(totalFormatted, centerX, centerY + 12);

      const legendX = centerX + outerRadius + 14;
      const availableLegendWidth = width - legendX - 8;
      
      const isCompact = availableLegendWidth < 155;
      const itemSpacing = isCompact ? 34 : Math.min(28, Math.max(20, (height - 30) / Math.max(1, (labels || []).length)));
      let legendY = Math.max(20, centerY - (((labels || []).length * itemSpacing) / 2) + (isCompact ? 8 : 10));

      (labels || []).forEach((label, i) => {
        const val = safeData[i] || 0;
        const color = safeColors[i % safeColors.length];

        const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
        const valStr = isCurrency ? `PKR ${(val >= 1000 ? (val/1000).toFixed(0) + 'k' : val.toLocaleString())}` : `${val}`;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(legendX + 4, legendY - (isCompact ? 9 : 3), 4.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.textAlign = 'left';

        if (isCompact) {
          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(label, legendX + 13, legendY - 6);

          ctx.fillStyle = isLight ? '#334155' : '#38bdf8';
          ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(`${valStr} (${pct}%)`, legendX + 13, legendY + 8);
        } else {
          ctx.fillStyle = isLight ? '#0f172a' : '#cbd5e1';
          ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(`${label}: ${valStr} (${pct}%)`, legendX + 13, legendY);
        }

        legendY += itemSpacing;
      });
    } catch (err) {
      console.warn("DSCharts.drawDonutChart error suppressed:", err);
    }
  },

  // 3. Draw Daily Revenue Trend Spike Line Chart
  drawLineChart: function(canvasId, labels, data, options = {}) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const isLight = this.isLightMode();

      const rect = canvas.getBoundingClientRect();
      const fallbackWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 20 : 400;
      const width = Math.max(260, rect.width > 0 ? rect.width : fallbackWidth);
      const height = options.height || 230;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const padding = { top: 32, right: 24, bottom: 42, left: 62 };
      const chartWidth = Math.max(50, width - padding.left - padding.right);
      const chartHeight = Math.max(50, height - padding.top - padding.bottom);

      const safeData = (data || []).map(v => Number(v) || 0);
      let maxVal = Math.max(...safeData, 1000);
      maxVal = Math.ceil((maxVal * 1.25) / 1000) * 1000;

      // Draw Grid Lines & Y-Axis Labels
      const gridLines = 4;
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';

      for (let i = 0; i <= gridLines; i++) {
        const yVal = (maxVal / gridLines) * i;
        const yPos = padding.top + chartHeight - (chartHeight / gridLines) * i;

        ctx.beginPath();
        ctx.moveTo(padding.left, yPos);
        ctx.lineTo(width - padding.right, yPos);
        ctx.stroke();

        const labelText = yVal >= 1000000 ? `${(yVal / 1000000).toFixed(1)}M` : (yVal >= 1000 ? `${(yVal / 1000).toFixed(0)}k` : yVal);
        ctx.fillText(`PKR ${labelText}`, padding.left - 8, yPos + 3.5);
      }

      if (!labels || labels.length === 0 || safeData.length === 0) return;

      const xStep = safeData.length > 1 ? chartWidth / (safeData.length - 1) : chartWidth;
      const points = safeData.map((val, idx) => {
        const x = padding.left + idx * xStep;
        const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
        return { x, y, val };
      });

      // Fill Gradient under line
      const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

      ctx.fillStyle = areaGrad;
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Stroke Spike Line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw Spike Points & Values
      points.forEach((p, idx) => {
        if (p.val > 0) {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          const valStr = p.val >= 1000 ? `${(p.val / 1000).toFixed(0)}k` : p.val;
          ctx.fillText(`${valStr}`, p.x, p.y - 7);
        }
      });

      // X-Axis Labels
      ctx.fillStyle = isLight ? '#334155' : '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.font = '9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      const labelStep = Math.max(1, Math.floor(labels.length / 8));
      labels.forEach((lbl, idx) => {
        if (idx % labelStep === 0 || idx === labels.length - 1) {
          const x = padding.left + idx * xStep;
          ctx.fillText(lbl, x, height - 12);
        }
      });
    } catch (err) {
      console.warn("DSCharts.drawLineChart error suppressed:", err);
    }
  }
};
