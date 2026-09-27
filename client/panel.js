(function () {
  'use strict';
  var defaults = { radius:42, intensity:120, threshold:55, spread:50, tint:75, color:'#aa8dff' };
  var values = copy(defaults), fields = ['radius','intensity','threshold','spread','tint'];
  var busy = false, queued = false, timer = null, selected = '', hasGlow = false, glowVisible = true;
  var status = document.getElementById('status');
  function copy(x) { var y = {}; for (var k in x) if (x.hasOwnProperty(k)) y[k] = x[k]; return y; }
  function setStatus(message, error) { status.textContent = message; status.className = error ? 'status error' : 'status'; }
  function drawLayerActions() { var button=document.getElementById('toggleGlowBtn'); button.disabled=!hasGlow || busy; button.textContent=glowVisible?'Hide glow':'Show glow'; }
  function host(script, callback) {
    if (!window.__adobe_cep__ || !window.__adobe_cep__.evalScript) { callback('error|Photoshop bridge unavailable. Open this panel in Photoshop.'); return; }
    window.__adobe_cep__.evalScript(script, callback);
  }
  function draw() {
    fields.forEach(function (key) {
      var el = document.getElementById(key); el.value = values[key];
      el.style.setProperty('--fill', ((values[key]-Number(el.min))/(Number(el.max)-Number(el.min))*100)+'%');
      document.getElementById(key+'Value').textContent = values[key]+(key==='radius'?' px':'%');
    });
    document.getElementById('color').value = values.color.toUpperCase();
    document.getElementById('colorSwatch').style.background = values.color;
    var orb=document.getElementById('orb'); orb.style.background=values.color;
    orb.style.boxShadow='0 0 9px 4px '+values.color+',0 0 35px 12px '+values.color+'8c,0 0 70px 23px '+values.color+'55';
  }
  function read() { fields.forEach(function (key) { values[key]=Number(document.getElementById(key).value); }); }
  function inspect() {
    if (busy) return;
    host('LumaGlowCEP.inspect()', function (response) {
      if (!response || response==='EvalScript error.') { setStatus('Could not connect to Photoshop.',true); return; }
      var pieces=response.split('|'), key=pieces[0]+'|'+pieces[1]+'|'+(pieces[3]||'')+'|'+(pieces[4]||'');
      if (pieces[0]==='error') { setStatus(decodeURIComponent(pieces[1]||'Unknown error'),true); return; }
      if (pieces[0]==='none') { selected=''; hasGlow=false; document.getElementById('sourceName').textContent='Select a layer'; drawLayerActions(); return; }
      if (key===selected) return;
      selected=key; hasGlow=pieces[0]==='edit'; glowVisible=pieces[4]!=='0'; drawLayerActions();
      document.getElementById('sourceName').textContent=decodeURIComponent(pieces[1]||'Layer');
      document.getElementById('applyBtn').innerHTML=hasGlow?'Update glow <span>↗</span>':'Create glow <span>↗</span>';
      if (hasGlow && pieces[2]) {
        var v=pieces[2].split(',');
        if (v.length===6) { values={radius:+v[0],intensity:+v[1],threshold:+v[2],spread:+v[3],tint:+v[4],color:'#'+v[5]}; draw(); }
      }
      setStatus(hasGlow?'Editing existing glow.':'Ready to create a glow group.');
    });
  }
  function render() {
    if (busy) { queued=true; return; }
    if (!selected) { setStatus('Select a layer in Photoshop first.',true); return; }
    busy=true; queued=false; drawLayerActions(); read(); setStatus('Updating glow in Photoshop…');
    var command='LumaGlowCEP.apply('+[values.radius,values.intensity,values.threshold,values.spread,values.tint].join(',')+',"'+values.color.slice(1)+'")';
    host(command,function (response) {
      busy=false; drawLayerActions();
      if (!response || response==='EvalScript error.') setStatus('Photoshop could not run the glow script.',true);
      else if (response.indexOf('error|')===0) setStatus(decodeURIComponent(response.slice(6)),true);
      else { setStatus('Glow updated.'); selected=''; inspect(); }
      if (queued) { queued=false; schedule(); }
    });
  }
  function schedule() { clearTimeout(timer); timer=setTimeout(render,260); }
  fields.forEach(function (key) { document.getElementById(key).addEventListener('input',function(){read();draw();if(hasGlow)schedule();}); });
  document.getElementById('color').addEventListener('change',function(e){var c=e.target.value.trim();if(!/^#[0-9a-f]{6}$/i.test(c)){setStatus('Enter a six-digit color such as #AA8DFF.',true);draw();return;}values.color=c.toLowerCase();draw();if(hasGlow)schedule();});
  var colors=['#aa8dff','#54d9ff','#ffad72','#ff76aa','#f9f8e9'], swatches=document.querySelectorAll('.swatch');
  for(var i=0;i<swatches.length;i++)(function(color,button){button.addEventListener('click',function(){values.color=color;draw();if(hasGlow)schedule();});})(colors[i],swatches[i]);
  document.getElementById('applyBtn').addEventListener('click',render);
  document.getElementById('refreshBtn').addEventListener('click',function(){inspect();schedule();});
  document.getElementById('resetBtn').addEventListener('click',function(){values=copy(defaults);draw();if(hasGlow)schedule();});
  document.getElementById('toggleGlowBtn').addEventListener('click',function(){
    if(busy || !hasGlow)return;
    busy=true;drawLayerActions();
    host('LumaGlowCEP.toggleVisibility()',function(response){
      busy=false;
      if(response && response.indexOf('ok|')===0){glowVisible=response.slice(3)==='1';selected='';setStatus(glowVisible?'Glow shown.':'Glow hidden.');inspect();}
      else setStatus(response && response.indexOf('error|')===0?decodeURIComponent(response.slice(6)):'Could not change glow visibility.',true);
      drawLayerActions();
    });
  });
  document.getElementById('compactBtn').addEventListener('click',function(){
    host('LumaGlowCEP.compactLayers()',function(response){
      if(response && response.indexOf('ok|')===0)setStatus('All layer folders collapsed.');
      else setStatus(response && response.indexOf('error|')===0?decodeURIComponent(response.slice(6)):'Could not collapse layer folders.',true);
    });
  });
  draw(); inspect(); setInterval(inspect,900);
})();
