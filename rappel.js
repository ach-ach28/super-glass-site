/* Super Glass : formulaire de rappel en 3 étapes + carrousel d'avis. */
(function () {
  'use strict';
  var ACCESS_KEY = 'c272013d-62f4-4ae8-89df-be9d59507394';
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var CONVERSION = 'AW-17915506691/A5ZmCNbtsYodEIPg495C';
  var ZONE = ['14', '27', '28', '41', '45', '60', '61', '72', '75', '76', '77', '78', '91', '92', '93', '94', '95'];
  var CAMP_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  function track(n) { if (typeof window.sgTrack === 'function') window.sgTrack(n); }
  function consent() { try { var v = JSON.parse(localStorage.getItem('sg-consent')); return v && v.c; } catch (e) { return null; } }

  /* ---- paramètres de campagne : conservés seulement après « Accepter » ---- */
  var pending = {};
  try {
    var q = new URLSearchParams(location.search);
    CAMP_KEYS.forEach(function (k) { var v = q.get(k); if (v) pending[k] = v.slice(0, 200); });
    if (Object.keys(pending).length) pending.page_arrivee = location.pathname;
  } catch (e) {}
  function persist() {
    if (consent() !== 'granted' || !Object.keys(pending).length) return;
    try { if (!sessionStorage.getItem('sg-campagne')) sessionStorage.setItem('sg-campagne', JSON.stringify(pending)); } catch (e) {}
  }
  persist();
  document.addEventListener('sg:consent', persist);
  function campaign() {
    if (consent() !== 'granted') return '';
    try {
      var c = JSON.parse(sessionStorage.getItem('sg-campagne') || '{}');
      return Object.keys(c).map(function (k) { return k + '=' + c[k]; }).join(' | ');
    } catch (e) { return ''; }
  }

  /* ---- carrousel d'avis ---- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rail]'); if (!b) return;
    var rail = document.getElementById(b.getAttribute('aria-controls')); if (!rail) return;
    rail.scrollBy({ left: (b.getAttribute('data-rail') === 'next' ? 1 : -1) * rail.clientWidth * 0.9, behavior: 'smooth' });
  });

  /* ---- formulaire ---- */
  var dlg = document.getElementById('rappel');
  if (!dlg) return;
  var form = dlg.querySelector('form');
  var steps = [].slice.call(dlg.querySelectorAll('.rf-step'));
  var barFill = dlg.querySelector('.rf-bar span');
  var countB = dlg.querySelector('.rf-count b');
  var countP = dlg.querySelector('.rf-count');
  var source = '';
  var current = '1';
  var sending = false;

  function err(name, show) { var p = dlg.querySelector('[data-err="' + name + '"]'); if (p) p.hidden = !show; }
  function field(name) { return form.elements[name]; }

  function show(step) {
    current = String(step);
    steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== current; });
    var done = current === 'ok';
    barFill.style.width = done ? '100%' : (Number(current) / 3 * 100) + '%';
    countP.hidden = done;
    if (!done) countB.textContent = current;
    var h = dlg.querySelector('.rf-step[data-step="' + current + '"] h2');
    if (h) { dlg.setAttribute('aria-labelledby', h.id); h.focus({ preventScroll: true }); }
    var active = dlg.querySelector('.rf-step[data-step="' + current + '"]'); if (active) active.scrollTop = 0;
    if (current === '2') track('etape_formulaire_2');
    if (current === '3') track('etape_formulaire_3');
  }

  function open(src, gift) {
    source = src || '';
    if (form.getAttribute('data-sent') === '1') { form.reset(); form.removeAttribute('data-sent'); }
    [].slice.call(dlg.querySelectorAll('.rf-err, .rf-zone')).forEach(function (p) { p.hidden = true; });
    if (gift) {
      [].slice.call(form.elements.cadeau).forEach(function (r) { r.checked = r.value === gift; });
    }
    syncOther();
    show(1);
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else { dlg.setAttribute('open', ''); }
    document.documentElement.classList.add('rf-lock');
    track('ouverture_formulaire');
  }
  function close() {
    if (typeof dlg.close === 'function' && dlg.open) dlg.close(); else dlg.removeAttribute('open');
    document.documentElement.classList.remove('rf-lock');
  }
  dlg.addEventListener('close', function () { document.documentElement.classList.remove('rf-lock'); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rappel], a[data-gift]');
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-rappel') || 'cadeau', t.getAttribute('data-gift') || '');
  });

  function vitrages() { return [].slice.call(form.querySelectorAll('input[name="vitrage"]:checked')).map(function (i) { return i.value; }); }
  function gift() {
    var r = form.querySelector('input[name="cadeau"]:checked');
    if (!r) return 'Je choisirai plus tard';
    if (r.value === 'Autre cadeau') { var t = field('autre_cadeau').value.trim(); return t ? 'Autre cadeau : ' + t : 'Autre cadeau (à préciser)'; }
    return r.value;
  }
  function syncOther() {
    var r = form.querySelector('input[name="cadeau"]:checked');
    var box = dlg.querySelector('.rf-other');
    box.hidden = !(r && r.value === 'Autre cadeau');
    return !box.hidden;
  }
  function normTel(v) { v = String(v || '').replace(/[\s.\-()]/g, ''); if (/^00/.test(v)) v = '+' + v.slice(2); if (/^\+33/.test(v)) v = '0' + v.slice(3); return v; }
  function telOk(v) { return /^0[1-9]\d{8}$/.test(normTel(v)); }
  function inZone(cp) { return ZONE.indexOf(String(cp).slice(0, 2)) !== -1; }

  function next() {
    if (current === '3') return;
    if (current === '1') {
      var ok = vitrages().length > 0; err('vitrage', !ok);
      if (ok) show(2);
    } else if (current === '2') { show(3); }
  }
  dlg.addEventListener('click', function (e) {
    if (e.target.closest('[data-rf-next]')) next();
    else if (e.target.closest('[data-rf-back]') && !e.target.closest('[data-rf-close]')) show(Math.max(1, Number(current) - 1));
    else if (e.target.closest('[data-rf-close]')) close();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'vitrage' && vitrages().length) err('vitrage', false);
    if (e.target.name === 'cadeau') {
      if (syncOther()) { field('autre_cadeau').focus(); return; } /* « Autre cadeau » : on laisse le temps de préciser */
      setTimeout(function () { if (current === '2') show(3); }, 260);
    }
  });

  var cp = field('cp');
  cp.addEventListener('input', function () {
    cp.value = cp.value.replace(/\D/g, '').slice(0, 5);
    var z = dlg.querySelector('.rf-zone');
    z.hidden = !(cp.value.length === 5 && !inZone(cp.value));
    if (cp.value.length === 5) { err('cp', false); cp.removeAttribute('aria-invalid'); }
  });
  ['nom', 'tel'].forEach(function (n) {
    field(n).addEventListener('input', function () { err(n, false); field(n).removeAttribute('aria-invalid'); });
  });

  function check() {
    var bad = [];
    var nom = field('nom').value.trim();
    if (nom.length < 2) bad.push('nom');
    if (!telOk(field('tel').value)) bad.push('tel');
    if (!/^\d{5}$/.test(field('cp').value)) bad.push('cp');
    ['nom', 'tel', 'cp'].forEach(function (n) {
      var b = bad.indexOf(n) !== -1; err(n, b);
      if (b) field(n).setAttribute('aria-invalid', 'true'); else field(n).removeAttribute('aria-invalid');
    });
    if (bad.length) field(bad[0]).focus();
    return !bad.length;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (current !== '3') { next(); return; }
    if (sending || !check()) return;
    err('envoi', false);
    if (form.elements.botcheck.checked) { show('ok'); return; } /* robot : on ne transmet rien */
    sending = true;
    var btn = form.querySelector('.rf-submit'); var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Envoi en cours…';
    var code = field('cp').value;
    var payload = {
      access_key: ACCESS_KEY,
      subject: 'Nouvelle demande de rappel (' + code + ')',
      from_name: 'Site super-glass.fr',
      'Nom': field('nom').value.trim(),
      'Téléphone': normTel(field('tel').value),
      'Code postal': code + (inZone(code) ? '' : ' (hors zone habituelle, à vérifier)'),
      'Vitrage(s)': vitrages().join(', '),
      'Cadeau': gift(),
      'Véhicule': field('vehicule').value.trim() || '—',
      'Assurance': field('assurance').value.trim() || '—',
      'Bouton utilisé': source || '—',
      'Page d’origine': location.pathname,
      'Date et heure': new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
      'Campagne': campaign() || '—',
      botcheck: ''
    };
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j && j.success === true }; }, function () { return { ok: false }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error('echec');
        if (typeof window.gtag === 'function') window.gtag('event', 'conversion', { send_to: CONVERSION });
        track('formulaire_envoye');
        form.setAttribute('data-sent', '1');
        show('ok');
      })
      .catch(function () { err('envoi', true); })
      .then(function () { sending = false; btn.disabled = false; btn.textContent = label; });
  });
})();
