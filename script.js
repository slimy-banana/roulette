(function(){
  'use strict';

  const canvas = document.getElementById('wheel');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const spinBtn = document.getElementById('spinBtn');
  const stopBtn = document.getElementById('stopBtn');
  const segmentsInput = document.getElementById('segmentsInput');
  const countEl = document.getElementById('count');
  const resultEl = document.getElementById('result');

  if(!canvas || !ctx){
    console.error('canvas 要素が見つからないか 2D コンテキストが取得できません。id="wheel" を確認してください。');
    if(resultEl) resultEl.textContent = 'エラー: canvas が見つかりません';
    return;
  }

  let segments = [];
  let rotation = 0;
  let animRequest = null;
  let spinning = false;
  const badge = ["🔶","🔷"];

  // ★ 次に出る予定を保持
  let nextTarget = null;

  function parseSegments(){
    const raw = (segmentsInput && segmentsInput.value ? segmentsInput.value : '').split(',').map(s=>s.trim()).filter(Boolean);
    segments = raw.length ? raw : ['0','1'];
    if(countEl) countEl.textContent = segments.length;
  }

  function getColorForLabel(label, i){
    if(label === '0' || label === '00') return '#008000';
    return i % 2 === 0 ? '#c62828' : '#0b0b0b';
  }

  function ensureCanvasSize(){
    const dpr = window.devicePixelRatio || 1;
    let W = canvas.clientWidth || Math.floor(canvas.getBoundingClientRect().width) || 600;
    let H = canvas.clientHeight || Math.floor(canvas.getBoundingClientRect().height) || 600;
    W = Math.max(20, W);
    H = Math.max(20, H);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return { W, H };
  }

  function drawWheel(){
    try{
      const { W, H } = ensureCanvasSize();
      const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 10;
      ctx.clearRect(0,0,W,H);

      const n = segments.length || 1;
      const seg = Math.PI*2 / n;
      const startOffset = -Math.PI/2;

      for(let i=0;i<n;i++){
        const a0 = startOffset + i*seg + rotation;
        const a1 = a0 + seg;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,r*1.05,a0,a1,false);
        ctx.closePath();
        ctx.fillStyle = Math.floor(i/(segments.length/5.7)) % 2 === 0 ? '#6a4421ff' : '#845c3c';
        ctx.fill();
      }

      for(let i=0;i<n;i++){
        const a0 = startOffset + i*seg + rotation;
        const a1 = a0 + seg;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,r,a0,a1,false);
        ctx.closePath();
        ctx.fillStyle = getColorForLabel(segments[i], i);
        ctx.fill();

        ctx.save();
        ctx.translate(cx,cy);
        const angle = startOffset + (i+0.5)*seg + rotation;
        ctx.rotate(angle);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.font = Math.max(12, r * 0.07) + 'px sans-serif';
        const label = String(segments[i] ?? '');
        ctx.fillText(label, r - 10, 6);
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(cx,cy, Math.max(12, r*0.85), 0, Math.PI*2);
      ctx.fillStyle = '#11182742';
      ctx.strokeStyle = '#945c28ff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fill();

      for(let i=0;i<n;i++){
        const a0 = startOffset + i*seg + rotation;
        const a1 = a0 + seg;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,r*0.7,a0,a1,false);
        ctx.closePath();
        ctx.fillStyle = Math.floor(i/(segments.length/6)) % 2 === 0 ? '#6a4421ff' : '#845c3c';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx,cy, Math.max(12, r*0.3), 0, Math.PI*2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#a79429ff';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx,cy, Math.max(12, r*0.2), 0, Math.PI*2);
      ctx.fillStyle = '#a79429ff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx,cy, Math.max(12, r*0.1), 0, Math.PI*2);
      ctx.fillStyle = '#ffff00ff';
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#ffff00ff';
      ctx.moveTo(cx-110*Math.sin(-rotation+Math.PI/2),cy-110*Math.cos(-rotation+Math.PI/2));
      ctx.lineWidth = 15
      ctx.lineTo(cx+110*Math.sin(-rotation+Math.PI/2),cy+110*Math.cos(-rotation+Math.PI/2));
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = '#ffff00ff';
      ctx.moveTo(cx-110*Math.cos(rotation-Math.PI/2),cy-110*Math.sin(rotation-Math.PI/2));
      ctx.lineWidth = 15
      ctx.lineTo(cx+110*Math.cos(rotation-Math.PI/2),cy+110*Math.sin(rotation-Math.PI/2));
      ctx.stroke();

      for(let i = 0;i<4;i++){
        ctx.beginPath();
        ctx.arc(cx+110*Math.cos(rotation-Math.PI*(i*0.5)),cy+110*Math.sin(rotation-Math.PI*(i*0.5)), 15, 0, Math.PI*2);
        ctx.fillStyle = '#ffff00ff';
        ctx.fill();
      }

    }catch(err){
      console.error('drawWheel 中にエラー:', err);
    }
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function getLandedIndex(){
    const n = segments.length || 1;
    const seg = Math.PI*2 / n;
    let rot = rotation % (Math.PI * 2);
    if(rot < 0) rot += Math.PI * 2;
    let idx = Math.floor((-rot) / seg);
    idx = ((idx % n) + n) % n;
    return idx;
  }

  function spinToIndex(targetIndex, rotations){
    if(spinning) return;
    spinning = true;
    if(stopBtn) stopBtn.disabled = false;
    if(spinBtn) spinBtn.disabled = true;

    const n = segments.length;
    const seg = Math.PI*2 / n;
    const baseTarget = - (targetIndex + 0.5) * seg;
    let finalRotation = baseTarget + rotations * Math.PI * 2;
    while(finalRotation <= rotation) finalRotation += Math.PI * 2;

    const startRotation = rotation;
    const delta = finalRotation - startRotation;
    const duration = 4800 + rotations * 300;
    const startTime = performance.now();

    function animate(now){
      const t = Math.min(1, (now - startTime) / duration * 0.6);
      rotation = startRotation + delta * easeOutCubic(t);
      drawWheel();
      if(t < 1){
        animRequest = requestAnimationFrame(animate);
      } else {
        spinning = false;
        if(spinBtn) spinBtn.disabled = false;
        if(stopBtn) stopBtn.disabled = true;
        const landedIndex = getLandedIndex();
        if(resultEl) resultEl.textContent = '結果: ' + (segments[landedIndex] == 0 ?"🟩":badge[landedIndex % 2]) + segments[landedIndex];
        console.log('Spin finished. index=', landedIndex, 'label=', segments[landedIndex]);
      }
    }
    animRequest = requestAnimationFrame(animate);
  }

  function onSpinClick(){
    try{
      parseSegments();
      if(!segments.length){
        if(resultEl) resultEl.textContent = '区画を指定してください';
        return;
      }

      const n = segments.length;
      const target = (nextTarget !== null) ? nextTarget : Math.floor(Math.random() * n);

      rotation = rotation % (Math.PI * 2);
      if(rotation < 0) rotation += Math.PI * 2;
      const rotations = Math.floor(Math.random() * 6) + 6;
      if(resultEl) resultEl.textContent = '回転中...';
      spinToIndex(target, rotations);

      // 次回の予告を決めて表示
      nextTarget = Math.floor(Math.random() * n);
      const cheatEl = document.querySelector('.ikasama');
      if (cheatEl) {
        cheatEl.textContent = segments[nextTarget];
      }

      function sendToDiscord(result) {
      const webhookURL = "https://discord.com/api/webhooks/1421058884784750593/8JI5vR02aEkha0_Gx3ZP4kfwOzGHcH5TgI53laU-ykN3ohitLuQraE1zizooZ6UTiWvN"; // さっきのURL
      fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        content: `次の出目: ${result}`
        })
      });
      }

      sendToDiscord(segments[nextTarget]);

    }catch(err){
      console.error('Spin エラー:', err);
    }
  }

  function onStopClick(){
    if(!spinning) return;
    if(animRequest) cancelAnimationFrame(animRequest);
    const n = segments.length;
    const seg = Math.PI*2 / n;
    const currentIdx = getLandedIndex();
    const offset = Math.floor(Math.random() * 3) + 1;
    const newTarget = (currentIdx + offset) % n;
    const rotations = 2;
    const baseTarget = - (newTarget + 0.5) * seg;
    let finalRotation = baseTarget + rotations * Math.PI * 2;
    while(finalRotation <= rotation) finalRotation += Math.PI * 2;
    const startRotation = rotation;
    const delta = finalRotation - startRotation;
    const duration = 2500;
    const startTime = performance.now();

    function animate(now){
      const t = Math.min(1, (now - startTime) / duration);
      rotation = startRotation + delta * easeOutCubic(t);
      drawWheel();
      if(t < 1){
        animRequest = requestAnimationFrame(animate);
      } else {
        spinning = false;
        if(spinBtn) spinBtn.disabled = false;
        if(stopBtn) stopBtn.disabled = true;
        const landedIndex = getLandedIndex();
        if(resultEl) resultEl.textContent = '結果: ' + badge[landedIndex % 2] + segments[landedIndex];
      }
    }
    animRequest = requestAnimationFrame(animate);
  }

  window.addEventListener('load', ()=>{
    try{
      spinBtn && spinBtn.addEventListener('click', onSpinClick);
      stopBtn && stopBtn.addEventListener('click', onStopClick);
      segmentsInput && segmentsInput.addEventListener('input', ()=>{ parseSegments(); drawWheel(); if(resultEl) resultEl.textContent = '結果: —'; });

      parseSegments();
      rotation = 0;
      drawWheel();

      // 初期の予告を決めて表示
      const n = segments.length;
      nextTarget = Math.floor(Math.random() * n);
      const cheatEl = document.querySelector('.ikasama');
      if (cheatEl) {
        cheatEl.textContent = segments[nextTarget];
      }

      let resizeTimeout = null;
      window.addEventListener('resize', ()=>{
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(drawWheel, 120);
      });

      console.log('Roulette initialized. segments:', segments);
    }catch(err){
      console.error('初期化中のエラー:', err);
      resultEl && (resultEl.textContent = '初期化エラー。Console を確認してください');
    }
  });
})();
