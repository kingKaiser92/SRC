// <singlet-viewer src="...">: continuous turntable with drag, locked camera.
(function () {
  const IMPORTMAP = {
    imports: {
      three: 'https://unpkg.com/three@0.184.0/build/three.module.js',
      'three/addons/loaders/GLTFLoader.js': 'https://unpkg.com/three@0.184.0/examples/jsm/loaders/GLTFLoader.js',
      'three/addons/libs/meshopt_decoder.module.js': 'https://unpkg.com/three@0.184.0/examples/jsm/libs/meshopt_decoder.module.js'
    }
  };
  if (!document.querySelector('script[type="importmap"]')) {
    const s = document.createElement('script');
    s.type = 'importmap';
    s.textContent = JSON.stringify(IMPORTMAP);
    document.head.prepend(s);
  }

  const okColor = (v) =>
    (typeof v === 'string' && !v.includes('{{') && /^(#|rgb|hsl|[a-z]{3,})/i.test(v.trim())) ? v.trim() : null;

  class SingletViewer extends HTMLElement {
    static get observedAttributes() { return ['color']; }

    attributeChangedCallback(n, o, v) {
      // Only meaningful for meshes with no baked map. The shipped asset is
      // fully textured, so `color` is a no-op on it. See _boot.
      const c = okColor(v);
      if (n === 'color' && c && this._mat && this._THREE) this._mat.color.set(new this._THREE.Color(c));
    }

    connectedCallback() {
      this.style.display = 'block';
      this.style.position = 'relative';
      // A framework runtime may detach and reattach this element during mount.
      // Boot once, but restart the loop and observers on EVERY connect: an
      // `if (booted) return` guard here kills the loop forever.
      if (!this._booted) { this._booted = true; this._boot(); }
      else this._start();
    }

    disconnectedCallback() { this._stop(); }

    _start() {
      if (!this._renderer || this._running) return;
      this._running = true;
      if (this.parentElement && this._canvas && this._canvas.parentElement !== this) this.appendChild(this._canvas);
      this._pEl = undefined;
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);

      // Battery on mobile: a 150k-tri scene has no business rendering while
      // the hero is scrolled away and the reader is filling in the form below.
      this._visible = true;
      if ('IntersectionObserver' in window) {
        this._io = new IntersectionObserver((entries) => {
          const e = entries[entries.length - 1];
          this._visible = e.isIntersecting;
          if (this._visible) this._loop();
          else if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
        }, { threshold: 0 });
        this._io.observe(this);
      }

      this._resize();
      this._measure();
      if (!Number.isFinite(this._cur)) this._cur = this._target;
      this._loop();
    }

    _stop() {
      this._running = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      if (this._io) { this._io.disconnect(); this._io = null; }
    }

    _loop() {
      if (this._raf || !this._running || !this._visible) return;
      const tick = () => {
        this._raf = 0;
        if (!this._running || !this._visible) return;
        // Measured inside the frame rather than from a scroll listener. The
        // listener version ran this same rect read outside rAF on every scroll
        // event, which is a forced-layout risk.
        this._measure();
        if (!Number.isFinite(this._cur)) this._cur = 0;
        // Reduced motion drops the autonomous turntable and the bob. Drag still
        // works: that is direct manipulation, not motion inflicted on a reader.
        const quiet = this._calm.matches;
        this._cur += (this._target - this._cur) * (quiet ? 1 : 0.09);
        const c = this._cur;
        if (!this._dragging) {
          // Inertia after a flick, then ease the offset back toward the idle
          // float so the piece never parks edge-on.
          this._userY += this._velY;
          this._userX = Math.max(-0.55, Math.min(0.55, this._userX + this._velX));
          this._velY *= 0.94; this._velX *= 0.94;
          if (Math.abs(this._velY) < 0.0004) this._velY = 0;
          if (Math.abs(this._velX) < 0.0004) this._velX = 0;
          if (!this._velY && !this._velX) { this._userY *= 0.985; this._userX *= 0.97; }
        }
        const t = performance.now() * 0.001;
        if (!quiet) this._spin += 0.0042;
        // The mesh is near planar (depth is about 8% of height), so a linear
        // turn parks it edge-on and invisible for seconds twice per revolution.
        // Warping theta to theta - k*sin(2*theta) keeps a true 360 degree
        // revolution but dwells on the faces and sweeps about 1.7x faster
        // through the edge-on quadrants. Do not simplify this to a constant
        // rate: the object disappears if you do.
        const sp = this._spin;
        this._pivot.rotation.y = sp - 0.35 * Math.sin(2 * sp) + this._userY;
        this._pivot.rotation.x = 0.11 + (quiet ? 0 : Math.sin(t * 0.23) * 0.03) + this._userX;
        this._pivot.position.y = (0.5 - c) * this._size.y * 0.14 +
          (quiet ? 0 : Math.sin(t * 0.42) * this._size.y * 0.012);
        this._renderer.render(this._scene, this._camera);
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    async _boot() {
      try {
        await this._bootThree();
      } catch (err) {
        // new THREE.WebGLRenderer(...) throws whenever a WebGL context cannot
        // be created (older phones, GPU blocklists, webgl.disabled, tabs past
        // the context limit). Without this catch, data-ready never gets set,
        // the element stays at opacity:0 (see preorder.html), and the reader
        // scrolls roughly three screen-heights of frozen headline where the
        // product reveal should be. Fall back to a static image instead.
        console.error('[singlet-viewer] 3D boot failed, falling back to a static image:', err);
        // Stop first. If the throw came from _start() the renderer already
        // exists and a scheduled frame would keep rendering into a canvas
        // this is about to detach.
        this._stop();
        this.innerHTML = '';
        const img = document.createElement('img');
        // A plain relative string here resolves against the page's own URL
        // (document baseURI), not this script's location, which is what
        // matters since preorder.html and singlet-assets/ are siblings.
        img.src = 'singlet-assets/singlet-front.png';
        img.alt = 'Race Day Singlet, front view';
        img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain';
        this.appendChild(img);
        this.setAttribute('data-ready', '');
      }
    }

    async _bootThree() {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.45;
      const cv = renderer.domElement;
      cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab';
      this.appendChild(cv);
      this._canvas = cv;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);

      scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1a1a, 1.1));
      const key = new THREE.DirectionalLight(0xfff4e0, 2.6); key.position.set(2.2, 3.2, 2.6); scene.add(key);
      const fill = new THREE.DirectionalLight(0xbfd4ff, 0.9); fill.position.set(-3, 1.2, 1.5); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffc30b, 1.9); rim.position.set(-1.4, 1.6, -3.2); scene.add(rim);

      const pivot = new THREE.Group();
      scene.add(pivot);

      // The shipped GLB is meshopt-compressed (EXT_meshopt_compression).
      // Without the decoder GLTFLoader throws on load.
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(this.getAttribute('src'));
      const obj = gltf.scene;

      let mat = null;
      obj.traverse((m) => {
        if (!m.isMesh) return;
        // The source carries POSITION and TEXCOORD_0 only. MeshStandardMaterial
        // would shade against a normal the geometry does not have, so derive
        // them once, here.
        if (m.geometry && !m.geometry.getAttribute('normal')) m.geometry.computeVertexNormals();
        const src = m.material;
        // The GLB declares KHR_materials_unlit, which three.js instantiates as
        // MeshBasicMaterial: unlit, and unreadable against the ink page. Swap
        // in a lit material that keeps the baked map. Gate on the presence of a
        // map rather than on material type, so an ordinary textured GLB gets
        // the same treatment. Gating on "has a map, keep its material" instead
        // is what left this asset rendering flat.
        if (src && src.map) {
          if (src.map.colorSpace !== undefined) src.map.colorSpace = THREE.SRGBColorSpace;
          m.material = new THREE.MeshStandardMaterial({
            map: src.map, roughness: 0.62, metalness: 0.06,
            side: THREE.DoubleSide, emissiveMap: src.map,
            emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.34
          });
          return;
        }
        if (!mat) {
          mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(okColor(this.getAttribute('color')) || '#e9e3d6'),
            roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide
          });
        }
        m.material = mat;
      });

      const box = new THREE.Box3().setFromObject(obj);
      obj.position.sub(box.getCenter(new THREE.Vector3()));
      pivot.add(obj);

      this._THREE = THREE; this._mat = mat; this._renderer = renderer;
      this._scene = scene; this._camera = camera; this._pivot = pivot;
      this._size = box.getSize(new THREE.Vector3());
      this._cur = undefined; this._target = 0; this._spin = 0;
      this._userY = 0; this._userX = 0; this._velY = 0; this._velX = 0; this._dragging = false;
      this._calm = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._bindDrag(cv);

      const late = okColor(this.getAttribute('color'));
      if (late && mat) mat.color.set(new THREE.Color(late));

      this.setAttribute('data-ready', '');
      if (this.isConnected) this._start();
    }

    _bindDrag(cv) {
      let px = 0, py = 0, id = null;
      cv.addEventListener('pointerdown', (e) => {
        id = e.pointerId; px = e.clientX; py = e.clientY;
        this._dragging = true; this._velY = 0; this._velX = 0;
        cv.setPointerCapture(id); cv.style.cursor = 'grabbing';
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this._dragging || e.pointerId !== id) return;
        const dx = e.clientX - px;
        // touch-action:pan-y leaves vertical swipes to the page, so touch drags
        // only claim the horizontal axis. Mouse and pen still get tilt.
        const dy = e.pointerType === 'touch' ? 0 : e.clientY - py;
        px = e.clientX; py = e.clientY;
        this._velY = dx * 0.0075;
        this._velX = dy * 0.0045;
        this._userY += this._velY;
        this._userX = Math.max(-0.55, Math.min(0.55, this._userX + this._velX));
        this.setAttribute('data-touched', '');
      });
      const end = () => {
        if (!this._dragging) return;
        this._dragging = false; cv.style.cursor = 'grab';
        if (id !== null && cv.hasPointerCapture(id)) cv.releasePointerCapture(id);
        id = null;
      };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('lostpointercapture', end);
    }

    _progressEl() {
      if (this._pEl !== undefined) return this._pEl;
      const sel = this.getAttribute('progress-target');
      if (sel) { this._pEl = document.querySelector(sel); return this._pEl; }
      let n = this.parentElement;
      while (n && n !== document.body) {
        if (getComputedStyle(n).position === 'sticky') { this._pEl = n.parentElement; return this._pEl; }
        n = n.parentElement;
      }
      this._pEl = null;
      return null;
    }

    _measure() {
      // This element is pinned inside a sticky stage, so its own rect never
      // moves. Progress comes from the tall scroll wrapper around it.
      const vh = window.innerHeight;
      const el = this._progressEl();
      let p = 0;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = r.height - vh;
        p = span > 8 ? -r.top / span : 0;
      } else {
        const r = this.getBoundingClientRect();
        const span = vh + r.height;
        if (span > 8) p = (vh - r.top) / span;
      }
      // A pre-layout measure yields 0/0 = NaN, which permanently poisons the
      // eased value, so guard before storing.
      this._target = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
    }

    _resize() {
      if (!this._renderer) return;
      const w = this.clientWidth || 1, h = this.clientHeight || 1;
      this._renderer.setSize(w, h, false);
      const aspect = w / h;
      const cam = this._camera;
      cam.aspect = aspect;
      const s = this._size;
      const t = Math.tan((cam.fov * Math.PI / 180) / 2);
      const distV = (s.y / 2) / t;
      const distH = (Math.max(s.x, s.z) / 2) / (t * aspect);
      cam.position.set(0, 0.02, Math.max(distV, distH) * 1.2 + s.z);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
    }
  }

  if (!customElements.get('singlet-viewer')) customElements.define('singlet-viewer', SingletViewer);
})();
