/* Based on Cafe3D by Prince Bhadania (Kami Labs, Compass Concept B, compass-scorecard-concept-b.vercel.app).
   Local change for Suhani's quiz: opts.order maps question i to a station, so pins number in our question order. */
/* Cafe3D: the cafeteria as a small, lit 3D scene (three.js r128, global THREE).
   Same room and nine stations as the quiz. Grid: x 0..12 along the back wall, y 0..9 towards the viewer,
   z up. In three.js: X = x, Y = z, Z = y.
   API: create(container, { colors: [9 pillar colours], walker: bool })
     .setLevel(i, L)  L = 0 hidden, 1 plain, 3 upgraded, 5 full
     .setLive(on)     the future-ready life: chefs, crowds, plants, steam
     .pin(i, state)   '', 'current', 'done', 'r1', 'r3', 'r5'
     .highlight(i)    glowing ring at station i (-1 for none)
     .setSign(text)   .view(i or -1, ms)   .goTo(i)   .resetWalk()
   Kiosk options (all off by default): zoom (0.5-1, closer overview), focus [x, y] (grid point the overview centres on),
   drift (slow camera pan on the overview), ambient (number of guests walking the aisles with trays), pixelRatio. */
(function () {
  const T = window.THREE;
  const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V = (x, y, z = 0) => new T.Vector3(x, z, y);
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  let REAL = false; // cinematic render mode (set per page)
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const back = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  /* ---------- materials ---------- */
  const mats = {};
  const M = (hex, o = {}) => {
    const k = hex + JSON.stringify(o);
    if (mats[k]) return mats[k];
    const p = Object.assign({ color: lin(hex), roughness: .78, metalness: 0 }, o);
    if (REAL) { if (p.metalness > .3) { p.metalness = Math.min(1, p.metalness + .3); p.roughness *= .6; } else if (p.roughness < .5) p.roughness *= .8; }
    return (mats[k] = new T.MeshStandardMaterial(p));
  };
  const STEEL = () => M('#BFC4C8', { roughness: .32, metalness: .55 });
  const STEEL_D = () => M('#8E959B', { roughness: .4, metalness: .5 });

  /* ---------- canvas textures ---------- */
  const texs = [];
  function canvasTex(w, h, draw, transparent) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    t.redraw = () => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; };
    t.redraw(); texs.push(t); t.transparentTex = transparent; return t;
  }
  const font = (w, px, fam) => `${w} ${px}px ${fam === 'hand' ? "'Caveat', cursive" : "'Brand Arial', Arial, Helvetica, sans-serif"}`;
  function speckle(g, w, h, n, col, rmax) { g.fillStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = Math.random() * .5; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * rmax, 0, 7); g.fill(); } g.globalAlpha = 1; }

  /* ---------- geometry helpers (grid coords) ---------- */
  function box(x, y, z, w, d, h, mat, shadow = true) {
    const small = Math.min(w, h, d);
    const geo = REAL && T.RoundedBoxGeometry && small > .05 ? new T.RoundedBoxGeometry(w, h, d, 3, Math.min(.035, small / 3)) : new T.BoxGeometry(w, h, d);
    const m = new T.Mesh(geo, mat);
    m.position.set(x + w / 2, z + h / 2, y + d / 2); m.castShadow = shadow; m.receiveShadow = true; return m;
  }
  function cyl(x, y, z, r, h, mat, r2 = r, seg = 24) {
    const m = new T.Mesh(new T.CylinderGeometry(r2, r, h, seg), mat);
    m.position.set(x, z + h / 2, y); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function sph(x, y, z, r, mat, sy = 1) {
    const m = new T.Mesh(new T.SphereGeometry(r, 20, 14), mat); m.scale.y = sy;
    m.position.set(x, z, y); m.castShadow = true; m.receiveShadow = true; return m;
  }
  // a textured panel facing the viewer (+Z, on the back wall side) or facing +X (on the left wall)
  function panel(x, y, z, w, h, tex, face = 'z', opts = {}) {
    const mat = new T.MeshStandardMaterial({ map: tex, transparent: !!tex.transparentTex, roughness: opts.rough ?? .85, metalness: 0, emissive: opts.glow ? lin('#ffffff') : lin('#000000'), emissiveMap: opts.glow ? tex : null, emissiveIntensity: opts.glow || 0 });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    if (face === 'z') m.position.set(x + w / 2, z + h / 2, y);
    else { m.rotation.y = Math.PI / 2; m.position.set(x, z + h / 2, y - w / 2); }
    m.receiveShadow = !tex.transparentTex; return m;
  }
  const group = (...kids) => { const g = new T.Group(); kids.forEach(k => k && g.add(k)); return g; };

  /* ---------- people ---------- */
  const SKIN = ['#C68B59', '#8D5524', '#E0AC69', '#A86B3C', '#F1C27D'];
  function person(x, y, o = {}) {
    const s = o.kid ? .74 : 1, g = new T.Group();
    const shirt = M(o.c || '#3F6E9A'), skin = M(SKIN[o.s || 0], { roughness: .6 }), pants = M(o.legs || '#34302C');
    const hip = o.seated ? .42 : .5;
    if (!o.seated) { g.add(box(-.11, -.06, 0, .09, .11, hip, pants)); g.add(box(.02, -.06, 0, .09, .11, hip, pants)); }
    const body = cyl(0, 0, hip, .16, .5, shirt, .13); g.add(body);
    if (o.apron) g.add(box(-.11, .12, hip + .05, .22, .02, .38, M('#FAF8F4')));
    g.add(sph(0, 0, hip + .62, .14, skin));
    if (o.hair !== false) g.add(sph(0, -.02, hip + .67, .145, M('#2A211B'), .7));
    if (o.toque) { g.add(cyl(0, 0, hip + .72, .12, .2, M('#FFFFFF', { roughness: .9 }), .15)); g.add(sph(0, 0, hip + .93, .15, M('#FFFFFF', { roughness: .9 }), .55)); }
    if (o.cap) g.add(cyl(0, 0, hip + .7, .15, .08, M(o.cap), .14));
    if (o.tray) g.add(box(-.18, .14, hip + .3, .36, .24, .03, M('#E9E5DD')));
    g.scale.setScalar(s); g.position.set(x, 0, y);
    g.rotation.y = o.face ?? 0; // 0 faces +Z (towards the viewer)
    g.userData.bob = Math.random() * 6.28; g.userData.base = 0;
    return g;
  }

  // Jojo, the Compass Group mascot: coral capsule body, cream face and belly, big eyes, little flippers,
  // white shoes and a glowing ring on top (from the client's character sheet)
  function lisaFigure(x, y) {
    const g = new T.Group();
    const red = M('#E2554C', { roughness: .62 }), cream = M('#F3E2CC', { roughness: .7 }), brow = M('#93392B', { roughness: .7 });
    const white = M('#FFFFFF', { roughness: .25 }), iris = M('#6B3E1E', { roughness: .3 }), pupil = M('#1E130D', { roughness: .15 }), shoe = M('#FAFAF7', { roughness: .6 });
    const ell = (px, py, pz, r, mat, sx, sy, sd) => { const m = sph(px, py, pz, r, mat); m.scale.set(sx, sy, sd); return m; };
    g.add(cyl(-.12, 0, .06, .1, .16, red), cyl(.12, 0, .06, .1, .16, red));                         // legs
    g.add(ell(-.12, .04, .05, .1, shoe, 1, .55, 1.35), ell(.12, .04, .05, .1, shoe, 1, .55, 1.35));  // shoes
    g.add(ell(0, 0, .26, .33, red, 1, .42, 1));                                                     // round bottom
    g.add(cyl(0, 0, .26, .33, .7, red, .31));                                                       // body
    g.add(sph(0, 0, .96, .31, red));                                                                // head
    g.add(ell(0, .24, .52, .22, cream, 1.05, 1.18, .5));                                           // belly
    g.add(ell(0, .2, .98, .2, cream, 1.3, .78, .55));                                              // face
    [-1, 1].forEach(sd => {
      const ex = sd * .085;
      g.add(ell(ex, .275, 1.0, .07, white, 1, 1.12, .6));                                           // eye white
      g.add(ell(ex, .305, .995, .052, iris, 1, 1.1, .5));                                           // iris
      g.add(ell(ex, .322, .995, .034, pupil, 1, 1.1, .5));                                          // pupil
      g.add(sph(ex - .016, .34, 1.02, .012, white));                                                // catch-light
      const b = box(ex - .055, .255, 1.085, .11, .04, .032, brow); b.rotation.z = sd * .32; g.add(b); // brow
      const f = ell(sd * .34, .02, .6, .1, red, .55, 1.45, .9); f.rotation.z = sd * .38; g.add(f);   // flipper
    });
    const smile = new T.Mesh(new T.TorusGeometry(.036, .009, 6, 14, Math.PI), M('#A33A2D', { roughness: .5 }));
    smile.rotation.z = Math.PI; smile.position.set(0, .925, .312); g.add(smile);                    // smile
    const ring = new T.Mesh(new T.TorusGeometry(.11, .014, 8, 32), new T.MeshBasicMaterial({ color: lin('#FFD66B') }));
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 1.265, 0); g.add(ring);                     // glowing ring
    g.scale.setScalar(.85); g.position.set(x, 0, y);
    return g;
  }

  /* ---------- the room ---------- */
  function room(T_) {
    const g = new T.Group();
    // floor with tiles and grout
    const tile = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#F2EEE7'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#EAE5DC'; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2);
      speckle(c, w, h, 260, '#DAD3C7', 1.4);
      c.strokeStyle = '#DED7CB'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    });
    tile.wrapS = tile.wrapT = T.RepeatWrapping; tile.repeat.set(6, 4.5);
    const floor = new T.Mesh(new T.BoxGeometry(12, .12, 9), REAL ? new T.MeshPhysicalMaterial({ map: tile, roughness: .3, metalness: 0, clearcoat: .7, clearcoatRoughness: .18 }) : new T.MeshStandardMaterial({ map: tile, roughness: .55, metalness: .05 }));
    floor.position.set(6, -.06, 4.5); floor.receiveShadow = true; g.add(floor);
    // walls
    g.add(box(-.3, -.3, 0, 12.3, .3, 5, M('#F6F3EE'), false));
    g.add(box(-.3, -.3, 0, .3, 9.3, 5, M('#EDE8E1'), false));
    // panelled wainscot, brass rail, skirting
    const wain = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#24406D'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { c.fillStyle = '#1A2F55'; c.fillRect(x, 0, 3, h); c.fillStyle = '#31507F'; c.fillRect(x + 3, 0, 2, h); } });
    wain.wrapS = T.RepeatWrapping; wain.repeat.set(3, 1);
    const wb = new T.MeshStandardMaterial({ map: wain, roughness: .8 });
    const w1 = new T.Mesh(new T.PlaneGeometry(12, 1.1), wb); w1.position.set(6, .55, .005); w1.receiveShadow = true; g.add(w1);
    const wain2 = wain.clone(); wain2.repeat.set(2.25, 1); wain2.needsUpdate = true;
    const w2 = new T.Mesh(new T.PlaneGeometry(9, 1.1), new T.MeshStandardMaterial({ map: wain2, roughness: .8, color: lin('#E4E8EF') })); w2.rotation.y = Math.PI / 2; w2.position.set(.005, .55, 4.5); w2.receiveShadow = true; g.add(w2);
    const brass = M('#FFC845', { roughness: .4, metalness: .1 });
    g.add(box(0, 0, 1.08, 12, .05, .06, brass)); g.add(box(0, 0, 1.08, .05, 9, .06, brass));
    g.add(box(0, 0, 0, 12, .06, .16, M('#1D355E'))); g.add(box(0, 0, 0, .06, 9, .16, M('#172C4F')));
    // window on the left wall, with daylight on the floor
    const sky = canvasTex(128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#BFD8E6'); gr.addColorStop(1, '#E8F1F4'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    g.add(panel(.02, 8.5, 1.4, 1.6, 2.4, sky, 'x', { glow: .6 }));
    const frame = M('#FBF8F3');
    g.add(box(0, 6.86, 1.36, .08, 1.68, .06, frame)); g.add(box(0, 6.86, 3.8, .08, 1.68, .06, frame));
    g.add(box(0, 6.86, 1.36, .08, .06, 2.5, frame)); g.add(box(0, 8.48, 1.36, .08, .06, 2.5, frame)); g.add(box(0, 7.67, 1.36, .08, .05, 2.5, frame)); g.add(box(0, 6.86, 3.05, .08, 1.68, .04, frame));
    g.add(box(0, 6.8, 1.3, .2, 1.8, .07, M('#F4EFE7')));
    const sunTex = canvasTex(256, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,244,214,.55)'); gr.addColorStop(1, 'rgba(255,244,214,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, true);
    const sun = new T.Mesh(new T.PlaneGeometry(2.6, 1.6), new T.MeshBasicMaterial({ map: sunTex, transparent: true, depthWrite: false }));
    sun.rotation.x = -Math.PI / 2; sun.position.set(1.3, .005, 7.7); g.add(sun);
    // name sign (updatable) and clock
    g.add(box(4.1, 0, 4.25, 3.6, .08, .58, M('#1D355E', { roughness: .5 })));
    T_.sign = canvasTex(1024, 160, (c, w, h) => { c.fillStyle = '#1D355E'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFFFFF'; c.font = font(800, 78, ''); c.textAlign = 'center'; c.textBaseline = 'middle'; const t = T_.signText || 'YOUR CAFETERIA'; c.letterSpacing = '10px'; let f = 78; while (c.measureText(t).width > w - 80 && f > 30) { f -= 4; c.font = font(800, f, ''); } c.fillText(t, w / 2, h / 2 + 4); });
    g.add(panel(4.15, .085, 4.3, 3.5, .5, T_.sign));
    const clockFace = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#FBF8F3'; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.lineWidth = 12; c.strokeStyle = '#26231F'; c.stroke(); c.fillStyle = '#26231F'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.fillRect(128 + Math.sin(a) * 92 - 4, 128 - Math.cos(a) * 92 - 4, 8, 8); } }, true);
    g.add(panel(7.82, .03, 4.2, .56, .56, clockFace));
    const handM = M('#26231F');
    T_.hourHand = new T.Mesh(new T.BoxGeometry(.03, .16, .01), handM); T_.hourHand.geometry.translate(0, .07, 0); T_.hourHand.position.set(8.1, 4.48, .05);
    T_.minHand = new T.Mesh(new T.BoxGeometry(.02, .23, .01), handM); T_.minHand.geometry.translate(0, .1, 0); T_.minHand.position.set(8.1, 4.48, .055);
    g.add(T_.hourHand, T_.minHand);
    // plants in two corners
    [[11.55, .55], [.5, .45]].forEach(([px, py]) => {
      g.add(cyl(px, py, 0, .26, .55, M('#FFC845', { roughness: .5 }), .32));
      const leaf = M('#5E7F45', { roughness: .9 }), leaf2 = M('#728F55', { roughness: .9 });
      [[0, 0, .95, .34], [.16, .1, 1.2, .26], [-.14, .08, 1.15, .24], [.04, -.12, 1.4, .22]].forEach(([a, b, c, r], n) => g.add(sph(px + a, py + b, c, r, n % 2 ? leaf2 : leaf)));
    });
    // Chartwells logo on the left wall
    g.add(panel(.016, 3.75, 3.55, 1.1, 1.09, wallLogo(), 'x'));
    // tables, benches, lamps; children (most only in the future-ready view)
    T_.crowd = new T.Group(); g.add(T_.crowd);
    const woodTop = M('#C99E6C', { roughness: .6 }), woodDark = M('#2A4675', { roughness: .6 });
    for (const ty of [3.7, 6.3]) {
      g.add(box(3.4, ty, .7, 3.2, .95, .07, woodTop));
      [[3.5, ty + .08], [6.42, ty + .08], [3.5, ty + .78], [6.42, ty + .78]].forEach(([lx, ly]) => g.add(box(lx, ly, 0, .08, .08, .7, woodDark)));
      g.add(box(3.4, ty - .55, .38, 3.2, .34, .06, woodDark)); g.add(box(3.5, ty - .45, 0, .08, .14, .38, woodDark)); g.add(box(6.42, ty - .45, 0, .08, .14, .38, woodDark));
      g.add(box(3.4, ty + 1.15, .38, 3.2, .34, .06, woodDark)); g.add(box(3.5, ty + 1.25, 0, .08, .14, .38, woodDark)); g.add(box(6.42, ty + 1.25, 0, .08, .14, .38, woodDark));
      [3.9, 4.9, 5.9].forEach((kx, n) => {
        const k = person(kx, ty - .38, { kid: true, seated: true, c: ['#3F97B5', '#EE7624', '#3CBFAE', '#F63440'][(n + (ty > 5 ? 1 : 0)) % 4], s: (n + Math.round(ty)) % 5 });
        k.position.y = .1; k.userData.base = .1;
        (n === 1 ? g : T_.crowd).add(k);
        const plate = group(cyl(kx, ty + .25, .77, .17, .02, M('#FFFFFF', { roughness: .3 })), sph(kx - .05, ty + .24, .8, .06, M('#D9822B'), .5), sph(kx + .06, ty + .28, .8, .05, M('#6E8B3D'), .5));
        T_.crowd.add(plate);
      });
      [4.4, 5.4].forEach((kx, n) => { const k = person(kx, ty + 1.32, { kid: true, seated: true, face: Math.PI, c: ['#E06A1B', '#2D6E8E'][n], s: (n + 2) % 5 }); k.position.y = .1; k.userData.base = .1; T_.crowd.add(k); });
    }
    T_.crowd.visible = false;
    // pendant lamps with a warm pool of light on each table
    const shade = M('#1D355E', { roughness: .45, metalness: .2 });
    const poolTex = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,.55)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, true);
    T_.lamps = new T.Group(); g.add(T_.lamps);
    for (const [lx, ly] of [[5.0, 4.17], [5.0, 6.77]]) {
      T_.lamps.add(cyl(lx, ly, 3.0, .012, 2.0, M('#26231F')));
      T_.lamps.add(cyl(lx, ly, 2.78, .3, .26, shade, .07));
      const bulb = sph(lx, ly, 2.8, .09, new T.MeshStandardMaterial({ color: lin('#FFE7B8'), emissive: lin('#FFD27A'), emissiveIntensity: 1.6 })); bulb.castShadow = false; T_.lamps.add(bulb);
      const pool = new T.Mesh(new T.PlaneGeometry(2.4, 1.6), new T.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(lx, .78, ly); T_.lamps.add(pool);
    }
    return g;
  }

  /* ---------- board textures ---------- */
  function chalk(c, w, h) { c.fillStyle = '#26332B'; c.fillRect(0, 0, w, h); speckle(c, w, h, 900, '#FFFFFF', 1.6); c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(0, 0, w, h); }
  const menuBase = () => canvasTex(512, 480, (c, w, h) => {
    chalk(c, w, h);
    c.fillStyle = '#F2EEE4'; c.font = font(800, 26, ''); c.fillText('TODAY  ·  MONDAY', 34, 54);
    c.strokeStyle = 'rgba(242,238,228,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(34, 72); c.lineTo(w - 34, 72); c.stroke();
    c.font = font(700, 44, 'hand'); ['Dal tadka', 'Jeera rice', 'Aloo gobi', 'Phulka', 'Curd'].forEach((t, n) => { c.fillStyle = n % 2 ? '#F2EEE4' : '#F7E7B8'; c.fillText(t, 34, 128 + n * 62); });
  });
  const menuPie = () => canvasTex(256, 256, (c) => {
    const cols = ['#9DBF6B', '#E07B5A', '#F2EEE4', '#E9C46A']; let a = -1.57;
    [.32, .22, .2, .26].forEach((f, n) => { c.fillStyle = cols[n]; c.beginPath(); c.moveTo(128, 104); c.arc(128, 104, 84, a, a + f * 6.283); c.fill(); a += f * 6.283; });
    c.fillStyle = '#F2EEE4'; c.font = font(800, 24, ''); c.textAlign = 'center'; c.fillText('FOOD GROUPS', 128, 232);
  }, true);
  const menuTargets = () => canvasTex(256, 200, (c) => {
    c.fillStyle = '#F2EEE4'; c.font = font(800, 20, ''); c.fillText('TARGETS BY AGE', 16, 30);
    [['6-10', .55], ['11-14', .75], ['15-18', .95]].forEach(([t, f], n) => { c.fillStyle = ['#E9C46A', '#9DBF6B', '#E07B5A'][n]; c.fillRect(90, 52 + n * 46, 150 * f, 26); c.fillStyle = '#F2EEE4'; c.font = font(700, 22, ''); c.fillText(t, 16, 72 + n * 46); });
  }, true);
  const cork = () => canvasTex(512, 400, (c, w, h) => {
    c.fillStyle = '#B88D5E'; c.fillRect(0, 0, w, h); speckle(c, w, h, 2400, '#8C6440', 2.2); speckle(c, w, h, 800, '#D7B184', 1.6);
    sheet(c, 40, 50, 150, 200, -.04, 'WEEKLY MENU', '#C8553D', g => { g.strokeStyle = '#BDB4A6'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(16, 60 + i * 22); g.lineTo(i % 2 ? 100 : 124, 60 + i * 22); g.stroke(); } });
  });
  function sheet(c, x, y, w, h, rot, title, pin, body) {
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 10; c.shadowOffsetY = 4; c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h); c.shadowColor = 'transparent';
    c.fillStyle = '#2B2723'; c.font = font(800, 15, ''); c.fillText(title, 14, 32); body(c);
    c.fillStyle = pin; c.beginPath(); c.arc(w / 2, 10, 9, 0, 7); c.fill(); c.restore();
  }
  const noticeSheet2 = () => canvasTex(200, 240, (c) => sheet(c, 14, 14, 160, 200, .03, 'NUTRIENTS', '#3F6E9A', g => { [[60, 70], [92, 104], [124, 86]].forEach(([x, hh]) => { g.fillStyle = '#6E8B3D'; g.fillRect(x - 20, 170 - hh, 22, hh); }); g.fillStyle = '#999'; g.fillRect(16, 172, 128, 2); }), true);
  const noticeSheet3 = () => canvasTex(200, 280, (c) => {
    sheet(c, 14, 14, 160, 200, -.02, 'BENCHMARKS', '#3CBFAE', g => { g.strokeStyle = '#BDB4A6'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(14, 60 + i * 26); g.lineTo(146, 60 + i * 26); g.stroke(); } g.beginPath(); g.moveTo(84, 48); g.lineTo(84, 170); g.stroke(); });
    c.fillStyle = '#8E2C48'; c.beginPath(); c.moveTo(120, 230); c.lineTo(108, 272); c.lineTo(126, 262); c.lineTo(134, 276); c.lineTo(140, 236); c.fill();
    c.fillStyle = '#C9A84E'; c.beginPath(); c.arc(130, 222, 30, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.moveTo(116, 222); c.lineTo(126, 232); c.lineTo(146, 210); c.stroke();
  }, true);
  const label = (txt, bg, fg, w = 256, h = 96, size = 30) => canvasTex(w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = font(800, size, ''); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, h / 2 + 2); });
  const heroSign = () => canvasTex(256, 150, (c, w, h) => { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2B2723'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = '#2B2723'; c.font = font(800, 24, ''); c.fillText("TODAY'S HERO", 22, 50); c.fillStyle = '#4C7A3A'; c.font = font(700, 44, 'hand'); c.fillText('Millet khichdi', 22, 112); });
  const allergenCard = () => canvasTex(256, 180, (c, w, h) => {
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2B2723'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#2B2723'; c.font = font(800, 26, ''); c.fillText('ALLERGENS', 22, 46);
    [['N', '#C8553D', 'Nuts'], ['M', '#3F6E9A', 'Milk'], ['G', '#B3985A', 'Gluten']].forEach(([l, col, t], n) => { c.fillStyle = col; c.beginPath(); c.arc(42 + n * 76, 104, 24, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = font(800, 24, ''); c.textAlign = 'center'; c.fillText(l, 42 + n * 76, 113); c.fillStyle = '#2B2723'; c.font = font(600, 18, ''); c.fillText(t, 42 + n * 76, 156); c.textAlign = 'left'; });
  });
  const stickies = () => canvasTex(400, 300, (c, w, h) => { c.fillStyle = '#FCFCFA'; c.fillRect(0, 0, w, h); c.strokeStyle = '#C9CED2'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); [[40, 40, '#F6D365'], [150, 56, '#A8D5BA'], [262, 36, '#F4A6A6'], [70, 160, '#A8C6E8'], [190, 170, '#F6D365'], [290, 150, '#A8D5BA']].forEach(([x, y, col], n) => { c.save(); c.translate(x + 40, y + 40); c.rotate((n % 3 - 1) * .06); c.fillStyle = col; c.fillRect(-40, -40, 80, 80); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-28, -10, 50, 4); c.fillRect(-28, 4, 36, 4); c.restore(); }); });
  const perfChart = () => canvasTex(640, 240, (c, w, h) => { c.fillStyle = '#F7F5F0'; c.fillRect(0, 0, w, h); c.fillStyle = '#2B2723'; c.font = font(800, 26, ''); c.fillText('MENU PERFORMANCE', 30, 48); c.strokeStyle = '#D9D4CA'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(30, 90 + i * 36); c.lineTo(w - 30, 90 + i * 36); c.stroke(); } c.strokeStyle = '#EE7624'; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath(); [[30, 196], [140, 180], [240, 184], [340, 140], [440, 120], [540, 92], [610, 84]].forEach(([x, y], n) => n ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.fillStyle = '#2F7A55'; c.font = font(800, 28, ''); c.fillText('▲ 18%', w - 150, 48); }, false);
  const screenMenu = () => canvasTex(256, 180, (c, w, h) => { c.fillStyle = '#F5F2EC'; c.fillRect(0, 0, w, h); c.fillStyle = '#2B2723'; c.font = font(800, 26, ''); c.fillText('TODAY', 20, 42); c.fillStyle = '#BDB4A6'; [70, 100, 130].forEach((y, n) => c.fillRect(20, y, n === 1 ? 110 : 150, 12)); });
  const screenFood = () => canvasTex(256, 180, (c) => { c.fillStyle = '#D9822B'; c.beginPath(); c.arc(200, 108, 36, 0, 7); c.fill(); c.fillStyle = '#6E8B3D'; c.beginPath(); c.arc(200, 108, 16, 0, 7); c.fill(); }, true);
  const wasteSign = () => canvasTex(256, 190, (c, w, h) => { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2B2723'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = '#2B2723'; c.font = font(800, 22, ''); c.fillText('WASTE  ▼ 30% THIS TERM', 16, 44); [[30, 100], [80, 76], [130, 54], [180, 34]].forEach(([x, hh]) => { c.fillStyle = '#6E8B3D'; c.fillRect(x, 170 - hh, 34, hh); }); });
  const tiles = () => canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#E6EEF0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#C9D7DB'; c.lineWidth = 3; for (let x = 0; x <= w; x += 42) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  const checklist = () => canvasTex(160, 220, (c, w, h) => { c.fillStyle = '#7B5436'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFFFFF'; c.fillRect(14, 22, w - 28, h - 36); c.fillStyle = '#2B2723'; c.font = font(800, 16, ''); c.fillText('DAILY CHECK', 24, 48); c.strokeStyle = '#4C7A3A'; c.lineWidth = 5; for (let i = 0; i < 4; i++) { const y = 82 + i * 32; c.beginPath(); c.moveTo(26, y); c.lineTo(34, y + 8); c.lineTo(48, y - 8); c.stroke(); c.fillStyle = '#BDB4A6'; c.fillRect(60, y - 2, 64, 6); } });
  const certificate = () => canvasTex(256, 190, (c, w, h) => { c.fillStyle = '#B3985A'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFFDF7'; c.fillRect(12, 12, w - 24, h - 24); c.fillStyle = '#2B2723'; c.font = font(800, 26, ''); c.textAlign = 'center'; c.fillText('CERTIFIED', w / 2, 62); c.fillStyle = '#BDB4A6'; c.fillRect(60, 86, 136, 8); c.fillRect(80, 106, 96, 8); c.fillStyle = '#C8553D'; c.beginPath(); c.arc(w / 2, 148, 18, 0, 7); c.fill(); });

  const NAVY = '#1D355E';
  const logoImg = new Image(); const logoTexs = [];
  // official Chartwells India logos: K12 for schools, Higher Education for university roles
  const LOGOS = { k12: 'img/chartwells-k12-1.svg', uni: 'img/chartwells-he-1.svg' };
  logoImg.onload = () => logoTexs.forEach(t => t.redraw()); logoImg.src = LOGOS.k12;
  const setLogo = v => { const src = LOGOS[v] || LOGOS.k12; if (!logoImg.src.endsWith(src)) logoImg.src = src; };
  function wallLogo() { const t = canvasTex(512, 506, (c, w, h) => { if (!(logoImg.complete && logoImg.naturalWidth)) return; c.clearRect(0, 0, w, h); const k = Math.min(w / logoImg.naturalWidth, h / logoImg.naturalHeight), dw = logoImg.naturalWidth * k, dh = logoImg.naturalHeight * k; c.drawImage(logoImg, (w - dw) / 2, (h - dh) / 2, dw, dh); }, true); logoTexs.push(t); return t; }
  const chalkMenu = (title, items, cols) => canvasTex(512, 480, (c, w, h) => {
    chalk(c, w, h);
    c.fillStyle = '#F2EEE4'; c.font = font(800, 26, ''); c.fillText(title, 34, 54);
    c.strokeStyle = 'rgba(242,238,228,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(34, 72); c.lineTo(w - 34, 72); c.stroke();
    c.font = font(700, 44, 'hand'); items.forEach((t, n) => { c.fillStyle = cols[n % cols.length]; c.fillText(t, 34, 128 + n * 62); });
  });
  const card = (title, lines, o = {}) => canvasTex(o.w || 256, o.h || 190, (c, w, h) => {
    c.fillStyle = o.bg || '#FFFFFF'; c.fillRect(0, 0, w, h); c.strokeStyle = o.edge || NAVY; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = o.fg || NAVY; c.font = font(800, o.ts || 24, ''); c.fillText(title, 20, 44);
    c.font = font(700, o.ls || 21, ''); lines.forEach((t, n) => { c.fillStyle = o.lc ? o.lc[n % o.lc.length] : '#2B2723'; c.fillText(t, 20, 84 + n * (o.lh || 30)); });
  });
  const pole = (x, y, hgt) => cyl(x, y, 0, .03, hgt, STEEL_D());

  /* ---------- the nine stations ---------- */
  function stations() {
    const steel = STEEL(), woodL = M('#C99E6C', { roughness: .6 }), woodD = M('#7B5436', { roughness: .7 }), dark = M('#2A2724', { roughness: .45 }), white = M('#FFFFFF', { roughness: .35 });
    const bowl = (x, y, z, col) => group(cyl(x, y, z, .13, .07, white, .17), cyl(x, y, z + .06, .13, .015, M(col, { roughness: .9 })));
    const Z = [];
    // 1 menu board
    Z.push({
      stand: [[2.4, 1.6]],
      base: () => group(box(.9, 0, 1.5, 3.1, .1, 2.9, M('#6A4A31', { roughness: .6 })), panel(1.0, .105, 1.6, 2.9, 2.7, chalkMenu('TODAY  ·  MONDAY', [], ['#F2EEE4'])), box(.95, .1, 1.5, 3.0, .14, .05, M('#6A4A31'))),
      l1: () => group(panel(1.0, .107, 1.6, 2.9, 2.7, chalkMenu('TODAY  ·  MONDAY', ['Chole bhature', 'Veg noodles', 'Samosa', 'Cola', 'Ice cream'], ['#F7B27A', '#F2EEE4']))),
      l3: () => group(panel(1.0, .108, 1.6, 2.9, 2.7, chalkMenu('TODAY  ·  MONDAY', ['Dal tadka', 'Jeera rice', 'Aloo gobi', 'Phulka', 'Curd'], ['#F7E7B8', '#F2EEE4'])), panel(2.95, .11, 3.0, 1.05, 1.05, menuPie())),
      l5: () => group(panel(2.8, .112, 1.7, 1.15, .95, menuTargets()), panel(.98, .114, 4.42, 1.6, .38, label('NUTRITIONIST APPROVED', '#3CBFAE', '#FFFFFF', 512, 120, 40))),
      fx: () => group(person(2.3, 1.05, { toque: true, apron: true, c: '#F2F0EB', s: 2 }), box(2.75, .5, 0, .55, .45, .9, woodD), box(2.7, .45, .9, .65, .55, .05, M('#FBF8F3')), cyl(3.02, .72, .95, .1, .14, steel))
    });
    // 2 notice board
    Z.push({
      stand: [[5.9, 1.6]],
      base: () => group(box(4.5, 0, 1.7, 2.9, .08, 2.3, M('#6A4A31')), panel(4.6, .085, 1.8, 2.7, 2.1, cork())),
      l3: () => group(panel(5.4, .09, 2.35, 1.0, 1.2, noticeSheet2())),
      l5: () => group(panel(6.25, .094, 1.9, 1.0, 1.4, noticeSheet3())),
      fx: () => group(box(5.3, .75, 0, 1.0, .25, .05, dark), box(5.75, .8, 0, .1, .1, 1.0, STEEL_D()), box(5.25, .7, 1.0, 1.1, .12, .75, dark), panel(5.3, .825, 1.05, 1.0, .65, label('NUTRIENTS', '#F5F2EC', '#2B2723', 256, 170, 30), 'z', { glow: .25 }),
        person(6.45, 1.5, { c: '#7A3B2E', s: 1 }), person(6.9, 1.95, { kid: true, c: '#E0A93B', s: 3 }))
    });
    // 3 salad bar
    Z.push({
      stand: [[8.8, 1.6], [8.8, 3.2]],
      base: () => group(box(7.35, 2.0, 0, 1.1, 2.5, .82, steel), box(7.3, 1.95, .82, 1.2, 2.6, .05, M('#ECEAE5', { roughness: .3 }))),
      l3: () => group(...[[2.35, '#6E8B3D'], [2.95, '#C8553D'], [3.55, '#E9C46A'], [4.15, '#D9822B']].map(([y, col]) => bowl(7.9, y, .87, col)),
        box(7.4, 2.05, 1.3, 1.0, 2.4, .03, new T.MeshStandardMaterial({ color: lin('#DDEFF5'), transparent: true, opacity: .35, roughness: .05, metalness: .1 })), box(7.42, 2.05, .87, .04, .04, .45, STEEL_D()), box(7.42, 4.4, .87, .04, .04, .45, STEEL_D())),
      l1: () => group(box(7.5, 2.2, .87, .8, 1.1, .04, STEEL_D()), ...[[7.7, 2.4], [7.95, 2.45], [8.1, 2.75], [7.75, 2.8], [7.95, 3.05]].map(([x, y]) => cyl(x, y, .91, .12, .16, M('#D9A441', { roughness: .7 }), .02)),
        ...[3.6, 3.85, 4.1, 4.35].map(y => cyl(7.95, y, .87, .07, .24, M('#C8102E', { roughness: .4 }))), cyl(7.95, 4.7, 0, .03, 1.5, STEEL_D()), panel(7.55, 4.73, 1.45, .8, .48, card('SNACKS', ['Samosa  ₹20', 'Cola  ₹30'], { h: 150, edge: '#C8102E', fg: '#C8102E' }))),
      l5: () => group(cyl(7.95, 4.7, 0, .03, 1.5, STEEL_D()), panel(7.5, 4.73, 1.45, .9, .7, card('FRESH & WHOLE', ['No fried food', 'Water by default', 'Fruit every meal'], { lc: ['#2F7A55'] })),
        cyl(7.85, 4.75, .87, .16, .55, M('#BFE3F2', { transparent: true, opacity: .75, roughness: .1 })), cyl(7.85, 4.75, 1.42, .06, .06, M('#3F97B5')),
        cyl(7.95, 1.75, .87, .28, .1, M('#C99E6C', { roughness: .7 }), .2), ...[['#EE7624', -.1, 0], ['#F63440', .1, .05], ['#9DBF6B', 0, -.12], ['#FFC845', .05, .14]].map(([col, dx, dy]) => sph(7.95 + dx, 1.75 + dy, 1.02, .08, M(col, { roughness: .5 })))),
      fx: () => group(person(8.85, 2.7, { kid: true, c: '#3F6E9A', s: 4, tray: true, face: -Math.PI / 2 }), person(8.9, 3.75, { kid: true, c: '#8E2C48', s: 1, tray: true, face: -Math.PI / 2 }))
    });
    // 4 kitchen
    Z.push({
      stand: [[2.2, 1.6], [2.2, 3.4]],
      base: () => group(box(0, 1, 0, 1.3, 4.3, 1.15, steel), box(0, 1, 1.15, 1.3, 4.3, .05, M('#D9DCDF', { roughness: .25, metalness: .4 })), box(.2, 1.35, 1.2, .9, .9, .04, dark), cyl(.65, 1.8, 1.24, .26, .36, STEEL_D(), .24)),
      l1: () => group(cyl(1.75, 2.4, .005, .45, .012, M('#8A6A3F', { roughness: .3 }), .45), cyl(1.6, 3.6, .005, .3, .012, M('#8A6A3F', { roughness: .3 }), .3),
        cyl(1.65, 5.0, 0, .2, .55, M('#7D8186')), ...[[1.6, 4.95], [1.72, 5.05], [1.66, 4.9]].map(([x, y]) => sph(x, y, .62, .1, M('#9C8456', { roughness: .9 })))),
      l3: () => group(panel(.012, 6.4, 1.9, .85, 1.15, checklist(), 'x')),
      l5: () => group(panel(.014, 5.1, 2.7, 1.25, .92, certificate(), 'x'), panel(.016, 3.75, 2.25, 1.1, .7, card('AUDIT  ✓', ['Passed: Nov 2026', 'Actions closed: 12/12'], { h: 150, edge: '#2F7A55', fg: '#2F7A55' }), 'x')),
      fx: () => {
        const t = tiles(); t.wrapS = T.RepeatWrapping; t.repeat.set(2, 1);
        const fire = sph(.65, 1.8, 1.24, .2, new T.MeshStandardMaterial({ color: lin('#FF9B3D'), emissive: lin('#FF7A1A'), emissiveIntensity: 1.4 }), .2); fire.castShadow = false;
        return group(panel(.01, 5.3, 1.2, 4.25, .9, t, 'x'),
          box(0, 1.2, 2.75, 1.05, 1.5, .5, M('#AEB4B9', { roughness: .3, metalness: .6 })), box(0, 1.6, 3.25, .45, .7, 1.75, M('#A3A9AE', { roughness: .3, metalness: .6 })),
          ...[[2.8, '#E0A93B'], [3.55, '#6E8B3D'], [4.3, '#C8553D']].map(([yy, col]) => group(box(.25, yy, 1.2, .8, .6, .1, STEEL_D()), box(.3, yy + .05, 1.28, .7, .5, .03, M(col, { roughness: .9 })))),
          box(0, 5.5, 0, .95, .95, 2.0, M('#F1F0EC', { roughness: .3, metalness: .2 })), box(.94, 5.6, 1.1, .03, .05, .5, STEEL_D()),
          person(1.75, 3.0, { apron: true, c: '#F2F0EB', cap: '#26231F', s: 4, face: -Math.PI / 2 }), person(1.8, 4.4, { apron: true, c: '#F2F0EB', cap: '#26231F', s: 0, face: -Math.PI / 2 }), fire);
      },
      steam: [.65, 1.8, 1.65]
    });
    // 5 allergy station
    Z.push({
      stand: [[2.9, 1.6], [2.9, 6.9]],
      base: () => group(box(.45, 7.45, 0, 2.1, .95, .8, woodL), box(.4, 7.4, .8, 2.2, 1.05, .05, M('#E9E4DA', { roughness: .4 })), ...[[.85, '#D9822B'], [1.5, '#E9C46A'], [2.15, '#6E8B3D']].map(([x, col]) => bowl(x, 7.92, .85, col))),
      l3: () => group(cyl(2.8, 7.66, 0, .03, 1.45, STEEL_D()), panel(2.42, 7.7, 1.35, .82, .58, allergenCard())),
      l5: () => group(...[[.85, '#C8553D'], [1.5, '#3F6E9A'], [2.15, '#2F7A55']].map(([x, col]) => group(cyl(x + .14, 7.92, .85, .008, .32, M('#555555')), box(x + .14, 7.91, 1.08, .16, .01, .1, M(col)))),
        box(2.75, 7.55, 0, .75, .8, .8, M('#7A4FA0', { roughness: .5 })), box(2.7, 7.5, .8, .85, .9, .05, M('#F4EEF8', { roughness: .4 })), cyl(3.12, 7.95, .85, .16, .12, M('#B9A3D3', { roughness: .3 }), .14),
        pole(3.55, 7.6, 1.55), panel(3.15, 7.63, 1.45, .85, .55, card('ALLERGY-SAFE', ['Separate prep', 'Checked at serving'], { h: 150, edge: '#7A4FA0', fg: '#7A4FA0' }))),
      fx: () => group(person(1.2, 8.85, { kid: true, c: '#3F6E9A', s: 2, tray: true, face: Math.PI }))
    });
    // 6 review wall
    Z.push({
      stand: [[10, 1.6]],
      base: () => group(box(8.55, 0, 1.45, .85, .45, .62, woodD), panel(8.6, .455, 1.52, .75, .25, label('FEEDBACK', '#1D355E', '#FFFFFF', 256, 86, 34)), box(8.8, .3, 2.06, .35, .1, .02, dark)),
      l1: () => group(...[[8.75, .6], [8.95, .75], [9.15, .62], [8.85, .9], [9.05, .95]].map(([x, y]) => sph(x, y, .07, .09, M('#F4F1EA', { roughness: 1 }), .8)), panel(9.6, .02, 2.2, 1.2, .55, label('COMPLAINTS', '#C8102E', '#FFFFFF', 256, 110, 34))),
      l3: () => group(box(9.6, 0, 2.0, 1.75, .05, 1.35, M('#E9ECEE', { roughness: .3 })), panel(9.62, .055, 2.02, 1.71, 1.31, stickies())),
      l5: () => group(box(8.45, 0, 3.55, 3.1, .08, 1.2, dark), panel(8.52, .085, 3.62, 2.96, 1.06, perfChart(), 'z', { glow: .35 })),
      fx: () => group(box(9.1, .85, .7, 1.6, .8, .06, M('#B98A5B')), box(9.2, .95, 0, .08, .08, .7, woodD), box(10.52, 1.47, 0, .08, .08, .7, woodD), box(9.2, 1.47, 0, .08, .08, .7, woodD), box(10.52, .95, 0, .08, .08, .7, woodD),
        person(9.4, 1.95, { c: '#3F6E9A', s: 2, face: Math.PI }), person(10.5, 1.95, { c: '#7A3B2E', s: 1, face: Math.PI }))
    });
    // 7 cooking corner
    Z.push({
      stand: [[8.8, 1.6], [8.8, 5.7]],
      base: () => group(box(7.75, 6.45, .76, 2.8, 1.35, .08, M('#C39467', { roughness: .55 })), ...[[7.85, 6.55], [10.37, 6.55], [7.85, 7.62], [10.37, 7.62]].map(([x, y]) => box(x, y, 0, .08, .08, .76, woodD))),
      l1: () => group(pole(11.0, 6.3, 1.6), panel(10.55, 6.33, 1.5, .9, .62, card('EAT HEALTHY!', ['Fruit is good for you'], { h: 150, edge: '#EE7624', fg: '#EE7624' }))),
      l3: () => group(...[[8.2, 6.8, '#C8553D'], [8.5, 7.3, '#D9822B'], [9.1, 6.9, '#6E8B3D'], [9.6, 7.4, '#E9C46A'], [10, 6.85, '#C8553D']].map(([x, y, col]) => sph(x, y, .93, .1, M(col, { roughness: .5 }))),
        pole(11.0, 6.3, 1.6), panel(10.5, 6.33, 1.5, 1.0, .62, card('HEALTH WEEK', ['Talks  ·  Workshops'], { h: 150, edge: '#3F97B5', fg: '#3F97B5' }))),
      l5: () => group(...[[8.0, 6.65], [9.0, 6.65], [9.0, 7.35], [8.0, 7.35]].map(([x, y]) => box(x, y, .84, .7, .45, .04, M('#E2C9A3'))),
        cyl(8.0, 7.1, 2.2, .006, .5, M('#555555')), cyl(10.2, 7.1, 2.2, .006, .5, M('#555555')), panel(7.9, 7.12, 1.75, 2.4, .5, label('TEACHING KITCHEN', '#3CBFAE', '#FFFFFF', 640, 130, 52))),
      fx: () => group(person(10.85, 6.9, { toque: true, apron: true, c: '#F2F0EB', s: 2, face: -Math.PI / 2 }), person(10.75, 7.3, { kid: true, c: '#6E8B3D', s: 4, apron: true, face: -Math.PI / 2 }), person(7.6, 8.4, { kid: true, c: '#E0A93B', s: 0, apron: true, face: Math.PI * .8 }),
        person(8.5, 8.3, { kid: true, c: '#3F6E9A', s: 1, face: Math.PI }), person(9.5, 8.35, { kid: true, c: '#8E2C48', s: 3, face: Math.PI }),
        box(7.2, 5.35, 0, 1.3, .45, .5, woodD), ...[7.45, 7.75, 8.05, 8.3].map((x, n) => sph(x, 5.57, .62, .15, M(n % 2 ? '#5E7F45' : '#728F55', { roughness: .9 }), 1.3)))
    });
    // 8 family corner (our Q9: communication & feedback)
    Z.push({
      minW: 4.6,
      stand: [[8.8, 1.6], [8.8, 5.2], [11.65, 5.2], [11.65, 8.25]],
      base: () => group(box(10.85, 7.72, 0, .08, .08, 2.6, STEEL_D()), box(10.85, 8.88, 0, .08, .08, 2.6, STEEL_D()),
        box(10.8, 7.7, 1.05, .12, 1.3, .8, dark), panel(10.925, 8.93, 1.1, 1.2, .7, screenMenu(), 'x', { glow: .3 }),
        box(10.8, 7.7, 2.32, .12, 1.3, .32, M('#1D355E')), panel(10.925, 8.93, 2.34, 1.2, .28, label('FAMILY CORNER', '#1D355E', '#FFFFFF', 640, 150, 64), 'x')),
      l1: () => group(box(10.83, 7.78, .3, .06, 1.05, .55, M('#F4F1EA')), panel(10.865, 8.83, .32, 1.05, .5, card('MENU ONLY', ['No way to give', 'feedback'], { h: 150, edge: '#C8102E', fg: '#C8102E' }), 'x')),
      l3: () => group(panel(10.93, 8.93, 1.1, 1.2, .7, screenFood(), 'x'),
        box(11.15, 7.25, 0, .38, .38, .95, M('#3F97B5', { roughness: .5 })), panel(11.535, 7.63, .55, .38, .22, label('SURVEY', '#FFFFFF', '#1D355E', 256, 110, 46), 'x')),
      l5: () => group(box(10.8, 7.7, .2, .12, 1.3, .8, M('#FFFFFF', { roughness: .4 })), panel(10.925, 8.93, .22, 1.2, .76, card('YOU SAID  ·  WE DID', ['More fruit  →  added', 'Less oily  →  done', 'Water refills  →  new'], { w: 320, h: 210, lc: ['#2F7A55'] }), 'x')),
      fx: () => group(person(11.55, 8.55, { c: '#5B4B8A', s: 3, face: -Math.PI / 2 }), person(11.6, 8.05, { kid: true, c: '#EE7624', s: 0, face: -Math.PI / 2 }))
    });
    // 9 waste station (our Q8: sustainability)
    Z.push({
      minW: 4.8,
      stand: [[8.8, 1.6], [8.8, 4.95], [10.1, 4.95]],
      base: () => group(box(9.2, 3.25, 0, .62, .62, .88, M('#7D8186', { roughness: .5 })), box(9.16, 3.21, .88, .7, .7, .06, M('#6A6E73')),
        panel(9.26, 3.875, .4, .5, .24, label('WASTE', '#5E6166', '#FFFFFF', 256, 120, 48))),
      l1: () => group(...[[9.4, 3.45, .98], [9.6, 3.5, 1.0], [9.5, 3.65, 1.05], [9.35, 3.7, .97], [9.62, 3.72, .95], [9.45, 3.55, 1.12]].map(([x, y, z], n) => sph(x, y, z, .15, M(['#9C8456', '#C8553D', '#E9C46A'][n % 3], { roughness: .9 }), .8)),
        ...[[9.0, 3.98], [9.95, 3.75], [9.7, 4.1], [8.9, 3.6]].map(([x, y], n) => sph(x, y, .05, .11, M(['#9C8456', '#C8553D'][n % 2], { roughness: .9 }), .5))),
      l3: () => group(box(9.95, 3.25, 0, .62, .62, .88, M('#5E8A3E', { roughness: .5 })), box(9.91, 3.21, .88, .7, .7, .06, M('#4E7433')), panel(10.01, 3.875, .4, .5, .24, label('FOOD', '#4E7433', '#FFFFFF', 256, 120, 52)),
        box(10.7, 3.25, 0, .62, .62, .88, M('#3F6E9A', { roughness: .5 })), box(10.66, 3.21, .88, .7, .7, .06, M('#345B80')), panel(10.76, 3.875, .4, .5, .24, label('RECYCLE', '#345B80', '#FFFFFF', 256, 120, 40))),
      l5: () => group(cyl(9.45, 4.3, 0, .03, 1.5, STEEL_D()), panel(9.0, 4.33, 1.25, .95, .72, wasteSign()),
        box(8.55, 3.35, 0, .45, .45, .25, M('#D9DCDF', { roughness: .3, metalness: .4 })), panel(8.6, 3.81, .14, .35, .1, label('12.4 kg', '#1D355E', '#7CE0A0', 256, 72, 40), 'z', { glow: .4 }),
        box(11.4, 3.1, 0, .55, 1.25, .5, M('#7B5436')), ...[3.35, 3.7, 4.05].map(y => sph(11.67, y, .6, .14, M('#5E7F45', { roughness: .9 }), 1.2)), panel(11.45, 4.355, .1, .45, .3, label('COMPOST', '#7B5436', '#FFFFFF', 256, 120, 44))),
      fx: () => group(person(10.3, 4.95, { kid: true, c: '#3CBFAE', s: 2, face: -Math.PI * .75 }))
    });
    return Z;
  }

  /* ---------- the walker ---------- */
  const ENTRY = [[7.0, 9.6], [7.0, 1.6]];

  function create(el, opts = {}) {
    const T_ = {};
    REAL = opts.mode === 'real' && !!T.EffectComposer;
    el.classList.add('cafe3d');
    if (REAL) el.classList.add('cinematic');
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(opts.pixelRatio || Math.min(REAL ? 1.5 : 2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const overlay = document.createElement('div'); overlay.className = 'c3-overlay'; el.appendChild(overlay);

    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(lin('#FFF8EE'), lin('#A8906E'), REAL ? .12 : .62));
    const sunL = new T.DirectionalLight(lin('#FFF1DC'), REAL ? 2.3 : 1.05);
    if (REAL) {
      // studio reflections for steel, glass and the glossy floor
      if (T.RoomEnvironment) { const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), .04).texture; }
      scene.background = lin('#F3EEE7');
    }
    sunL.position.set(-4, 14, 4); sunL.target.position.set(6, 0, 4.5); sunL.castShadow = true;
    sunL.shadow.mapSize.set(2048, 2048); Object.assign(sunL.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 }); sunL.shadow.bias = -.0006; sunL.shadow.radius = 4;
    scene.add(sunL, sunL.target);
    const fill = new T.DirectionalLight(lin('#E8EEF5'), REAL ? .18 : .32); fill.position.set(18, 8, 14); scene.add(fill);
    scene.add(room(T_));
    if (REAL) [[5.0, 4.17], [5.0, 6.77]].forEach(([x, y]) => { const l = new T.PointLight(lin('#FFC98A'), .9, 4.5, 2); l.position.set(x, 2.7, y); T_.lamps.add(l); });

    // stations
    const colors = opts.colors || [];
    const defs = stations();
    const Z = (opts.order || defs.map((_, k) => k)).map(k => defs[k]).map((z, i) => {
      const layers = {};
      ['base', 'l1', 'l3', 'l5', 'fx'].forEach(k => {
        const g = z[k] ? z[k]() : group(); g.updateMatrixWorld(true);
        const bb = new T.Box3().setFromObject(g), c = bb.getCenter(new T.Vector3());
        const piv = new T.Vector3(c.x, bb.min.y, c.z);
        g.children.forEach(ch => ch.position.sub(piv)); g.position.copy(piv);
        g.userData = { show: 0, t: 1, from: 0, to: 0, home: piv.y };
        g.scale.setScalar(.001); g.visible = false; scene.add(g); layers[k] = g;
        layers[k + 'Box'] = bb;
      });
      const bb = layers.baseBox.clone().union(layers.l3Box).union(layers.l5Box); if (!layers.l1Box.isEmpty()) bb.union(layers.l1Box);
      const stand = z.stand[z.stand.length - 1];
      // floor ring that marks the current station
      const ring = new T.Mesh(new T.RingGeometry(.42, .56, 48), new T.MeshBasicMaterial({ color: lin(colors[i] || '#B3985A'), transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(stand[0], .01, stand[1]); scene.add(ring);
      const pinEl = document.createElement('div'); pinEl.className = 'p3'; pinEl.textContent = i + 1; pinEl.style.setProperty('--pc0', colors[i] || '#B3985A'); overlay.appendChild(pinEl);
      return { layers, bb, minW: z.minW, stand: z.stand, ring, pinEl, pinAt: new T.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + .35, (bb.min.z + bb.max.z) / 2), steam: z.steam, level: 0 };
    });

    // steam puffs above the stove (future-ready only)
    const puffTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }, true);
    const puffs = Array.from({ length: 7 }, (_, n) => { const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData.ph = n / 7; scene.add(s); return s; });

    // the walker ("You")
    let me = null, meLabel = null, pos = ENTRY[0].slice(), at = null, walk = null;
    if (opts.walker) {
      me = person(pos[0], pos[1], { c: '#1D355E', cap: '#E2B13C', s: 2 }); scene.add(me);
      const halo = new T.Mesh(new T.CircleGeometry(.36, 32), new T.MeshBasicMaterial({ color: lin('#FFC947'), transparent: true, opacity: .45, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = .012; me.add(halo); me.userData.halo = halo;
      meLabel = document.createElement('div'); meLabel.className = 'p3-you'; meLabel.textContent = 'YOU'; overlay.appendChild(meLabel);
    }
    // kiosk: guests walking loops along the aisles, most carrying a tray (opts.ambient = how many)
    const LOOPS = [
      [[2.8, 2.45], [7.0, 2.45], [7.0, 5.47], [2.8, 5.47]],
      [[7.0, 8.9], [7.0, 1.6], [8.8, 1.6], [8.8, 5.2], [7.0, 5.2]],
      [[2.8, 5.47], [2.8, 2.45], [7.0, 2.45], [7.0, 8.6], [4.6, 8.6], [4.6, 5.47]],
      [[8.8, 2.35], [10.9, 2.35], [10.9, 2.5], [8.8, 2.5]]
    ];
    const SHIRTS = ['#3F97B5', '#EE7624', '#3CBFAE', '#F63440', '#5B4B8A', '#E0A93B', '#2D6E8E', '#8E2C48'];
    const amb = Array.from({ length: opts.ambient || 0 }, (_, n) => {
      const pts = LOOPS[n % LOOPS.length], seg = pts.map((p, k) => { const q = pts[(k + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
      const len = seg.reduce((a, b) => a + b, 0);
      const g = person(pts[0][0], pts[0][1], { kid: n % 3 !== 2, tray: n % 4 !== 3, c: SHIRTS[n % SHIRTS.length], s: n % 5 });
      delete g.userData.bob; scene.add(g);
      return { g, pts, seg, len, d: (n * 2.9) % len, v: .55 + (n % 3) * .12 };
    });
    // Jojo, the Compass mascot (internal names still say lisa): walks a step behind the guest
    let lisa = null, lisaLabel = null, lisaBubble = null, lisaFocusOn = false, lpos = null, trail = null;
    const LISA_HOME = [ENTRY[0][0] + .7, ENTRY[0][1] - .5];
    if (opts.walker && opts.lisa) {
      lpos = LISA_HOME.slice(); trail = [LISA_HOME.slice(), ENTRY[0].slice()];
      lisa = lisaFigure(lpos[0], lpos[1]);
      const lh = new T.Mesh(new T.CircleGeometry(.34, 32), new T.MeshBasicMaterial({ color: lin('#E2554C'), transparent: true, opacity: .35, depthWrite: false }));
      lh.rotation.x = -Math.PI / 2; lh.position.y = .012; lisa.add(lh); lisa.userData.halo = lh;
      scene.add(lisa);
      lisaLabel = document.createElement('div'); lisaLabel.className = 'p3-you p3-lisa'; lisaLabel.textContent = 'JOJO'; overlay.appendChild(lisaLabel);
      lisaBubble = document.createElement('div'); lisaBubble.className = 'p3-bubble'; lisaBubble.hidden = true; overlay.appendChild(lisaBubble);
    }

    // camera: fixed isometric direction; the view is a rectangle in camera space we tween, like a viewBox
    const target = new T.Vector3(6, 1.2, 4.5);
    const camera = new T.OrthographicCamera(-10, 10, 10, -10, .1, 200);
    camera.position.copy(target).add(new T.Vector3(20, 17.5, 20)); camera.lookAt(target); camera.updateMatrixWorld();
    const toCam = p => p.clone().applyMatrix4(camera.matrixWorldInverse);
    const roomPts = [];
    [0, 12].forEach(x => [0, 9].forEach(y => [0, 4.3].forEach(z => roomPts.push(V(x, y, z)))));
    let W = 1, H = 1, rect = null, tw = null;
    function fitRect(pts, pad) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      pts.forEach(p => { const q = toCam(p); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
      let w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2; const r = W / H;
      if (w / h < r) w = h * r; else h = w / r;
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w, h };
    }
    // wide, short frames (landing page) get a little margin so the top pins are not cut
    const fullRect = () => {
      const r = fitRect(roomPts, W / H > 1.15 ? .3 : -.15);
      if (!opts.zoom) return r;
      const f = toCam(V(...(opts.focus || [6, 5])));
      return { cx: r.cx + (f.x - r.cx) * .8, cy: r.cy + (f.y - r.cy) * .8, w: r.w * opts.zoom, h: r.h * opts.zoom };
    };
    function stationRect(i) {
      const z = Z[i], b = z.bb, st = z.stand[z.stand.length - 1];
      const pts = [b.min, b.max, new T.Vector3(b.min.x, b.max.y, b.max.z), new T.Vector3(b.max.x, b.min.y, b.min.z), V(st[0], st[1], 0), V(st[0], st[1], 1.6), z.pinAt];
      const r = fitRect(pts, .9); const m = z.minW || 6.8; if (r.w < m) { r.h *= m / r.w; r.w = m; } return r;
    }
    function applyRect(dx = 0, dy = 0) { if (!rect) return; camera.left = rect.cx + dx - rect.w / 2; camera.right = rect.cx + dx + rect.w / 2; camera.top = rect.cy + dy + rect.h / 2; camera.bottom = rect.cy + dy - rect.h / 2; camera.updateProjectionMatrix(); }
    // cinematic mode: a real lens, gliding between stations, plus post effects
    const persp = new T.PerspectiveCamera(28, 1, .1, 200);
    const DIR = new T.Vector3(1, .6, 1.08).normalize();
    let pv = null, ptw = null, fx = null;
    function perspFor(i) {
      let c, r;
      if (i < 0) { c = new T.Vector3(6, 1.2, 4.6); r = 6.1; }
      else { const z = Z[i], b = z.bb.clone(), st = z.stand[z.stand.length - 1]; b.expandByPoint(V(st[0], st[1], 0)); b.expandByPoint(z.pinAt); const sp = b.getBoundingSphere(new T.Sphere()); c = sp.center; r = Math.max(2.3, sp.radius * 1.08); }
      const vf = persp.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * (W / H));
      return { x: c.x, y: c.y, z: c.z, d: r / Math.sin(Math.min(vf, hf) / 2) };
    }
    const cam = () => REAL ? persp : camera;
    if (REAL) {
      renderer.toneMapping = T.NoToneMapping; renderer.outputEncoding = T.LinearEncoding;
      const composer = new T.EffectComposer(renderer);
      composer.addPass(new T.RenderPass(scene, persp));
      const sao = new T.SAOPass(scene, persp, false, true);
      Object.assign(sao.params, { output: 0, saoBias: .5, saoIntensity: .035, saoScale: 3, saoKernelRadius: 26, saoMinResolution: 0, saoBlur: true, saoBlurRadius: 7, saoBlurStdDev: 3.5, saoBlurDepthCutoff: .01 });
      composer.addPass(sao);
      const bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), .5, .4, 1.05); composer.addPass(bloom);
      const bokeh = new T.BokehPass(scene, persp, { focus: 10, aperture: .0022, maxblur: .0045, width: 512, height: 512 }); composer.addPass(bokeh);
      const grade = new T.ShaderPass({
        uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
          vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
          float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main(){
            vec3 c = texture2D(tDiffuse, vUv).rgb * .8;
            c = aces(c); c = pow(c, vec3(1. / 2.2));
            c = mix(vec3(dot(c, vec3(.299, .587, .114))), c, 1.12) * vec3(1.03, 1., .95); c = clamp((c - .5) * 1.1 + .5, 0., 1.);
            float v = smoothstep(1.0, .32, length(vUv - .5)); c *= mix(.8, 1., v);
            c += (rnd(vUv * 900. + fract(time)) - .5) * .026;
            gl_FragColor = vec4(c, 1.);
          }`
      });
      composer.addPass(grade);
      fx = { composer, bokeh, grade, setSize: (w, h) => composer.setSize(w, h) };
    }
    let viewing = -1;
    function view(i, ms = 900) {
      viewing = i; T_.lamps.visible = i < 0;  // lamps would hang in front of a close-up
      if (lisaFocusOn) { lisaFocusOn = false; lisaBubble.hidden = true; lisaLabel.style.display = ''; }
      if (REAL) {
        const to = perspFor(i);
        if (!pv || !ms || RM() || document.hidden) { pv = to; ptw = null; } else ptw = { from: Object.assign({}, pv), to, t0: performance.now(), ms: ms * 1.15 };
        return;
      }
      const to = i < 0 ? fullRect() : stationRect(i);
      if (!rect || !ms || RM() || document.hidden) { rect = to; tw = null; applyRect(); return; }
      tw = { from: Object.assign({}, rect), to, t0: performance.now(), ms };
    }
    function resize() {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      W = w; H = h; renderer.setSize(w, h, false);
      if (REAL) { persp.aspect = w / h; persp.updateProjectionMatrix(); pv = perspFor(viewing); ptw = null; if (fx) fx.setSize(w, h); return; }
      const target2 = viewing < 0 ? fullRect() : stationRect(viewing); rect = target2; tw = null; applyRect();
    }
    new ResizeObserver(resize).observe(el);

    // level changes spring the layers in or out
    function showLayer(g, on, delay = 0) {
      const u = g.userData; if (u.to === (on ? 1 : 0)) return;
      u.from = g.scale.x; u.to = on ? 1 : 0; u.t0 = performance.now() + delay; u.dur = on ? 650 : 260;
      if (on) g.visible = true;
      if (RM() || document.hidden) { g.scale.setScalar(on ? 1 : .001); g.position.y = u.home; g.visible = on; u.t0 = 0; }
    }
    function setLevel(i, L) { const z = Z[i]; z.level = L; showLayer(z.layers.base, L > 0); showLayer(z.layers.l1, L === 1, 120); showLayer(z.layers.l3, L >= 3, 120); showLayer(z.layers.l5, L >= 5, 240); }
    let live = false;
    function setLive(on) { live = on; T_.crowd.visible = on; Z.forEach((z, i) => showLayer(z.layers.fx, on, on ? i * 60 + 150 : 0)); }
    function pin(i, st) { const e = Z[i].pinEl; e.className = 'p3' + (st ? ' ' + st : ''); }
    let hi = -1; function highlight(i) { hi = i; }
    function setSign(t) { T_.signText = t; T_.sign.redraw(); }

    // walking along the aisles
    function walkTo(route, ms) {
      const pts = [pos.slice(), ...route];
      const seg = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
      const total = seg.reduce((a, b) => a + b, 0);
      if (!total || RM() || document.hidden) { pos = pts[pts.length - 1].slice(); walk = null; return; }
      walk = { pts, seg, total, t0: performance.now(), ms };
    }
    function goTo(i) {
      if (!me) { view(i); return; }
      if (at === i) { view(i, 500); return; }
      const route = at === null ? [ENTRY[1], ...Z[i].stand] : [...Z[at].stand.slice(0, -1).reverse(), ...Z[i].stand];
      const pts = [pos, ...route];
      const dist = pts.slice(1).reduce((s, p, k) => s + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);
      const ms = Math.min(1600, Math.max(650, dist * 140));
      at = i; walkTo(route, ms); view(i, ms);
    }
    // close-up on Lisa with a speech bubble over her head (details page)
    function lisaFocus(text) {
      if (!lisa) return;
      if (!text) { if (lisaFocusOn) view(-1, 900); return; }
      lisaFocusOn = true; T_.lamps.visible = false;
      lisaBubble.innerHTML = ''; const nm = document.createElement('b'); nm.textContent = 'Jojo'; const tx = document.createElement('span'); tx.textContent = text;
      lisaBubble.append(nm, tx); lisaBubble.hidden = false; lisaLabel.style.display = 'none';
      lisaBubble.classList.remove('pop'); void lisaBubble.offsetWidth; lisaBubble.classList.add('pop');
      if (REAL) return;
      const c = lpos, pts = [V(c[0] - 1.3, c[1] - 1.3, 0), V(c[0] + 1.3, c[1] + 1.3, 0), V(c[0], c[1], 3.4), V(pos[0], pos[1], 0)];
      const to = fitRect(pts, .25); if (to.w < 4.6) { to.h *= 4.6 / to.w; to.w = 4.6; }
      if (!rect || RM() || document.hidden) { rect = to; tw = null; applyRect(); return; }
      tw = { from: Object.assign({}, rect), to, t0: performance.now(), ms: 1100 };
    }
    function resetWalk() { at = null; walk = null; pos = ENTRY[0].slice(); if (trail) { trail = [LISA_HOME.slice(), ENTRY[0].slice()]; lpos = LISA_HOME.slice(); } view(-1, 0); }

    // fonts load late: redraw every canvas once they are in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => texs.forEach(t => t.redraw()));
    document.fonts && document.fonts.load && Promise.all([document.fonts.load("700 40px 'Caveat'")]).then(() => texs.forEach(t => t.redraw())).catch(() => {});

    // the loop
    const tmp = new T.Vector3();
    function frame(now) {
      requestAnimationFrame(frame);
      if (!W || !H || !el.clientWidth) return;
      if (tw) { const p = Math.min(1, (now - tw.t0) / tw.ms), e = ease(p); rect = { cx: tw.from.cx + (tw.to.cx - tw.from.cx) * e, cy: tw.from.cy + (tw.to.cy - tw.from.cy) * e, w: tw.from.w + (tw.to.w - tw.from.w) * e, h: tw.from.h + (tw.to.h - tw.from.h) * e }; applyRect(); if (p >= 1) tw = null; }
      if (opts.drift && !REAL && viewing < 0 && !tw && rect && !lisaFocusOn && !RM()) {
        const s = now / 1000; applyRect(Math.sin(s * .11) * rect.w * .07, Math.sin(s * .083 + 1) * rect.h * .05);
      }
      if (amb.length) {
        const dt = Math.min(.05, (now - (frame.last || now)) / 1000);
        amb.forEach(a => {
          if (!RM()) a.d = (a.d + a.v * dt) % a.len;
          let d = a.d, k = 0; while (d > a.seg[k]) { d -= a.seg[k]; k++; }
          const p = a.pts[k], q = a.pts[(k + 1) % a.pts.length], f = a.seg[k] ? d / a.seg[k] : 0;
          a.g.position.set(p[0] + (q[0] - p[0]) * f, Math.abs(Math.sin(now / 1000 * 9 + a.v * 7)) * .045, p[1] + (q[1] - p[1]) * f);
          const face = Math.atan2(q[0] - p[0], q[1] - p[1]);
          a.g.rotation.y += Math.atan2(Math.sin(face - a.g.rotation.y), Math.cos(face - a.g.rotation.y)) * .2;
        });
      }
      frame.last = now;
      Z.forEach(z => ['base', 'l1', 'l3', 'l5', 'fx'].forEach(k => {
        const g = z.layers[k], u = g.userData; if (!u.t0) return;
        const p = Math.max(0, Math.min(1, (now - u.t0) / u.dur)); if (now < u.t0) return;
        const s = u.to ? u.from + (1 - u.from) * back(p) : u.from * (1 - p * p);
        g.scale.setScalar(Math.max(.001, s)); g.position.y = u.home + (u.to ? (1 - Math.min(1, p * 1.4)) * .9 : 0);
        if (p >= 1) { u.t0 = 0; g.scale.setScalar(u.to ? 1 : .001); g.position.y = u.home; g.visible = !!u.to; }
      }));
      // idle life: breathing people, steam, the clock
      const t = now / 1000;
      scene.traverse(o => { if (o.userData && o.userData.bob !== undefined && o !== me) o.position.y = o.userData.base + Math.max(0, Math.sin(t * 2.2 + o.userData.bob)) * .025; });
      const kz = Z[3]; const steamOn = live && kz.layers.fx.visible;
      puffs.forEach(s => { const ph = (t * .35 + s.userData.ph) % 1; s.position.set(kz.steam[0] + Math.sin(ph * 6 + s.userData.ph * 9) * .12, kz.steam[2] + ph * 1.1, kz.steam[1]); s.scale.setScalar(.25 + ph * .5); s.material.opacity = steamOn ? Math.sin(ph * 3.14) * .55 : 0; });
      const d = new Date(), mins = d.getMinutes() + d.getSeconds() / 60, hrs = (d.getHours() % 12) + mins / 60;
      T_.minHand.rotation.z = -mins / 60 * 6.283; T_.hourHand.rotation.z = -hrs / 12 * 6.283;
      Z.forEach((z, i) => { z.ring.material.opacity = i === hi ? .55 + Math.sin(t * 4) * .25 : 0; z.ring.scale.setScalar(i === hi ? 1 + Math.sin(t * 4) * .06 : 1); });
      // walker
      if (me) {
        if (walk) {
          const p = Math.min(1, (now - walk.t0) / walk.ms); let dd = p * walk.total, k = 0;
          while (k < walk.seg.length - 1 && dd > walk.seg[k]) { dd -= walk.seg[k]; k++; }
          const a = walk.pts[k], b = walk.pts[k + 1], q = walk.seg[k] ? Math.min(1, dd / walk.seg[k]) : 1;
          pos = [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
          me.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
          me.position.y = Math.abs(Math.sin(t * 11)) * .06;
          if (p >= 1) { walk = null; me.position.y = 0; me.rotation.y = Math.PI / 4; }
        }
        me.position.x = pos[0]; me.position.z = pos[1];
        me.userData.halo.material.opacity = .3 + Math.sin(t * 3) * .15;
      }
      if (lisa && me) {
        // follow the guest's own path (always in the aisles), staying a step behind
        const last = trail[trail.length - 1];
        if (Math.hypot(pos[0] - last[0], pos[1] - last[1]) > .04) { trail.push(pos.slice()); if (trail.length > 400) trail.splice(1, 1); }
        let need = .9, tx = trail[0][0], tz = trail[0][1], cur = pos;
        for (let n = trail.length - 1; n >= 0; n--) {
          const q = trail[n], d = Math.hypot(cur[0] - q[0], cur[1] - q[1]);
          if (d >= need) { const f = need / d; tx = cur[0] + (q[0] - cur[0]) * f; tz = cur[1] + (q[1] - cur[1]) * f; need = 0; break; }
          need -= d; cur = q;
        }
        const k = RM() ? 1 : .12; lpos[0] += (tx - lpos[0]) * k; lpos[1] += (tz - lpos[1]) * k;
        const moving = Math.hypot(tx - lpos[0], tz - lpos[1]) > .05;
        lisa.position.set(lpos[0], moving ? Math.abs(Math.sin(t * 10)) * .05 : 0, lpos[1]);
        const face = lisaFocusOn ? Math.PI / 4 : Math.atan2(pos[0] - lpos[0], pos[1] - lpos[1]);
        lisa.rotation.y += (Math.atan2(Math.sin(face - lisa.rotation.y), Math.cos(face - lisa.rotation.y))) * .15;
        lisa.userData.halo.material.opacity = .25 + Math.sin(t * 3 + 1) * .12;
      }
      if (REAL && pv) {
        if (ptw) { const p = Math.min(1, (now - ptw.t0) / ptw.ms), e = ease(p); const n = {}; ['x', 'y', 'z', 'd'].forEach(k => n[k] = ptw.from[k] + (ptw.to[k] - ptw.from[k]) * e); pv = n; if (p >= 1) ptw = null; }
        const hx = Math.sin(t * .23) * .012 * pv.d, hy = Math.sin(t * .31 + 1) * .008 * pv.d; // a slow handheld drift
        persp.position.set(pv.x + DIR.x * pv.d + hx, pv.y + DIR.y * pv.d + hy, pv.z + DIR.z * pv.d - hx);
        persp.lookAt(pv.x, pv.y, pv.z);
        fx.bokeh.enabled = viewing >= 0; fx.bokeh.uniforms.focus.value = pv.d; fx.grade.uniforms.time.value = t;
        fx.composer.render();
      } else renderer.render(scene, camera);
      // HTML pins and the "You" label follow the scene
      const rw = el.clientWidth, rh = el.clientHeight;
      Z.forEach(z => { tmp.copy(z.pinAt).project(cam()); const x = (tmp.x + 1) / 2 * rw, y = (1 - tmp.y) / 2 * rh; z.pinEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; z.pinEl.style.visibility = (x < -20 || x > rw + 20 || y < -20 || y > rh + 20) ? 'hidden' : 'visible'; });
      if (me) { tmp.set(me.position.x, 1.75, me.position.z).project(cam()); meLabel.style.transform = `translate(${((tmp.x + 1) / 2 * rw).toFixed(1)}px, ${((1 - tmp.y) / 2 * rh).toFixed(1)}px)`; }
      if (lisa) {
        tmp.set(lisa.position.x, 2.15, lisa.position.z).project(cam()); lisaLabel.style.transform = `translate(${((tmp.x + 1) / 2 * rw).toFixed(1)}px, ${((1 - tmp.y) / 2 * rh).toFixed(1)}px)`;
        if (lisaFocusOn) { tmp.set(lisa.position.x, 1.5, lisa.position.z).project(cam()); const bx = Math.max(150, Math.min(rw - 150, (tmp.x + 1) / 2 * rw)), by = Math.max(130, (1 - tmp.y) / 2 * rh); lisaBubble.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px)`; lisaBubble.style.setProperty('--tail', (((tmp.x + 1) / 2 * rw) - bx).toFixed(1) + 'px'); }
      }
    }
    requestAnimationFrame(frame);
    resize(); view(-1, 0);

    return { setLevel, setLive, pin, highlight, setSign, view, goTo, resetWalk, setLogo, lisaFocus };
  }

  window.Cafe3D = { create };
})();
