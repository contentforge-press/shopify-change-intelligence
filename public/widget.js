/*! Shopify Change Intelligence — embeddable store widget | MIT */
(function () {
  'use strict';
  var API = 'https://shopify-intel.contentforge-press.workers.dev';
  var css = ''
    + '.sci-card{font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
    + 'background:#fff;color:#16202e;border:1px solid #e3e8ef;border-radius:14px;'
    + 'padding:16px;max-width:320px;box-sizing:border-box}'
    + '.sci-card *{box-sizing:border-box}'
    + '.sci-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}'
    + '.sci-store{font-weight:700;font-size:14px;word-break:break-all}'
    + '.sci-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex:none}'
    + '.sci-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}'
    + '.sci-stat{background:#f6f8fb;border:1px solid #eef1f6;border-radius:10px;padding:8px 10px}'
    + '.sci-num{font-size:18px;font-weight:700;line-height:1.2}'
    + '.sci-lbl{font-size:11px;color:#667085;margin-top:1px}'
    + '.sci-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;'
    + 'border-top:1px solid #eef1f6;padding-top:10px;font-size:12px}'
    + '.sci-foot a{color:#2f6fed;text-decoration:none;font-weight:600}'
    + '.sci-alert{color:#2f6fed;text-decoration:none;font-weight:600}'
    + '.sci-err{font-size:13px;color:#b42318}';

  function inject() {
    if (document.getElementById('sci-style')) return;
    var s = document.createElement('style');
    s.id = 'sci-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(host, d) {
    host.innerHTML = '';
    if (d.error) {
      host.appendChild(el('div', 'sci-err', 'Live store data unavailable.'));
      return;
    }
    var card = el('div', 'sci-card');
    var head = el('div', 'sci-head');
    var name = el('div', 'sci-store', d.store);
    head.appendChild(name);
    head.appendChild(el('span', 'sci-dot'));
    card.appendChild(head);

    var grid = el('div', 'sci-grid');
    [
      [d.productCount, 'products'],
      [d.inStock, 'in stock'],
      [d.outOfStock, 'out of stock'],
      ['$' + (d.minPrice != null ? d.minPrice : '–'), 'from'],
    ].forEach(function (p) {
      var st = el('div', 'sci-stat');
      st.appendChild(el('div', 'sci-num', p[0]));
      st.appendChild(el('div', 'sci-lbl', p[1]));
      grid.appendChild(st);
    });
    card.appendChild(grid);

    var foot = el('div', 'sci-foot');
    var powered = document.createElement('a');
    powered.href = API + '/?utm_source=widget&utm_medium=embed&utm_store=' + encodeURIComponent(d.store);
    powered.target = '_blank';
    powered.rel = 'noopener';
    powered.textContent = 'Shopify Change Intelligence';
    foot.appendChild(powered);
    var alert = document.createElement('a');
    alert.className = 'sci-alert';
    alert.href = API + '/?utm_source=widget&utm_medium=cta&utm_store=' + encodeURIComponent(d.store);
    alert.target = '_blank';
    alert.rel = 'noopener';
    alert.textContent = 'Get change alerts →';
    foot.appendChild(alert);
    card.appendChild(foot);
    host.appendChild(card);
  }

  function loadOne(host) {
    var store = host.getAttribute('data-store');
    if (!store) return;
    fetch(API + '/v1/widget-data?store=' + encodeURIComponent(store))
      .then(function (r) { return r.json(); })
      .then(function (d) { render(host, d); })
      .catch(function () { render(host, { error: true }); });
  }

  function init() {
    inject();
    var nodes = document.querySelectorAll('.sci-widget:not([data-sci-done])');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('data-sci-done', '1');
      loadOne(nodes[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
