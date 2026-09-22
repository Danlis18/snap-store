import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Check,
  X,
  Upload,
  Save,
  RefreshCw,
  Settings,
  ArrowUpRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import { api, useShop, money, Link, useRoute, navigate } from "../core";
import { Button, Login, Modal, Empty, ProductPrice } from "../components";
import { createId } from "../ids";
const statusNames = {
  new: "Нове",
  confirmed: "Підтверджено",
  shipped: "Відправлено",
  delivered: "Отримано",
  cancelled: "Скасовано",
  return_requested: "Запит повернення",
  returned: "Повернено",
};
const next = {
  new: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: [],
  cancelled: [],
};
function ProductEditor({ product, brands, onSave }) {
  const [p, setP] = useState(structuredClone(product)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [imageUrl, setImageUrl] = useState(""),
    [photoColor, setPhotoColor] = useState(-1),
    [savedMessage, setSavedMessage] = useState(""),
    [customSize, setCustomSize] = useState("");
  useEffect(() => setSavedMessage(""), [p]);
  const uploadLock = useRef(false);
  const photoIndex = photoColor < p.colors.length ? photoColor : -1;
  const photos = photoIndex < 0 ? p.images : p.colors[photoIndex].images || [];
  function updatePhotos(current, index, change) {
    if (index < 0) return { ...current, images: change(current.images) };
    if (!current.colors[index]) return current;
    const images = change(current.colors[index].images || []);
    return { ...current, images: current.images.length ? current.images : images.slice(0, 1), colors: current.colors.map((c, i) => i === index ? { ...c, images } : c) };
  }
  const bind = (key, number = false) => ({
    value: p[key] ?? "",
    onChange: (e) =>
      setP((p) => ({
        ...p,
        [key]: number ? Number(e.target.value) : e.target.value,
      })),
  });
  function rebuild(colors, sizes, rename = null) {
    if (uploadLock.current) return;
    if (colors.length !== p.colors.length) setPhotoColor(-1);
    const order = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    sizes = [...sizes].sort((a, b) => order.includes(a) && order.includes(b) ? order.indexOf(a) - order.indexOf(b) : a.localeCompare(b, "uk", { numeric: true }));
    setP((p) => ({
      ...p,
      colors,
      sizes,
      sizePrices: Object.fromEntries(Object.entries(p.sizePrices || {}).filter(([size]) => sizes.includes(size))),
      variants: colors.flatMap((c) =>
        sizes.map((size) => ({
          color: c.name,
          size,
          available:
            p.variants.find(
              (v) =>
                v.color === (rename?.to === c.name ? rename.from : c.name) &&
                v.size === size,
            )?.available ?? true,
        })),
      ),
    }));
  }
  async function uploadFiles(files) {
    if (uploadLock.current) return;
    const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!incoming.length) { setError("У буфері немає зображення. Скопіюй саме фото або завантаж файл."); return; }
    if (photos.length + incoming.length > 8) { setError("У кожній галереї можна зберегти до 8 фото. Видали зайві або вибери інший колір."); return; }
    if (incoming.some((file) => file.size > 8 * 1024 * 1024)) { setError("Кожне фото має бути не більшим за 8 МБ."); return; }
    const target = photoIndex;
    uploadLock.current = true;
    setUploading(true);
    setError("");
    try {
      for (const file of incoming) {
        const body = new FormData();
        body.append("image", file, file.name || "clipboard.png");
        const data = await api("/admin/upload", { method: "POST", body });
        setP((current) => updatePhotos(current, target, (images) => [...images, data.url]));
      }
    } catch (e) { setError(e.message); }
    finally { uploadLock.current = false; setUploading(false); }
  }
  async function pasteImage() {
    setError("");
    if (!navigator.clipboard?.read) { setError("Натисни Ctrl+V (або ⌘V) у вікні товару чи скористайся завантаженням файлу."); return; }
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        const type = item.types.find((type) => type.startsWith("image/"));
        if (type) files.push(await item.getType(type));
      }
      await uploadFiles(files);
    } catch { setError("Браузер не надав доступ до буфера. Спробуй Ctrl+V (⌘V) у вікні товару або завантаж файл."); }
  }
  async function save(e) {
    e.preventDefault();
    if (uploadLock.current || busy) return;
    setError("");
    setSavedMessage("");
    setBusy(true);
    try {
      await api("/admin/products/" + p.id, { method: "PUT", body: p });
      await onSave();
      setSavedMessage("Товар збережено. Можеш продовжувати редагування або закрити вікно хрестиком.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form admin-form" onSubmit={save} onChange={() => setSavedMessage("")} onPaste={(event) => {
      const files = Array.from(event.clipboardData?.items || []).filter((item) => item.kind === "file" && item.type.startsWith("image/")).map((item) => item.getAsFile()).filter(Boolean);
      if (files.length) { event.preventDefault(); if (!busy) uploadFiles(files); }
    }}>
      <div className="form-grid">
        <label>
          Назва українською
          <input required minLength={2} {...bind("name")} />
        </label>
        <label>
          Назва англійською
          <input required minLength={2} {...bind("nameEn")} />
        </label>
        <label>
          Бренд
          <select required {...bind("brand")}><option value="">Обери бренд</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select>
          <small className="muted">Нові бренди додаються в окремому розділі «Бренди».</small>
        </label>
        <label>
          Артикул
          <input required {...bind("sku")} />
        </label>
        <label>
          Адреса товару (slug)
          <input required pattern="[a-z0-9-]+" {...bind("slug")} />
        </label>
        <label>
          Категорія
          <select {...bind("category")}>
            <option value="clothing">Одяг</option>
            <option value="shoes">Взуття</option>
            <option value="accessories">Аксесуари</option>
          </select>
        </label>
        <label>
          Тип
          <select {...bind("type")}>
            {[
              ["tshirt", "Футболка"],
              ["hoodie", "Худі"],
              ["jacket", "Куртка"],
              ["trousers", "Штани"],
              ["sneakers", "Кросівки"],
              ["bag", "Сумка"],
            ].map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Сезон
          <select {...bind("season")}>
            {["літо", "зима", "демісезон", "всесезон"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Базова ціна, грн
          <input
            required
            type="number"
            min="1"
            step="0.01"
            value={p.price / 100}
            onChange={(e) =>
              setP((p) => ({
                ...p,
                price: Math.round(Number(e.target.value) * 100),
              }))
            }
          />
        </label>
        <label>
          Стара ціна, грн
          <input
            type="number"
            min="1"
            step="0.01"
            value={p.oldPrice ? p.oldPrice / 100 : ""}
            onChange={(e) =>
              setP((p) => ({
                ...p,
                oldPrice: e.target.value
                  ? Math.round(Number(e.target.value) * 100)
                  : null,
              }))
            }
          />
        </label>
      </div>
      <h3>Фото товару</h3>
      <label>Галерея для завантаження<select value={photoIndex} disabled={uploading || busy} onChange={(e) => { setPhotoColor(Number(e.target.value)); setError(""); setImageUrl(""); }}><option value={-1}>Спільні фото / обкладинка каталогу</option>{p.colors.map((color, index) => <option key={index} value={index}>{color.name} · {(color.images || []).length} фото</option>)}</select></label>
      <p className="fine">До 8 фото на кожен колір. Перше — головне для вибраного кольору. Якщо галерея кольору порожня, покупець бачить спільні фото. Перше завантажене фото також стає обкладинкою, якщо її ще немає.</p>
      <div className="admin-images">
        {photos.map((src, i) => <div className="admin-image" key={src + i}>
          <img src={src} alt={`Фото ${i + 1}`} />
          <button type="button" disabled={uploading || busy} aria-label={`Видалити фото ${i + 1}`} onClick={() => setP((current) => updatePhotos(current, photoIndex, (images) => images.filter((_, n) => n !== i)))}><X size={15} /></button>
          <button style={{ top: "auto", bottom: 0, fontSize: 12 }} type="button" disabled={uploading || busy} aria-label={`Зробити фото ${i + 1} головним`} onClick={() => setP((current) => updatePhotos(current, photoIndex, (images) => [src, ...images.filter((_, n) => n !== i)]))}>№1</button>
        </div>)}
      </div>
      <div className="photo-upload-actions">
        <label className="upload-label"><Upload size={22} />{uploading ? "Завантажуємо фото…" : "Вибрати фото"}<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading || busy || photos.length >= 8} onChange={(e) => { uploadFiles(e.target.files); e.target.value = ""; }} /></label>
        <Button type="button" kind="outline" disabled={uploading || busy || photos.length >= 8} onClick={pasteImage}>Вставити з буфера</Button>
      </div>
      <p className="fine">Або скопіюй зображення та натисни Ctrl+V / ⌘V у цьому вікні. JPG, PNG, WebP або AVIF до 8 МБ.</p>
      <div className="promo-form"><input aria-label="HTTPS-посилання на фото" placeholder="Або HTTPS-посилання на фото" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /><Button type="button" kind="outline" disabled={uploading || busy || !imageUrl || photos.length >= 8} onClick={() => { if (imageUrl.startsWith("https://")) { setP((current) => updatePhotos(current, photoIndex, (images) => [...images, imageUrl.trim()])); setImageUrl(""); } else setError("Потрібне HTTPS-посилання"); }}>Додати</Button></div>
      <h3>Кольори та розміри</h3>
      <p className="fine">
        Додай кольори й розміри. Прапорець у матриці означає, що конкретний
        варіант доступний.
      </p>
      {p.colors.map((c, i) => (
        <div className="color-edit" key={i}>
          <input
            type="color"
            aria-label={`Колір ${i + 1}`}
            value={c.hex}
            onChange={(e) =>
              rebuild(
                p.colors.map((x, n) =>
                  n === i ? { ...x, hex: e.target.value } : x,
                ),
                p.sizes,
              )
            }
          />
          <input
            aria-label={`Назва кольору ${i + 1}`}
            value={c.name}
            required
            onChange={(e) =>
              rebuild(
                p.colors.map((x, n) =>
                  n === i ? { ...x, name: e.target.value } : x,
                ),
                p.sizes,
                { from: c.name, to: e.target.value },
              )
            }
          />
          <button
            type="button"
            className="icon-button"
            disabled={p.colors.length === 1}
            aria-label="Видалити колір"
            onClick={() =>
              rebuild(
                p.colors.filter((_, n) => n !== i),
                p.sizes,
              )
            }
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-link"
        onClick={() =>
          rebuild(
            [
              ...p.colors,
              { name: "Новий колір " + (p.colors.length + 1), hex: "#2855ec" },
            ],
            p.sizes,
          )
        }
      >
        <Plus size={17} />
        Додати колір
      </button>
      <h3>Розміри та ціни</h3>
      <p className="fine">Познач розміри та впиши ціну біля кожного. Ціна розміру однакова для всіх кольорів. Порожнє поле використовує базову ціну.</p>
      <div className="size-price-list">
        {[...new Set([...(p.category === "clothing" ? ["S", "M", "L", "XL", "XXL"] : p.category === "shoes" ? ["39", "40", "41", "42", "43", "44", "45", "46"] : ["ONE SIZE"]), ...p.sizes])].map((size) => {
          const enabled = p.sizes.includes(size);
          return <div className={"size-price-row" + (enabled ? " enabled" : "")} key={size}>
            <label className="check-label"><input type="checkbox" aria-label={`Розмір ${size}`} checked={enabled} disabled={uploading || busy || (enabled && p.sizes.length === 1)} onChange={(e) => rebuild(p.colors, e.target.checked ? [...p.sizes, size] : p.sizes.filter((value) => value !== size))} /><strong>{size}</strong></label>
            <label className="size-price-field"><span>Ціна, грн</span><input type="number" min="1" max="1000000" step="0.01" aria-label={`Ціна розміру ${size}, грн`} disabled={!enabled || busy} placeholder={String(p.price / 100)} value={Object.hasOwn(p.sizePrices || {}, size) ? p.sizePrices[size] / 100 : ""} onChange={(e) => { const value = e.target.value; setP((current) => { const prices = { ...current.sizePrices }; if (value === "") delete prices[size]; else prices[size] = Math.round(Number(value) * 100); return { ...current, sizePrices: prices }; }); }} /></label>
          </div>;
        })}
      </div>
      <div className="promo-form"><input aria-label="Інший розмір" placeholder="Інший розмір: XS, 48…" maxLength={30} value={customSize} onChange={(e) => setCustomSize(e.target.value)} /><Button type="button" kind="outline" disabled={!customSize.trim() || busy || uploading || p.sizes.length >= 30} onClick={() => { const size = customSize.trim().toUpperCase(); if (!p.sizes.includes(size)) rebuild(p.colors, [...p.sizes, size]); setCustomSize(""); }}>Додати розмір</Button></div>
      <h3>Наявність за кольорами</h3>
      <div className="variant-table">
        {p.variants.map((v, i) => (
          <label key={v.color + "|" + v.size} className="check-label">
            <input
              type="checkbox"
              checked={v.available}
              onChange={(e) =>
                setP((p) => ({
                  ...p,
                  variants: p.variants.map((x, n) =>
                    n === i ? { ...x, available: e.target.checked } : x,
                  ),
                }))
              }
            />
            {v.color} / {v.size}
          </label>
        ))}
      </div>
      <div className="form-grid">
        <label>
          Склад
          <input {...bind("composition")} />
        </label>
        <label>
          Посадка
          <input {...bind("fit")} />
        </label>
      </div>
      <label>
        Опис українською
        <textarea required minLength={10} {...bind("description")} />
      </label>
      <label>
        Опис англійською
        <textarea required minLength={10} {...bind("descriptionEn")} />
      </label>
      <label>
        Заміри / таблиця розмірів
        <textarea {...bind("sizeGuide")} />
      </label>
      <div className="form-grid">
        <label>
          Позначка
          <select {...bind("badge")}>
            <option value="">Без позначки</option>
            <option value="new">Новинка</option>
            <option value="hit">Бестселер</option>
            <option value="last">Останні розміри</option>
          </select>
        </label>
        <label>
          Пріоритет у каталозі
          <input
            type="number"
            min="0"
            max="1000000"
            {...bind("popularity", true)}
          />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={p.active}
          onChange={(e) => setP((p) => ({ ...p, active: e.target.checked }))}
        />
        Показувати у каталозі
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={p.demo}
          onChange={(e) => setP((p) => ({ ...p, demo: e.target.checked }))}
        />
        Демонстраційний зразок (приховається після відкриття продажів)
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-save">
        {savedMessage && <p className="saved-message" role="status">{savedMessage}</p>}
        <Button type="submit" busy={busy} disabled={uploading}>
          <Save size={17} />
          Зберегти товар
        </Button>
      </div>
    </form>
  );
}
function OrderEditor({ order, onSave, onClose }) {
  const [status, setStatus] = useState(order.status),
    [tracking, setTracking] = useState(order.tracking || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <div className="notice">
        {order.demo
          ? "Демо-замовлення. Листи та бонуси вимкнено."
          : "Реальне замовлення. Зміна статусу «Отримано» нараховує бонуси один раз."}
      </div>
      <p>
        <b>{order.name}</b> · {order.email} · {order.phone}
      </p>
      <p>
        {order.delivery.city}, {order.delivery.address} (
        {order.delivery.carrier})
      </p>
      <p>{order.comment}</p>
      {order.returnReason && (
        <p className="notice">Повернення: {order.returnReason}</p>
      )}
      {order.quote.lines.map((l, i) => (
        <div className="checkout-item" key={i}>
          <img src={l.image} alt={l.name} />
          <div>
            <strong>{l.brand}</strong>
            <p>{l.name}</p>
            <small>
              {l.color} / {l.size} × {l.quantity}
            </small>
          </div>
          <b>{money(l.total)}</b>
        </div>
      ))}
      <div className="summary-line total">
        <span>Разом</span>
        <b>{money(order.quote.total)}</b>
      </div>
      <form
        className="admin-order-tools"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/admin/orders/" + order.id, {
              method: "PUT",
              body: { status, tracking },
            });
            await onSave();
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <select
          aria-label="Статус замовлення"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {[order.status, ...next[order.status]].map((s) => (
            <option key={s} value={s}>
              {statusNames[s]}
            </option>
          ))}
        </select>
        <input
          aria-label="Номер ТТН"
          placeholder="Номер ТТН"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
        <Button busy={busy}>Зберегти</Button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
function SettingsForm({ data, onSave }) {
  const [s, setS] = useState(data.settings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = (key, label, multi = false) => {
    const Tag = multi ? "textarea" : "input";
    return (
      <label key={key}>
        {label}
        <Tag
          value={s[key]}
          onChange={(e) => setS((s) => ({ ...s, [key]: e.target.value }))}
        />
      </label>
    );
  };
  const flag = (key, label) => (
    <label className="check-label" key={key}>
      <input
        type="checkbox"
        checked={s[key]}
        onChange={(e) => setS((s) => ({ ...s, [key]: e.target.checked }))}
      />
      {label}
    </label>
  );
  return (
    <form
      className="form admin-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api("/admin/settings", { method: "PUT", body: s });
          await onSave();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="settings-grid">
        <section className="settings-panel">
          <h3>Вітрина</h3>
          <div className="form">
            {input("storeName", "Назва магазину")}
            {input("headline", "Заголовок головної — UA", true)}
            {input("headlineEn", "Заголовок головної — EN", true)}
            {input("heroText", "Текст головної — UA", true)}
            {input("heroTextEn", "Текст головної — EN", true)}
            <label>
              Товар на головному банері
              <select
                value={s.heroProductId || ""}
                onChange={(e) => setS({ ...s, heroProductId: e.target.value })}
              >
                <option value="">Автоматично з доступних товарів</option>
                {data.products
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} — {p.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </section>
        <section className="settings-panel">
          <h3>Контакти</h3>
          <div className="form">
            {input("supportEmail", "Email для покупців")}
            {input("phone", "Телефон")}
            {input("telegram", "Telegram — HTTPS-посилання")}
            {input("instagram", "Instagram — HTTPS-посилання")}
            {input("viber", "Viber — HTTPS-посилання")}
            {input("whatsapp", "WhatsApp — HTTPS-посилання")}
            {input("sellerDetails", "Реквізити продавця", true)}
          </div>
        </section>
        <section className="settings-panel">
          <h3>Доставка й бонуси</h3>
          <div className="form">
            <label>
              Безкоштовна доставка від, грн
              <input
                type="number"
                min="0"
                value={s.freeShipping / 100}
                onChange={(e) =>
                  setS((s) => ({
                    ...s,
                    freeShipping: Math.round(Number(e.target.value) * 100),
                  }))
                }
              />
            </label>
            <label>
              Нарахування бонусів, %
              <input
                type="number"
                min="0"
                max="10"
                value={s.bonusPercent}
                onChange={(e) =>
                  setS((s) => ({ ...s, bonusPercent: Number(e.target.value) }))
                }
              />
            </label>
            <label>
              Максимальна оплата бонусами, %
              <input
                type="number"
                min="0"
                max="50"
                value={s.bonusSpendPercent}
                onChange={(e) =>
                  setS((s) => ({
                    ...s,
                    bonusSpendPercent: Number(e.target.value),
                  }))
                }
              />
            </label>
            {input("deliveryText", "Доставка — UA", true)}
            {input("deliveryTextEn", "Доставка — EN", true)}
          </div>
          <p className="notice">
            Знижка за кількість фіксована: від 5 речей 5%, кожна наступна +1%,
            максимум 20%. Поріг доставки рахується від суми товарів після всіх
            знижок і бонусів.
          </p>
        </section>
        <section className="settings-panel">
          <h3>Аналітика та підписка</h3>
          <div className="form">
            {flag(
              "newsletterEnabled",
              "Дозволити підписку на новини (збереження email)",
            )}
            {flag(
              "analyticsEnabled",
              "Увімкнути аналітику після згоди відвідувача",
            )}
            {input("gaId", "Google Analytics — G-…")}
            {input("metaPixelId", "Meta Pixel ID")}
            {input("tiktokPixelId", "TikTok Pixel ID")}
          </div>
          <p className="notice">
            Поки вимкнено — жодних пікселів. Увімкнення показує відвідувачу
            вибір згоди. Розсилки автоматично не надсилаються; база підписників
            зберігається окремо.
          </p>
        </section>
        {[
          ["returnsText", "Повернення"],
          ["privacyText", "Конфіденційність"],
          ["termsText", "Умови покупки"],
        ].map(([key, label]) => (
          <section className="settings-panel" key={key}>
            <h3>{label}</h3>
            <div className="form">
              {input(key, label + " — UA", true)}
              {input(key + "En", label + " — EN", true)}
            </div>
          </section>
        ))}
        <section className="settings-panel">
          <h3>Відкриття магазину</h3>
          <div className="form">
            {flag(
              "policiesApproved",
              "Перевірено й затверджено умови, повернення та політику даних",
            )}
            {flag("shopLive", "Увімкнути реальні продажі")}
            {flag("seoIndex", "Дозволити індексацію пошуковим системам")}
          </div>
          <p className="notice">
            Продажі відкриються лише після налаштування пошти, контактів, умов і
            хоча б одного реального товару. Демонстраційні товари автоматично
            зникнуть з вітрини.
          </p>
        </section>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-save">
        <Button busy={busy}>
          <Save size={18} />
          Зберегти налаштування
        </Button>
      </div>
    </form>
  );
}
function Promos({ data, onSave }) {
  const [code, setCode] = useState(""),
    [percent, setPercent] = useState(10),
    [min, setMin] = useState(0),
    [limit, setLimit] = useState(0),
    [expires, setExpires] = useState(""),
    [active, setActive] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Код</th>
              <th>Знижка</th>
              <th>Від суми</th>
              <th>Ліміт</th>
              <th>Термін</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.promos.map((p) => (
              <tr key={p.code}>
                <td>{p.code}</td>
                <td>{p.percent}%</td>
                <td>{money(p.min_total)}</td>
                <td>{p.max_uses || "Без ліміту"}</td>
                <td>{p.expires?.slice(0, 10) || "Без дати"}</td>
                <td>{p.active ? "Активний" : "Вимкнений"}</td>
                <td>
                  <button
                    className="text-link"
                    onClick={() => {
                      setCode(p.code);
                      setPercent(p.percent);
                      setMin(p.min_total / 100);
                      setLimit(p.max_uses);
                      setExpires(p.expires?.slice(0, 10) || "");
                      setActive(Boolean(p.active));
                    }}
                  >
                    Редагувати
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="form admin-form"
        style={{ marginTop: 30 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/admin/promos/" + code.toUpperCase(), {
              method: "PUT",
              body: {
                percent,
                min_total: Math.round(min * 100),
                max_uses: limit,
                expires: expires
                  ? new Date(expires + "T23:59:59+03:00").toISOString()
                  : null,
                active,
              },
            });
            await onSave();
            setCode("");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Створити / змінити промокод</h3>
        <div className="form-grid">
          <label>
            Код
            <input
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9-]+"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <label>
            Знижка, %
            <input
              type="number"
              min="1"
              max="50"
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
            />
          </label>
          <label>
            Мінімальна сума, грн
            <input
              type="number"
              min="0"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
            />
          </label>
          <label>
            Максимум використань (0 — без ліміту)
            <input
              type="number"
              min="0"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </label>
          <label>
            Діє до
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Активний
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button busy={busy}>Зберегти промокод</Button>
      </form>
    </>
  );
}
function BrandManager({ data, onSave }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/admin/brands" + (editing ? "/" + encodeURIComponent(editing) : ""), { method: editing ? "PUT" : "POST", body: { name: name.trim() } });
      await onSave(); setName(""); setEditing(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(brand) {
    setBusy(true); setError("");
    try { await api("/admin/brands/" + encodeURIComponent(brand), { method: "DELETE" }); await onSave(); setRemoving(null); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="brand-manager">
    <h2>Бренди магазину</h2>
    <p className="muted">Доданий бренд одразу з’явиться у списку вибору товару та на сторінці брендів. Перейменування оновлює всі його товари.</p>
    <form className="brand-form form" onSubmit={save}>
      <label>{editing ? "Нова назва бренду" : "Назва нового бренду"}<input required maxLength={80} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} placeholder="Наприклад, Prada" /></label>
      <Button busy={busy} disabled={!name.trim()}>{editing ? "Зберегти назву" : "Додати бренд"}</Button>
      {editing && <Button type="button" kind="outline" disabled={busy} onClick={() => { setEditing(null); setName(""); }}>Скасувати перейменування</Button>}
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="brand-manager-list">{(data.brands || []).map((brand) => {
      const count = data.products.filter((p) => p.brand === brand).length;
      return <div className="brand-manager-row" key={brand}>
        <div><strong>{brand}</strong><small>{count} товарів, включно з прихованими</small></div>
        <div className="brand-row-actions">
          <Button kind="outline" disabled={busy} onClick={() => { setEditing(brand); setName(brand); setError(""); setRemoving(null); }}>Перейменувати</Button>
          {removing === brand ? <><Button disabled={busy} onClick={() => remove(brand)}>Підтвердити видалення</Button><Button kind="outline" disabled={busy} onClick={() => setRemoving(null)}>Залишити</Button></> : <Button kind="outline" disabled={busy || count > 0} title={count ? "Спочатку зміни бренд у його товарах" : "Видалити порожній бренд"} onClick={() => setRemoving(brand)}>Видалити</Button>}
        </div>
      </div>;
    })}</div>
  </section>;
}
export default function Admin() {
  const { user, t, refresh, setToast } = useShop();
  const route = useRoute();
  const requestedTab = new URLSearchParams(route.split("?")[1] || "").get("tab");
  const tab = ["overview", "products", "brands", "orders", "customers", "promos", "settings", "mail", "newsletter"].includes(requestedTab) ? requestedTab : "products";
  const setTab = (value) => navigate("/admin?tab=" + value);
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("");
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState(null),
    [order, setOrder] = useState(null);
  async function load() {
    try {
      setData(await api("/admin"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  async function saved() {
    await load();
    await refresh();
    setToast("Зміни збережено");
  }
  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.id, user?.isAdmin]);
  if (!user)
    return (
      <main className="wrap account-login">
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          SNAP ADMIN
        </p>
        <Login />
        <div className="notice">
          {t(
            "Увійди з поштою адміністратора, щоб додавати товари та керувати магазином.",
            "Sign in with your administrator email to manage products and the store.",
          )}
        </div>
      </main>
    );
  if (!user.isAdmin)
    return (
      <main className="wrap">
        <Empty
          icon={ShieldCheck}
          title={t("Доступ обмежено", "Access restricted")}
          text={t(
            `Ти увійшов як ${user.email}. Для цієї пошти доступ до керування не налаштовано. Режим демо не обмежує права адміністратора.`,
            `Signed in as ${user.email}. This email does not have administrator access. Demo mode does not restrict administrator permissions.`,
          )}
          action={<div className="admin-access-actions"><Button onClick={async () => { try { await refresh(); } catch (e) { setToast(e.message); } }}>{t("Оновити доступ", "Refresh access")}</Button><Button kind="outline" onClick={async () => { try { await api("/auth/logout", { method: "POST", body: {} }); await refresh(); } catch (e) { setToast(e.message); } }}>{t("Увійти з іншої пошти", "Use another email")}</Button></div>}
        />
      </main>
    );
  if (!data)
    return (
      <main className="wrap">
        <Empty
          title={error || "Завантаження адмін-панелі…"}
          action={error && <Button onClick={load}>Повторити</Button>}
        />
      </main>
    );
  const gross = data.orders
    .filter((o) => !o.demo && o.status === "delivered")
    .reduce((s, o) => s + o.quote.total, 0);
  function newProduct() {
    const base = { brand: "", category: "clothing", type: "tshirt", description: "", descriptionEn: "", composition: "", fit: "", season: "всесезон", sizeGuide: "" };
    const id = "p-" + createId().slice(0, 8);
    setEdit({
      ...base,
      id,
      slug: "new-" + id,
      name: "Новий товар",
      nameEn: "New product",
      sku: "SN-" + id,
      images: [],
      price: 100000,
      oldPrice: null,
      colors: [{ name: "Чорний", hex: "#202126" }],
      sizes: ["S", "M", "L"],
      variants: ["S", "M", "L"].map((size) => ({
        size,
        color: "Чорний",
        available: true,
      })),
      badge: "new",
      demo: false,
      active: false,
      createdAt: new Date().toISOString(),
      popularity: 0,
    });
  }
  const visibleProducts = data.products.filter((p) =>
    (!brandFilter || p.brand === brandFilter) &&
    (statusFilter === "all" || (statusFilter === "real" && !p.demo) || (statusFilter === "demo" && p.demo) || (statusFilter === "hidden" && !p.active)) &&
    (p.name + " " + p.brand + " " + p.sku).toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <main className="wrap admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">SNAP / АДМІНІСТРАТОР</p>
          <h1>Керування магазином</h1>
          <p className="muted admin-identity">{user.email} · Повний доступ</p>
        </div>
        <Button kind="outline" onClick={load}>
          <RefreshCw size={16} />
          Оновити
        </Button>
      </div>
      {!data.settings.shopLive && <div className="admin-setup-banner">
        <div><strong>Магазин готується до відкриття</strong><p>Ти можеш додавати та редагувати все вже зараз. Демо — це режим вітрини: продажі відкриваються окремо, після наповнення.</p></div>
        <Button kind="outline" onClick={() => setTab("overview")}>Що залишилось до запуску</Button>
      </div>}
      <div className="admin-tabs" aria-label="Розділи керування">
        {[
          ["overview", "Огляд"],
          ["products", "Товари"],
          ["brands", "Бренди"],
          ["orders", "Замовлення"],
          ["customers", "Клієнти"],
          ["promos", "Промокоди"],
          ["settings", "Налаштування"],
          ["mail", "Пошта"],
          ["newsletter", "Підписники"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {tab === "overview" && (
        <>
          <div className="admin-metrics">
            <div>
              <span>Отримані реальні покупки</span>
              <b>{money(gross)}</b>
            </div>
            <div>
              <span>Реальні замовлення</span>
              <b>{data.orders.filter((o) => !o.demo).length}</b>
            </div>
            <div>
              <span>Товарів у базі</span>
              <b>{data.products.length}</b>
            </div>
            <div>
              <span>Клієнтів</span>
              <b>{data.customers.length}</b>
            </div>
          </div>
          <div className="admin-quick-actions"><Button onClick={newProduct}><Plus size={18} />Додати товар</Button><Button kind="outline" onClick={() => setTab("settings")}><Settings size={18} />Налаштувати магазин</Button><Link className="button outline" to="/">Переглянути вітрину<ArrowUpRight size={18} /></Link></div>
          <h2>Готовність до запуску</h2>
          <div className="readiness">
            {[
              ["Поштовий сервіс", data.readiness.mail],
              ["Email для замовлень", data.readiness.orderEmail],
              [
                "Реальні товари",
                data.products.some((p) => p.active && !p.demo),
              ],
              ["Реквізити продавця", Boolean(data.settings.sellerDetails)],
              ["Контактний email", Boolean(data.settings.supportEmail)],
              ["Умови затверджено", data.settings.policiesApproved],
              [
                "Шлях до постійного сховища задано",
                data.readiness.persistentData,
              ],
              ["AI-провайдер", data.readiness.ai],
              ["Продажі відкрито", data.settings.shopLive],
            ].map(([label, ok]) => (
              <div key={label} className={ok ? "ready" : ""}>
                {ok ? <Check size={19} /> : <X size={19} />}
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="notice">
            AI — необов’язкове підключення: без нього працює чесно позначений
            підбір за правилами та 3D-силует. Шлях DATA_DIR сам по собі не
            підтверджує підключення Volume — це потрібно перевірити в Railway.
            Адмін-панель українською.
          </p>
          <h3>Останні дії</h3>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Дія</th>
                  <th>Об’єкт</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.slice(0, 12).map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString("uk-UA")}</td>
                    <td>{a.action}</td>
                    <td>{a.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "products" && (
        <>
          <div className="admin-toolbar">
            <input
              placeholder="Назва, бренд або артикул…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Пошук товару в адмінці"
            />
            <Button onClick={newProduct}>
              <Plus size={18} />
              Додати товар
            </Button>
          </div>
          <div className="admin-product-filters">
            <label>Статус<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Усі товари</option><option value="real">Реальні товари</option><option value="demo">Демонстраційні</option><option value="hidden">Приховані</option></select></label>
            <label>Бренд<select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}><option value="">Усі бренди</option>{[...new Set(data.products.map((p) => p.brand))].sort().map((brand) => <option key={brand}>{brand}</option>)}</select></label>
            <span className="muted">{data.products.length} товарів у базі · {data.products.filter((p) => !p.demo).length} реальних</span>
          </div>
          {!visibleProducts.length && <Empty title="Товарів не знайдено" text="Додай новий товар або зміни фільтри." action={<Button kind="outline" onClick={() => { setQuery(""); setBrandFilter(""); setStatusFilter("all"); }}>Скинути фільтри</Button>} />}
          <div className="table-scroll admin-products-scroll">
            <table className="admin-table admin-products-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Ціна</th>
                  <th>Статус</th>
                  <th>Варіанти</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleProducts
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="product-cell">
                        <img src={p.images[0]} alt="" />
                        <span>
                          <strong>{p.brand}</strong>
                          <small>{p.name}</small>
                          <small>{p.sku}</small>
                        </span>
                      </td>
                      <td data-label="Ціна"><ProductPrice product={p} /></td>
                      <td>
                        <span className="admin-status">
                          {p.active ? "У каталозі" : "Приховано"}
                        </span>
                        <span className="admin-status">{p.demo ? "Демонстраційний" : "Реальний товар"}</span>
                      </td>
                      <td data-label="Доступні варіанти">
                        {p.variants.filter((v) => v.available).length} /{" "}
                        {p.variants.length}
                      </td>
                      <td>
                        <Button kind="outline" onClick={() => setEdit(p)}>
                          Редагувати
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "brands" && <BrandManager data={data} onSave={saved} />}
      {tab === "orders" && (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Замовлення</th>
                <th>Покупець</th>
                <th>Сума</th>
                <th>Статус</th>
                <th>Дата</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.id}
                    {o.demo && <small> · DEMO</small>}
                  </td>
                  <td>
                    {o.name}
                    <br />
                    {o.email}
                  </td>
                  <td>{money(o.quote.total)}</td>
                  <td>{statusNames[o.status]}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString("uk-UA")}</td>
                  <td>
                    <Button kind="outline" onClick={() => setOrder(o)}>
                      Відкрити
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.orders.length && <Empty title="Ще немає замовлень" />}
        </div>
      )}
      {tab === "customers" && (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ім’я</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Дата реєстрації</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name || "—"}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{new Date(c.created_at).toLocaleDateString("uk-UA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "promos" && <Promos data={data} onSave={saved} />}{" "}
      {tab === "settings" && <SettingsForm data={data} onSave={saved} />}{" "}
      {tab === "mail" && (
        <>
          <p className="notice">
            Листи реальних замовлень зберігаються в черзі. Тимчасові помилки
            повторюються автоматично до 8 спроб. Після цього можна повторити
            вручну.
          </p>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Одержувач</th>
                  <th>Тема</th>
                  <th>Статус</th>
                  <th>Спроб</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.mail.map((m) => (
                  <tr key={m.id}>
                    <td>{m.recipient}</td>
                    <td>{m.subject}</td>
                    <td>{m.status}</td>
                    <td>{m.attempts}</td>
                    <td>
                      {m.status === "failed" && (
                        <Button
                          kind="outline"
                          onClick={async () => {
                            try {
                              await api("/admin/mail/" + m.id + "/retry", {
                                method: "POST",
                                body: {},
                              });
                              await load();
                            } catch (e) {
                              setToast(e.message);
                            }
                          }}
                        >
                          Повторити
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "newsletter" && (
        <>
          <p className="notice">
            Тільки користувачі, які окремо погодилися на новини. Автоматичне
            надсилання маркетингових листів не підключено.
          </p>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Дата</th>
                  <th>Згода</th>
                </tr>
              </thead>
              <tbody>
                {data.newsletter.map((n) => (
                  <tr key={n.email}>
                    <td>{n.email}</td>
                    <td>{new Date(n.created_at).toLocaleString("uk-UA")}</td>
                    <td>{n.consent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title="Редагування товару"
        closeOnly
        wide
      >
        {edit && (
          <ProductEditor
            key={edit.id}
            product={edit}
            brands={data.brands || []}
            onSave={saved}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(order)}
        onClose={() => setOrder(null)}
        title={order?.id || "Замовлення"}
        wide
      >
        {order && (
          <OrderEditor
            key={order.id}
            order={order}
            onSave={saved}
            onClose={() => setOrder(null)}
          />
        )}
      </Modal>
    </main>
  );
}
