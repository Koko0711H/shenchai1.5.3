import { useRef, useState, useEffect, Suspense, useMemo, useCallback, createContext, useContext } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import "./App.css"

// Error display for debugging
window.addEventListener("error", (e) => {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff3333;color:white;padding:20px;font-size:14px;font-family:monospace;word-break:break-all";
  div.textContent = "JS Error: " + (e.message || e.error?.message || e.type);
  document.body.prepend(div);
  console.error("Caught error:", e);
});
window.addEventListener("unhandledrejection", (e) => {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;top:40px;left:0;right:0;z-index:9999;background:#ff8800;color:white;padding:20px;font-size:14px;font-family:monospace;word-break:break-all";
  div.textContent = "Promise Error: " + (e.reason?.message || String(e.reason));
  document.body.prepend(div);
});



const STAGES = [
  { id: "home", label: "开发中", cam: [-2, 1.5, 5], target: [0, 0, 0], fov: 40, rot: 0,
    subtitle: "开发中",
    desc: "开发中" },
  { id: "allinone", label: "开发中", cam: [0, 5, 7.5], target: [0, 0, 0], fov: 26, rot: -1.5,
    subtitle: "开发中",
    desc: "开发中" },
  { id: "engine", label: "开发中", cam: [0, 1.5, 6], target: [0, 0, 0], fov: 28, rot: 0,
    subtitle: "开发中",
    desc: "开发中" },
  { id: "airflow", label: "开发中", cam: [-7.5, 5, 4.5], target: [0, 0, 0], fov: 24, rot: 1.5,
    subtitle: "开发中",
    desc: "开发中" },
  { id: "chassis", label: "开发中", cam: [-5.5, -1.5, 1.8], target: [0, 0.5, 0], fov: 30, rot: 3.0,
    subtitle: "开发中",
    desc: "开发中" },
]


function ModelGroup({ url, progress }) {
  const groupRef = useRef()
  const [scene, setScene] = useState(null)
  const rot = useRef(0)
  useEffect(() => {
    let c = false
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath("/draco/")
    loader.setDRACOLoader(dracoLoader)
    loader.load(url, (g) => {
      if (c) return
      const s = g.scene
      s.traverse((ch) => { if (ch.isMesh) { ch.castShadow = true; ch.receiveShadow = true } })
      const box = new THREE.Box3().setFromObject(s)
      s.position.sub(box.getCenter(new THREE.Vector3()))
      setScene(s)
    }, () => {}, () => {})
    return () => { c = true; dracoLoader.dispose() }
  }, [url])
  useFrame(() => {
    if (groupRef.current) {
      const total = STAGES.length - 1
      const si = Math.min(Math.floor(progress * total), total - 1)
      const ni = Math.min(si + 1, total)
      const lp = Math.min(Math.max((progress * total) % 1, 0), 1)
      const siStage = STAGES[si], niStage = STAGES[ni]
      if (!siStage || !niStage) return
      const target = siStage.rot + (niStage.rot - siStage.rot) * lp
      rot.current += (target - rot.current) * 0.08
      groupRef.current.rotation.y = rot.current
    }
  })
  if (!scene) return null
  return <group ref={groupRef}><primitive object={scene} scale={2.5} /></group>
}

function CameraController({ progress }) {
  const { camera, gl } = useThree()
  const pos = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const fov = useRef(42)
  const controlsRef = useRef()
  const lastUser = useRef(0)
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement)
    c.enableZoom = false; c.enablePan = false; c.enableRotate = false
    c.target.set(0, 0, 0); c.update()
    controlsRef.current = c
    const onStart = () => { lastUser.current = Date.now() }
    const onEnd = () => { lastUser.current = Date.now() }
    c.addEventListener("start", onStart); c.addEventListener("end", onEnd)
    return () => { c.removeEventListener("start", onStart); c.removeEventListener("end", onEnd); c.dispose() }
  }, [camera, gl])
  useFrame(() => {
    const total = STAGES.length - 1
    const si = Math.min(Math.floor(progress * total), total - 1)
    const ni = Math.min(si + 1, total)
    const lp = Math.min(Math.max((progress * total) % 1, 0), 1)
    const s = STAGES[si], n = STAGES[ni]
    if (!s || !n) return
    pos.current.set(
      s.cam[0] + (n.cam[0] - s.cam[0]) * lp,
      s.cam[1] + (n.cam[1] - s.cam[1]) * lp,
      s.cam[2] + (n.cam[2] - s.cam[2]) * lp
    )
    target.current.set(
      s.target[0] + (n.target[0] - s.target[0]) * lp,
      s.target[1] + (n.target[1] - s.target[1]) * lp,
      s.target[2] + (n.target[2] - s.target[2]) * lp
    )
    fov.current = s.fov + (n.fov - s.fov) * lp
    const timeSinceUser = Date.now() - lastUser.current
    if (timeSinceUser > 2000) {
      camera.position.lerp(pos.current, 0.06)
      controlsRef.current?.target?.lerp(target.current, 0.06)
      camera.fov += (fov.current - camera.fov) * 0.06
      camera.updateProjectionMatrix()
    }
    controlsRef.current?.update()
  })
  return null
}

function Particles() {
  const COUNT = 200
  const ref = useRef()
  const speeds = useRef(new Float32Array(COUNT))
  const offsets = useRef(new Float32Array(COUNT))
  const basePos = useRef(new Float32Array(COUNT * 3))
  const sizes = useRef(new Float32Array(COUNT))

  const [geo] = useState(() => {
    const pos = new Float32Array(COUNT * 3)
    const siz = new Float32Array(COUNT)
    const spd = new Float32Array(COUNT)
    const off = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const radius = 1.5 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      siz[i] = 0.02 + Math.random() * 0.05
      spd[i] = 0.2 + Math.random() * 0.4
      off[i] = Math.random() * Math.PI * 2
    }
    speeds.current = spd
    offsets.current = off
    basePos.current = new Float32Array(pos)
    sizes.current = siz

    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    g.setAttribute("size", new THREE.BufferAttribute(siz, 1))
    return g
  })

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const posAttr = ref.current.geometry.attributes.position
    const arr = posAttr.array
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      arr[i3 + 1] = basePos.current[i3 + 1] + Math.sin(t * speeds.current[i] + offsets.current[i]) * 0.4
      const angle = t * 0.03
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const bx = basePos.current[i3]
      const bz = basePos.current[i3 + 2]
      arr[i3] = bx * cos - bz * sin
      arr[i3 + 2] = bx * sin + bz * cos
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.04}
        color="#ff8844"
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function LightingController() { return null }

const LINE_PATH = "M2.30809 318.07Q21.0208 316.441 50.1395 311.552Q108.449 301.761 160.401 285.447Q187.503 276.937 211.151 264.212Q225.389 256.551 250.01 240.238Q275.87 223.104 291.318 214.863Q317.146 201.086 347.378 191.695Q407.665 172.97 460.721 167.081Q495.936 163.173 558.47 163.173Q585.817 163.173 628.557 141.714Q654.353 128.763 708.923 94.4123Q742.671 73.1683 758.993 63.6874Q786.229 47.8662 806.111 39.6039Q862.305 16.252 914.714 7.87042Q961.797 0.340553 1040.78 0.0125411Q1117.18 -0.304734 1171.71 7.40653Q1227.48 15.2934 1289.78 35.6259Q1321.15 45.8667 1370.62 65.0861Q1407.99 79.6092 1425.84 85.4202Q1454.72 94.8298 1481 99.0339Q1520.17 105.3 1617.15 102.785Q1665.69 101.526 1706.36 99.0087"

function Preloader({ loaded }) {
  const [pct, setPct] = useState(0)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (!loaded) {
      const t = setInterval(() => setPct(p => Math.min(p + Math.random() * 15, 100)), 300)
      return () => clearInterval(t)
    }
    setPct(100)
    setTimeout(() => setHidden(true), 800)
  }, [loaded])
  if (hidden) return null
  return (
    <aside className="preloader" style={{ opacity: pct >= 100 ? 0 : 1, pointerEvents: pct >= 100 ? "none" : "auto" }}>
      <div className="gear-loader">
        <svg className="gear-rotator" viewBox="0 0 120 120" width="100" height="100">
          <path d="M60 8c-3.3 0-6.5.4-9.5 1.2l-2.5-6.2c-.8-2-3-3-5-2.2l-6.2 2.5c-2 .8-3 3-2.2 5l2.3 5.7c-3.6 2-6.8 4.5-9.5 7.5l-5.8-2.3c-2-.8-4.2.2-5 2.2l-2.5 6.2c-.8 2 .2 4.2 2.2 5l5.7 2.3c-.9 3.2-1.4 6.5-1.4 9.9s.5 6.7 1.4 9.9l-5.7 2.3c-2 .8-3 3-2.2 5l2.5 6.2c.8 2 3 3 5 2.2l5.8-2.3c2.7 3 5.9 5.5 9.5 7.5l-2.3 5.7c-.8 2 .2 4.2 2.2 5l6.2 2.5c2 .8 4.2-.2 5-2.2l2.5-6.2c3 .8 6.2 1.2 9.5 1.2s6.5-.4 9.5-1.2l2.5 6.2c.8 2 3 3 5 2.2l6.2-2.5c2-.8 3-3 2.2-5l-2.3-5.7c3.6-2 6.8-4.5 9.5-7.5l5.8 2.3c2 .8 4.2-.2 5-2.2l2.5-6.2c.8-2-.2-4.2-2.2-5l-5.7-2.3c.9-3.2 1.4-6.5 1.4-9.9s-.5-6.7-1.4-9.9l5.7-2.3c2-.8 3-3 2.2-5l-2.5-6.2c-.8-2-3-3-5-2.2l-5.8 2.3c-2.7-3-5.9-5.5-9.5-7.5l2.3-5.7c.8-2-.2-4.2-2.2-5l-6.2-2.5c-2-.8-4.2.2-5 2.2L69.5 9.2C66.5 8.4 63.3 8 60 8zm0 15c13.3 0 24 10.7 24 24s-10.7 24-24 24-24-10.7-24-24 10.7-24 24-24z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
          <circle cx="60" cy="47" r="14" fill="none" stroke="rgba(255,200,150,0.5)" strokeWidth="2" strokeDasharray={`${pct/100 * 88} 88`} transform="rotate(-90 60 47)"/>
        </svg>
      </div>
      <div className="progress-num"><p>{Math.round(pct)}%</p></div>
    </aside>
  )
}

function StateTable({ stages, currentIdx, onSelect }) {
  const { t } = useLang();
  return (
    <div className="statetable-container">
      <div className="statetable-content">
        <div className="backgroundLine" />
        {stages.map((s, i) => (
          <div key={s.id} className={"st-item" + (i === currentIdx ? " active" : "")} onClick={() => onSelect(i)}>
            <p className="table-name">{t("stage_" + s.id)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContentOverlay({ stages, currentIdx, progress, ready }) {
  const { t } = useLang();

  const visible = ready
  if (currentIdx < 0 || currentIdx >= stages.length) return null
  const s = stages[currentIdx]
  const isHome = s.id === "home"
  const isAllinone = s.id === "allinone"
  const isEngine = s.id === "engine"
  const isAirflow = s.id === "airflow"
  const isChassis = s.id === "chassis"

  const getAnimClass = (idx) => {
    if (idx === currentIdx) return "anim-active"
    if (idx === currentIdx - 1) return "anim-exit"
    return "anim-hidden"
  }

  const renderRightContent = (stage, idx) => {
    const ac = getAnimClass(idx)
    const isH = stage.id === "home"
    const isA = stage.id === "allinone"
    const isE = stage.id === "engine"
    const isAf = stage.id === "airflow"
    const isC = stage.id === "chassis"

    return (
      <div className={"anim-block " + ac} key={stage.id}>
        {isH && (
          <>
            <div className="home-top-right"><span className="home-big-title">{t("homeBigTitle")}</span></div>
            <div className="home-bottom-right text-block-animate">
              <p className="home-intro-text">{t("homeIntro1")}</p>
              <p className="home-intro-text">{t("homeIntro2")}</p>
            </div>
          </>
        )}
        {isA && (
          <div className="allinone-top-right text-block-animate">
            <p className="allinone-desc-text">{t("allinoneDesc")}</p>
            <img className="module-img" src="/images/white-placeholder.svg" alt="白色占位图" />
          </div>
        )}
        {isE && (
          <div>
            <img className="engine-img" src="/images/white-placeholder.svg" alt="白色占位图" />
            <div className="engine-text-block">
              <p className="engine-desc-text">{t("engineDesc")}</p>
            </div>
          </div>
        )}
        {isAf && (
          <div className="airflow-top-right text-block-animate">
            <img className="module-img" src="/images/white-placeholder.svg" alt="白色占位图" />
            <p className="airflow-desc-text">{t("airflowDesc")}</p>
          </div>
        )}
        {isC && (
          <div className="chassis-right text-block-animate">
            <img className="module-img chassis-img" src="/images/white-placeholder.svg" alt="白色占位图" />
            <p className="chassis-desc-text">{t("chassisDesc")}</p>
          </div>
        )}
        {!isH && !isA && !isE && !isAf && !isC && (
          <div className="content-right">
            <p className="content-desc">{stage.desc}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={"content-overlay" + (visible ? " visible" : "")}>
      <div className={"content-glow glow-" + s.id} />
      <div className="section-number"><span className="current">{String(currentIdx + 1).padStart(2, "0")}</span><span className="total"> / {String(stages.length).padStart(2, "0")}</span></div>
      <div className={"content-left" + (isHome ? " home-left" : "") + (isAllinone ? " allinone-left" : "") + (isEngine ? " engine-left" : "") + (isAirflow ? " airflow-left" : "") + (isChassis ? " chassis-left" : "")}>
        <div className="title-box" key={s.id}>
          <h2 className={"content-title" + (isHome ? " home-title" : "") + (isAllinone ? " allinone-title" : "") + (isEngine ? " engine-title" : "") + (isAirflow ? " airflow-title" : "") + (isChassis ? " chassis-title" : "")}>{t("stage_" + s.id)}</h2>
          <p className={"content-subtitle" + (isHome ? " home-subtitle" : "") + (isAllinone ? " allinone-subtitle" : "") + (isEngine ? " engine-subtitle" : "") + (isAirflow ? " airflow-subtitle" : "") + (isChassis ? " chassis-subtitle" : "")}>{t("sub_" + s.id)}</p>
        </div>
      </div>
      {stages.map((stage, idx) => renderRightContent(stage, idx))}
    </div>
  )
}

function TechTags() {
  const { t } = useLang();
  return (
    <div className="tech-tags">
      <div className="tech-tag">{t("placeholder")}<span className="label">{t("placeholder")}</span></div>
      <div className="tech-tag">{t("placeholder")}<span className="label">{t("placeholder")}</span></div>
      <div className="tech-tag">{t("placeholder")}<span className="label">{t("placeholder")}</span></div>
      <div className="tech-tag">{t("placeholder")}<span className="label">{t("placeholder")}</span></div>
    </div>
  )
}

function FooterInfo() {
  const { t } = useLang();
  return (
    <>
      <div className="bottom-info">{t("placeholder")}</div>
      <div className="bottom-info-left">{t("placeholder")}</div>
    </>
  )
}

function Navbar({ progress }) {
  const { lang, setLang, t } = useLang();
  const scrolled = progress > 0.02;
  return (
    <div className={"navbar" + (scrolled ? " scrolled" : "")}>
      <img className="nav-logo" src="/logo.png" alt="Shenchai" />
      <div className="nav-links">
        <a href="https://shenchaidongli.pages.dev/">{t("navHome")}</a>
        <a href="https://shenchaidongli.pages.dev/#products">{t("navProducts")}</a>
        <a href="https://shenchaidongli.pages.dev/#about">{t("navAbout")}</a>
        <a href="https://shenchaidongli.pages.dev/#cases">{t("navCases")}</a>
        <a href="https://shenchaidongli.pages.dev/#contact">{t("navService")}</a>
      </div>
      <div className="lang-btns">
        <button type="button" className={"lang-btn" + (lang === "zh" ? " active" : "")} onClick={() => setLang("zh")}>中文</button>
        <button type="button" className={"lang-btn" + (lang === "en" ? " active" : "")} onClick={() => setLang("en")}>EN</button>
      </div>
    </div>
  );
}


function ScrollHint({ show, progress }) {
  const { t } = useLang();
  if (progress > 0.02) return null
  return (
    <div className={"scroll-hint" + (show ? " show" : "")}>
      <div className="scroll-line" />
      <span>{t("scroll")}</span>
      <span className="scroll-arrow" aria-hidden="true" />
    </div>
  )
}

export default function App() {
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const modelReady = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      const dh = document.documentElement.scrollHeight - window.innerHeight
      setProgress(dh > 0 ? Math.min(Math.max(window.scrollY / dh, 0), 1) : 0)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const sh = useMemo(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "500vh" : "600vh"), [])
  const currentStage = Math.min(Math.floor(progress * STAGES.length), STAGES.length - 1)

  const goToStage = useCallback((idx) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const target = (idx + 0.5) / STAGES.length * max
    window.scrollTo({ top: target, behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => modelReady.current = true, 500)
      return () => clearTimeout(t)
    }
  }, [ready])

  return (
    <LanguageProvider>
    <div className="app">
      <div className="scroll-progress" style={{ width: progress * 100 + '%' }} />
      <div className="scroll-progress-track" />
      <div className="tech-grid" style={{ opacity: Math.min(progress / 0.1, 1) * 0.28 }} />
      <div className="scene">
        <Canvas
          camera={{ position: [0, 5, 20], fov: 40, near: 0.5, far: 40 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          shadows
          onCreated={(state) => {
            state.scene.background = null
            state.gl.setClearColor("#0a0a0a", 0)
            setReady(true)
          }}>
          <ambientLight intensity={2.0} color="#ffffff" />
          <directionalLight position={[5, 8, 5]} intensity={6.0} color="#ffe4b5" castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-3, 5, -3]} intensity={2.0} color="#ffcc88" />
          <pointLight position={[0, 4, 2]} intensity={3.0} color="#ff8844" />
          <hemisphereLight args={["#ffffff", "#446688", 1.2]} />
          <Suspense fallback={null}>
            <ModelGroup url="/cabinet.glb" progress={progress} />
          </Suspense>
          <Particles />
          <LightingController />
          <CameraController progress={progress} />
        </Canvas>
      </div>

      <div className="deco-line-left" />
      <div className="deco-line-right" />
      <Preloader loaded={ready} />

      <div className="ui-layer">
        <TechTags />
        <ContentOverlay stages={STAGES} currentIdx={currentStage} progress={progress} ready={ready} />
        <StateTable stages={STAGES} currentIdx={currentStage} onSelect={goToStage} />
<ScrollHint show={ready} progress={progress} />
      </div>
      <FooterInfo />

      <Navbar progress={progress} />
      <div className="scroll-spacer" style={{ height: sh }} />
    </div>
    </LanguageProvider>
  )
}


// ===== Translation System =====
const T = {
  zh: {
    navHome: "首页", navProducts: "产品中心", navAbout: "关于我们",
    navCases: "项目案例", navService: "销售与服务", scroll: "滚动探索",
    placeholder: "开发中",
    homeTitle: "开发中",
    homeIntro1: "开发中",
    homeIntro2: "开发中",
    allinoneDesc: "开发中",
    engineDesc: "开发中",
    airflowDesc: "开发中",
    chassisDesc: "开发中",
    homeBigTitle: "如感兴趣可咨询",
    stage_home: "开发中",
    stage_allinone: "开发中",
    stage_engine: "开发中",
    stage_airflow: "开发中",
    stage_chassis: "开发中",
    subHome: "开发中",
    sub_home: "开发中",
    sub_allinone: "开发中",
    sub_engine: "开发中",
    sub_airflow: "开发中",
    sub_chassis: "开发中",
  },
  en: {
    navHome: "Home", navProducts: "Products", navAbout: "About",
    navCases: "Projects", navService: "Service & Sales", scroll: "SCROLL",
    placeholder: "Under development",
    homeTitle: "Under development",
    homeIntro1: "Under development",
    homeIntro2: "Under development",
    allinoneDesc: "Under development",
    engineDesc: "Under development",
    airflowDesc: "Under development",
    chassisDesc: "Under development",
    homeBigTitle: "Please inquire if interested",
    stage_home: "Under development",
    stage_allinone: "Under development",
    stage_engine: "Under development",
    stage_airflow: "Under development",
    stage_chassis: "Under development",
    subHome: "Under development",
    sub_home: "Under development",
    sub_allinone: "Under development",
    sub_engine: "Under development",
    sub_airflow: "Under development",
    sub_chassis: "Under development",
  }
};

const LanguageContext = createContext();
function LanguageProvider({ children }) {
  const [lang, setLang] = useState("zh");
  const t = useCallback((key) => T[lang][key] || key, [lang]);
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}
function useLang() {
  return useContext(LanguageContext);
}
