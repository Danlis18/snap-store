import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  Play,
  Pause,
  Check,
  ArrowLeft,
  ArrowRight,
  Box,
} from "lucide-react";
import { api, useShop, money, Link } from "../core";
import { Button } from "../components";
function Viewer({ look, paused, setPaused }) {
  const { t } = useShop();
  const host = useRef(),
    sceneState = useRef(),
    [failure, setFailure] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true,
      cleanup = () => {};
    async function setup() {
      try {
        const T = await import("three");
        const { RoundedBoxGeometry } =
          await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
        if (!alive || !host.current) return;
        const el = host.current,
          scene = new T.Scene(),
          renderer = new T.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "low-power",
          });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
        renderer.outputColorSpace = T.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.setAttribute(
          "aria-label",
          "Обертальна стилізована 3D-модель одягу",
        );
        renderer.domElement.setAttribute("role", "img");
        const camera = new T.PerspectiveCamera(
          32,
          el.clientWidth / el.clientHeight,
          0.1,
          50,
        );
        camera.position.set(0, 1.05, 7);
        camera.lookAt(0, 0.03, 0);
        scene.add(new T.HemisphereLight("#dae5ff", "#4b4e5b", 3.3));
        const key = new T.DirectionalLight("#ffffff", 4);
        key.position.set(3, 5, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        scene.add(key);
        const rim = new T.DirectionalLight("#4774ff", 2);
        rim.position.set(-3, 2, -3);
        scene.add(rim);
        const group = new T.Group();
        group.rotation.y = -0.25;
        scene.add(group);
        const mat = (color, roughness = 0.7, metalness = 0) =>
          new T.MeshStandardMaterial({ color, roughness, metalness });
        const upper = mat("#31333c"),
          lower = mat("#2a2c34"),
          shoes = mat("#eeeff1", 0.35),
          skin = mat("#bfc7d7", 0.3, 0.35),
          stitch = mat("#5f626f");
        function mesh(geo, material, pos, scale) {
          const m = new T.Mesh(geo, material);
          m.position.set(...pos);
          if (scale) m.scale.set(...scale);
          m.castShadow = true;
          m.receiveShadow = true;
          group.add(m);
          return m;
        }
        const torsoShape = new T.Shape();
        torsoShape.moveTo(-0.27, 1.15);
        torsoShape.quadraticCurveTo(-0.45, 1.13, -0.49, 0.9);
        torsoShape.lineTo(-0.43, 0.16);
        torsoShape.quadraticCurveTo(0, 0.11, 0.43, 0.16);
        torsoShape.lineTo(0.49, 0.9);
        torsoShape.quadraticCurveTo(0.45, 1.13, 0.27, 1.15);
        torsoShape.quadraticCurveTo(0, 0.92, -0.27, 1.15);
        const torso = mesh(
          new T.ExtrudeGeometry(torsoShape, {
            depth: 0.37,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 1,
            bevelSize: 0.06,
            bevelThickness: 0.06,
            curveSegments: 20,
          }),
          upper,
          [0, 0, -0.2],
        );
        const collar = mesh(
          new T.TorusGeometry(0.19, 0.052, 12, 36),
          stitch,
          [0, 1.1, 0.015],
        );
        collar.rotation.x = Math.PI / 2;
        mesh(new T.CylinderGeometry(0.105, 0.13, 0.15, 24), skin, [0, 1.27, 0]);
        mesh(
          new T.SphereGeometry(0.23, 32, 24),
          skin,
          [0, 1.56, 0.005],
          [0.83, 1.18, 0.86],
        );
        for (const sign of [-1, 1]) {
          const sleeve = mesh(
            new T.CylinderGeometry(0.18, 0.145, 0.68, 24),
            upper,
            [sign * 0.54, 0.76, -0.005],
          );
          sleeve.rotation.z = sign * 0.29;
          const arm = mesh(new T.CapsuleGeometry(0.1, 0.33, 8, 16), skin, [
            sign * 0.68,
            0.24,
            0.005,
          ]);
          arm.rotation.z = sign * 0.14;
          const cuff = mesh(
            new T.CylinderGeometry(0.145, 0.14, 0.07, 24),
            stitch,
            [sign * 0.64, 0.42, 0],
          );
          cuff.rotation.z = sign * 0.29;
          mesh(new T.CylinderGeometry(0.205, 0.165, 1.15, 24), lower, [
            sign * 0.215,
            -0.55,
            0,
          ]);
          const pocket = mesh(
            new RoundedBoxGeometry(0.23, 0.3, 0.06, 3, 0.025),
            lower,
            [sign * 0.32, -0.52, 0.16],
          );
          pocket.rotation.y = sign * 0.35;
          mesh(new RoundedBoxGeometry(0.32, 0.09, 0.48, 3, 0.045), shoes, [
            sign * 0.22,
            -1.25,
            0.08,
          ]);
          mesh(new RoundedBoxGeometry(0.29, 0.18, 0.42, 3, 0.07), shoes, [
            sign * 0.22,
            -1.14,
            0.08,
          ]);
          for (let i = 0; i < 3; i++)
            mesh(new RoundedBoxGeometry(0.16, 0.018, 0.022, 2, 0.005), stitch, [
              sign * 0.22,
              -1.033,
              0.09 + i * 0.06,
            ]);
        }
        const hem = mesh(
          new T.CylinderGeometry(0.44, 0.43, 0.075, 32),
          stitch,
          [0, 0.12, 0],
          [1, 1, 0.6],
        );
        const ring = new T.Mesh(
          new T.TorusGeometry(1.05, 0.006, 8, 80),
          mat("#5673d9", 0.3, 0.4),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -1.405;
        scene.add(ring);
        const platform = new T.Mesh(
          new T.CylinderGeometry(1.12, 1.18, 0.09, 80),
          mat("#bdc6da", 0.65, 0.12),
        );
        platform.position.y = -1.46;
        platform.receiveShadow = true;
        scene.add(platform);
        const floor = new T.Mesh(
          new T.PlaneGeometry(200, 200),
          new T.ShadowMaterial({ opacity: 0.12 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.51;
        floor.receiveShadow = true;
        scene.add(floor);
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0,
          last = 0,
          visible = true,
          pointer = null;
        sceneState.current = {
          group,
          upper,
          lower,
          shoes,
          stitch,
          paused: media.matches,
          rotate: (dir) => {
            group.rotation.y += dir * 0.35;
          },
        };
        const down = (e) => {
          pointer = { x: e.clientX, y: e.clientY, rotation: group.rotation.y };
        };
        const move = (e) => {
          if (
            pointer &&
            Math.abs(e.clientX - pointer.x) > Math.abs(e.clientY - pointer.y)
          ) {
            group.rotation.y =
              pointer.rotation + (e.clientX - pointer.x) * 0.012;
          }
        };
        const up = () => {
          pointer = null;
        };
        el.addEventListener("pointerdown", down);
        el.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        const observer = new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting;
        });
        observer.observe(el);
        const resize = new ResizeObserver(() => {
          camera.aspect = el.clientWidth / el.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(el.clientWidth, el.clientHeight);
        });
        resize.observe(el);
        function draw(time) {
          frame = requestAnimationFrame(draw);
          if (time - last < 33 || !visible || document.hidden) return;
          last = time;
          if (!pointer && !sceneState.current.paused && !media.matches)
            group.rotation.y += 0.005;
          renderer.render(scene, camera);
        }
        draw(0);
        setLoading(false);
        cleanup = () => {
          cancelAnimationFrame(frame);
          resize.disconnect();
          observer.disconnect();
          el.removeEventListener("pointerdown", down);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointercancel", up);
          window.removeEventListener("pointerup", up);
          scene.traverse((o) => {
            o.geometry?.dispose();
            if (o.material) {
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                (m) => m.dispose(),
              );
            }
          });
          renderer.dispose();
          renderer.domElement.remove();
          sceneState.current = null;
        };
      } catch (e) {
        if (alive) {
          setFailure(true);
          setLoading(false);
        }
      }
    }
    setup();
    return () => {
      alive = false;
      cleanup();
    };
  }, []);
  useEffect(() => {
    if (sceneState.current) sceneState.current.paused = paused;
  }, [paused, loading]);
  useEffect(() => {
    const s = sceneState.current;
    if (!s || !look) return;
    const top = look.products.find((p) =>
        ["hoodie", "tshirt"].includes(p.type),
      ),
      bottom = look.products.find((p) => p.type === "trousers"),
      shoe = look.products.find((p) => p.type === "sneakers");
    s.upper.color.set(top?.colors[0]?.hex || "#333640");
    s.lower.color.set(bottom?.colors[0]?.hex || "#24262d");
    s.shoes.color.set(shoe?.colors[0]?.hex || "#f3f3f3");
    s.stitch.color.set(top?.colors[0]?.hex || "#333640");
  }, [look, loading]);
  return (
    <div className="studio-viewer">
      <div className="viewer-top">
        <span>SNAP STUDIO / LIVE 3D</span>
        <span>360° VIEW</span>
      </div>
      <div className="studio-canvas" ref={host}>
        {loading && <div className="page-loading">3D…</div>}
        {failure && (
          <div className="empty">
            <Box size={40} />
            <h3>WebGL {t("недоступний", "unavailable")}</h3>
            <p>
              {t(
                "Для 3D потрібен браузер із WebGL. Підібрані товари доступні нижче.",
                "3D requires a WebGL-compatible browser. Product selections remain available below.",
              )}
            </p>
          </div>
        )}
      </div>
      <div className="viewer-bottom">
        <span>{t("Потягни, щоб обертати", "Drag to rotate")}</span>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => sceneState.current?.rotate(-1)}
            aria-label="Rotate left"
          >
            <ArrowLeft size={17} />
          </button>
          <button
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Play rotation" : "Pause rotation"}
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}
          </button>
          <button
            onClick={() => sceneState.current?.rotate(1)}
            aria-label="Rotate right"
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
export default function Studio() {
  const { t, lang, settings, setQuick } = useShop();
  const [style, setStyle] = useState("street"),
    [occasion, setOccasion] = useState("daily"),
    [budget, setBudget] = useState(9000),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [selected, setSelected] = useState(0),
    [error, setError] = useState(""),
    [paused, setPaused] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await api("/stylist", {
        method: "POST",
        body: { style, occasion, budget: budget * 100 },
      });
      setResult(r);
      setSelected(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="wrap studio-page">
      <div className="studio-intro">
        <div>
          <p className="eyebrow blue-text">
            <Sparkles size={16} />
            SNAP STUDIO
          </p>
          <h1>
            {t("Твій стиль.", "Your style.")}
            <br />
            <span className="blue-text">
              {t("У новому вимірі.", "A new dimension.")}
            </span>
          </h1>
        </div>
        <p>
          {t(
            "Три відповіді. Кілька поєднань. Подивись, як твій наступний образ виглядає в русі.",
            "Three answers. A few combinations. See your next look in motion.",
          )}
        </p>
      </div>
      <div className="studio-layout">
        <div className="studio-controls">
          <section>
            <h3>01 / {t("Який твій вайб?", "What is your vibe?")}</h3>
            <div className="choice-group">
              {[
                ["street", "Streetwear"],
                ["minimal", "Minimal"],
                ["sport", "Sport casual"],
              ].map(([id, name]) => (
                <button
                  className={style === id ? "active" : ""}
                  aria-pressed={style === id}
                  key={id}
                  onClick={() => setStyle(id)}
                >
                  {name}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>02 / {t("Куди збираєшся?", "Where are you going?")}</h3>
            <div className="choice-group">
              {[
                ["daily", "На кожен день", "Everyday"],
                ["university", "На навчання", "Campus"],
                ["evening", "На вечір", "Evening"],
              ].map(([id, uk, en]) => (
                <button
                  className={occasion === id ? "active" : ""}
                  aria-pressed={occasion === id}
                  key={id}
                  onClick={() => setOccasion(id)}
                >
                  {t(uk, en)}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>03 / {t("Комфортний бюджет?", "Your budget?")}</h3>
            <label className="range-label">
              <b>{money(budget * 100, lang)}</b>
              <input
                aria-label={t("Бюджет образу", "Outfit budget")}
                type="range"
                min="3000"
                max="15000"
                step="500"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </label>
            <div className="range-extents">
              <span>3 000 ₴</span>
              <span>15 000 ₴</span>
            </div>
          </section>
          <Button busy={busy} onClick={generate}>
            <Sparkles size={18} />
            {t("Зібрати мої образи", "Build my looks")}
          </Button>
          <p className="fine" style={{ gridColumn: "1 / -1" }}>
            {settings.aiReady
              ? t(
                  "AI-підбір із товарів каталогу.",
                  "AI recommendations from our catalog.",
                )
              : t(
                  "Зараз: підбір за правилами. AI-сервіс ще не підключено.",
                  "Currently: rule-based recommendations. AI is not connected yet.",
                )}
          </p>
        </div>
        <Viewer
          look={result?.looks[selected]}
          paused={paused}
          setPaused={setPaused}
        />
      </div>
      <p className="studio-note">
        {t(
          "3D показує умовний силует і поєднання кольорів, а не точні моделі товарів чи посадку на твоєму тілі. Фото та реальні заміри — у картках.",
          "3D shows an illustrative silhouette and colour combination, not exact product models or fit on your body. Find photos and actual measurements on product pages.",
        )}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="section-top" style={{ marginTop: 40 }}>
            <h2>{t("Твої поєднання", "Your combinations")}</h2>
            <span className="fine">
              {result.mode === "ai"
                ? "AI"
                : t("Підбір за правилами", "Rule-based selection")}
            </span>
          </div>
          {!result.looks.length && (
            <div className="notice">
              {t(
                "Для цього бюджету поки немає повного образу. Збільш бюджет.",
                "No full outfit fits this budget yet. Try increasing it.",
              )}
            </div>
          )}
          <div className="looks-list">
            {result.looks.map((look, i) => (
              <article
                className={"look-card " + (selected === i ? "active" : "")}
                key={i}
              >
                <button onClick={() => setSelected(i)}>
                  <div>
                    <p className="eyebrow">LOOK 0{i + 1}</p>
                    <h3>{look.name}</h3>
                  </div>
                  {selected === i ? (
                    <Check size={20} />
                  ) : (
                    <ArrowUpRight size={20} />
                  )}
                </button>
                <div className="look-images">
                  {look.products.map((p) => (
                    <img key={p.id} src={p.images[0]} alt={p.name} />
                  ))}
                </div>
                {look.products.map((p) => (
                  <div className="look-item" key={p.id}>
                    <Link to={"/product/" + p.slug}>
                      {p.brand} · {lang === "uk" ? p.name : p.nameEn}
                    </Link>
                    <span>{money(p.price, lang)}</span>
                  </div>
                ))}
                <div className="summary-line">
                  <b>{t("Разом", "Total")}</b>
                  <b>{money(look.total, lang)}</b>
                </div>
                <p className="fine">
                  {t(
                    "Натисни на річ, щоб вибрати її колір і розмір.",
                    "Select a piece to choose its colour and size.",
                  )}
                </p>
                <div className="choice-group" style={{ marginTop: 15 }}>
                  {look.products.map((p, j) => (
                    <button key={p.id} onClick={() => setQuick(p)}>
                      {t(
                        ["Верх", "Низ", "Взуття"][j],
                        ["Top", "Bottom", "Shoes"][j],
                      )}{" "}
                      +
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
