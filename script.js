// 改良版 script.js ――― そのまま上書きして使って
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

  function parseSegments(){
    const raw = segmentsInput.value.split(',').map(s=>s.trim()).filter(Boolean);
    segments = raw.length ? raw : ['0','1'];
    countEl && (countEl.textContent = segments.length);
  }

  function getColorForLabel(label, i){
    if(label === '0' || label === '00') return '#008000';
    return i % 2 === 0 ? '#c62828' : '#0b0b0b';
  }

  function ensureCanvasSize(){
    // CSS が適用された後の実寸を取る（フォールバック値込み）
    const dpr = window.devicePixelRatio || 1;
    // prefer clientWidth/clientHeight; if zero, fallback to bounding rect or fixed 600
    let W = canvas.clientWidth || Math.floor(canvas.getBoundingClientRect().width) || 600;
    let H = canvas.clientHeight || Math.floor(canvas.getBoundingClientRect().height) || 600;

    // 最低限の安全サイズ
    W = Math.max(20, W);
    H = Math.max(20, H);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    // CSS 上のスケーリングを合わせる
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
        ctx.arc(cx,cy,r,a0,a1,false);
        ctx.closePath();
        ctx.fillStyle = getColorForLabel(segments[i], i);
        ctx.fill();

        // ラベル描画
        ctx.save();
        ctx.translate(cx,cy);
        const angle = startOffset + (i+0.5)*seg + rotation;
        ctx.rotate(angle);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.font = Math.max(12, r * 0.07) + 'px sans-serif';
        // ラベルがはみ出す時は短くする
        const label = String(segments[i] ?? '');
        ctx.fillText(label, r - 10, 6);
        ctx.restore();
      }

      // 中心丸（視認性）
      ctx.beginPath();
      ctx.arc(cx,cy, Math.max(6, r*0.12), 0, Math.PI*2);
      ctx.fillStyle = '#111827aa';
      ctx.fill();
    }catch(err){
      console.error('drawWheel 中にエラー:', err);
    }
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function getLandedIndex(){
    const n = segments.length || 1;
    const seg = Math.PI*2 / n;
    const startOffset = -Math.PI/2;
    const val = - (rotation + startOffset) / seg - 0.5;
    let idx = Math.round(val) % n;
    if(idx < 0) idx += n;
    return idx;
  }

  function spinToIndex(targetIndex, rotations){
    if(spinning) return;
    spinning = true;
    stopBtn.disabled = false;
    spinBtn.disabled = true;

    const n = segments.length;
    const seg = Math.PI*2 / n;
    const baseTarget = - (targetIndex + 0.5) * seg;
    let finalRotation = baseTarget + rotations * Math.PI * 2;
    while(finalRotation <= rotation) finalRotation += Math.PI * 2;

    const startRotation = rotation;
    const delta = finalRotation - startRotation;
    const duration = 2800 + rotations * 300;
    const startTime = performance.now();

    function animate(now){
      const t = Math.min(1, (now - startTime) / duration);
      rotation = startRotation + delta * easeOutCubic(t);
      drawWheel();
      if(t < 1){
        animRequest = requestAnimationFrame(animate);
      } else {
        spinning = false;
        spinBtn.disabled = false;
        stopBtn.disabled = true;
        const landedIndex = getLandedIndex();
        resultEl.textContent = '結果: ' + segments[landedIndex];
        console.log('Spin finished. index=', landedIndex, 'label=', segments[landedIndex]);
      }
    }
    animRequest = requestAnimationFrame(animate);
  }

  // イベント: Spin
  function onSpinClick(){
    try{
      parseSegments();
      if(!segments.length){
        resultEl.textContent = '区画を指定してください';
        return;
      }
      const n = segments.length;
      const target = Math.floor(Math.random() * n);
      const rotations = Math.floor(Math.random() * 6) + 6;
      resultEl.textContent = '回転中...';
      spinToIndex(target, rotations);
    }catch(err){
      console.error('Spin エラー:', err);
    }
  }

  // Stop: 途中で早く止める機能
  function onStopClick(){
    if(!spinning) return;
    cancelAnimationFrame(animRequest);
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
    const duration = 900;
    const startTime = performance.now();

    function animate(now){
      const t = Math.min(1, (now - startTime) / duration);
      rotation = startRotation + delta * easeOutCubic(t);
      drawWheel();
      if(t < 1){
        animRequest = requestAnimationFrame(animate);
      } else {
        spinning = false;
        spinBtn.disabled = false;
        stopBtn.disabled = true;
        const landedIndex = getLandedIndex();
        resultEl.textContent = '結果: ' + segments[landedIndex];
      }
    }
    animRequest = requestAnimationFrame(animate);
  }

  // 初期化は load イベントで行う（CSS とレイアウトが全部反映された後）
  window.addEventListener('load', ()=>{
    try{
      // attach handlers
      spinBtn && spinBtn.addEventListener('click', onSpinClick);
      stopBtn && stopBtn.addEventListener('click', onStopClick);
      segmentsInput && segmentsInput.addEventListener('input', ()=>{ parseSegments(); drawWheel(); resultEl.textContent = '結果: —'; });

      // parse, draw
      parseSegments();
      rotation = 0;
      drawWheel();

      // リサイズ対応（慎重に）
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
