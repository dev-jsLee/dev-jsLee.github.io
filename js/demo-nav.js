// demo-nav.js — vendoring된 데모 화면에 좌측 "디자인 리뷰" 사이트맵 오버레이를 주입한다.
// sync-demos.mjs 가 각 데모 페이지의 </body> 앞에
//   <!-- demo-nav --><script defer src="/js/demo-nav.js" data-demo-base="/projects/<slug>/"></script>
// 를 삽입하고, 같은 폴더의 __nav.json(페이지 목록)을 읽어 좌측 패널을 그린다.
// Shadow DOM 으로 데모 자체 CSS와 격리 → 디자인을 깨지 않는다.
(function () {
  var script = document.querySelector('script[data-demo-base]');
  var base = script && script.getAttribute('data-demo-base');
  if (!base) return;
  if (base.charAt(base.length - 1) !== '/') base += '/';
  var slug = base.replace(/\/+$/, '').split('/').pop();

  // 썸네일 캡처 등 오버레이를 숨기고 싶을 때: URL 에 ?nonav
  if (/[?&]nonav\b/.test(location.search)) return;

  fetch(base + '__nav.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && Array.isArray(data.pages) && data.pages.length) build(data.pages);
    })
    .catch(function () {});

  function humanize(p) {
    if (p.title && !/^\s*$/.test(p.title)) return p.title;
    var name = p.path.split('/').pop().replace(/\.html?$/i, '');
    return name.replace(/[-_]/g, ' ');
  }
  function groupOf(path) {
    var parts = path.split('/');
    return parts.length > 1 ? parts[parts.length - 2] : '';
  }

  function build(pages) {
    var host = document.createElement('div');
    host.id = '__demo_nav_host';
    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    var open = sessionStorage.getItem('demoNavOpen') !== '0';
    var curPath = decodeURIComponent(location.pathname);

    var wrap = document.createElement('div');
    wrap.className = 'wrap' + (open ? ' open' : '');

    var handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'handle';
    handle.title = '디자인 리뷰 — 페이지 이동';
    handle.textContent = '◈ 디자인';
    handle.addEventListener('click', function () {
      open = !open;
      wrap.classList.toggle('open', open);
      sessionStorage.setItem('demoNavOpen', open ? '1' : '0');
    });

    var panel = document.createElement('aside');
    panel.className = 'panel';

    var head = document.createElement('div');
    head.className = 'head';
    head.innerHTML = '<strong>디자인 리뷰</strong><em>' + slug + ' · ' + pages.length + ' pages</em>';
    panel.appendChild(head);

    var list = document.createElement('nav');
    list.className = 'list';
    var lastGroup = null;
    pages.forEach(function (p) {
      var g = groupOf(p.path);
      if (g !== lastGroup) {
        lastGroup = g;
        if (g) {
          var gl = document.createElement('div');
          gl.className = 'group';
          gl.textContent = g;
          list.appendChild(gl);
        }
      }
      var a = document.createElement('a');
      a.className = 'item';
      a.href = base + p.path;
      if (curPath.slice(-(p.path.length + 1)) === '/' + p.path) a.classList.add('current');
      a.textContent = humanize(p);
      list.appendChild(a);
    });
    panel.appendChild(list);

    var foot = document.createElement('div');
    foot.className = 'foot';
    foot.innerHTML = '<a href="/project.html?slug=' + slug + '">← 포트폴리오로</a>';
    panel.appendChild(foot);

    wrap.appendChild(panel);
    wrap.appendChild(handle);
    root.appendChild(wrap);
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.wrap{position:fixed;top:0;left:0;height:100%;z-index:2147483000;',
    'font-family:system-ui,-apple-system,"Apple SD Gothic Neo",Segoe UI,sans-serif}',
    '.panel{position:absolute;top:0;left:0;height:100%;width:250px;display:flex;flex-direction:column;',
    'background:#11151f;color:#e7e9ee;border-right:1px solid #2a3550;',
    'box-shadow:8px 0 28px -16px rgba(0,0,0,.7);transform:translateX(-100%);',
    'transition:transform .22s ease}',
    '.wrap.open .panel{transform:translateX(0)}',
    '.handle{position:absolute;top:50%;left:0;transform:translateY(-50%);',
    'writing-mode:vertical-rl;text-orientation:mixed;padding:14px 6px;border:0;cursor:pointer;',
    'background:#7ee2a8;color:#0d1018;font-size:12px;font-weight:700;letter-spacing:.08em;',
    'border-radius:0 8px 8px 0;box-shadow:2px 0 10px -4px rgba(0,0,0,.6);transition:left .22s ease}',
    '.wrap.open .handle{left:250px}',
    '.head{padding:14px 14px 10px;border-bottom:1px solid #222c40;display:flex;flex-direction:column;gap:2px}',
    '.head strong{font-size:13px;letter-spacing:.02em}',
    '.head em{font-style:normal;font-size:11px;color:#8b93a3;font-family:ui-monospace,Menlo,monospace}',
    '.list{flex:1;overflow:auto;padding:8px 8px 12px}',
    '.group{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#6b7280;',
    'padding:10px 8px 4px;font-family:ui-monospace,Menlo,monospace}',
    '.item{display:block;padding:7px 10px;border-radius:7px;color:#c9cdd6;text-decoration:none;',
    'font-size:13px;line-height:1.3;transition:background .15s,color .15s}',
    '.item:hover{background:#1b2233;color:#fff}',
    '.item.current{background:rgba(126,226,168,.14);color:#7ee2a8;font-weight:600}',
    '.foot{padding:10px 14px;border-top:1px solid #222c40}',
    '.foot a{color:#8b93a3;text-decoration:none;font-size:12px}',
    '.foot a:hover{color:#7ee2a8}',
  ].join('');
})();
