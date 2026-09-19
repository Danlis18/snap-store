import React, { useState, useEffect } from "react";
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
import { api, useShop, money, Link } from "../core";
import { Button, Login, Modal, Empty } from "../components";
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
function ProductEditor({ product, onSave, onClose }) {
  const [p, setP] = useState(structuredClone(product)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [imageUrl, setImageUrl] = useState(""),
    [sizesText, setSizesText] = useState(product.sizes.join(", "));
  const bind = (key, number = false) => ({
    value: p[key] ?? "",
    onChange: (e) =>
      setP((p) => ({
        ...p,
        [key]: number ? Number(e.target.value) : e.target.value,
      })),
  });
  function rebuild(colors, sizes, rename = null) {
    setP((p) => ({
      ...p,
      colors,
      sizes,
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
  async function upload(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const data = await api("/admin/upload", { method: "POST", body });
      setP((p) => ({ ...p, images: [...p.images, data.url].slice(0, 8) }));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/admin/products/" + p.id, { method: "PUT", body: p });
      await onSave();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form admin-form" onSubmit={save}>
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
          <input required {...bind("brand")} />
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
          Ціна, грн
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
      <p className="fine">
        До 8 фото. Перше — головне. Видали демонстраційні фото перед публікацією
        реального товару. Завантаження: JPG, PNG, WebP або AVIF до 8 МБ.
      </p>
      <div className="admin-images">
        {p.images.map((src, i) => (
          <div className="admin-image" key={src + i}>
            <img src={src} alt={`Фото ${i + 1}`} />
            <button
              type="button"
              aria-label={`Видалити фото ${i + 1}`}
              onClick={() =>
                setP((p) => ({
                  ...p,
                  images: p.images.filter((_, n) => n !== i),
                }))
              }
            >
              <X size={15} />
            </button>
            <button
              style={{ top: "auto", bottom: 0, fontSize: 11 }}
              type="button"
              aria-label={`Зробити фото ${i + 1} головним`}
              onClick={() =>
                setP((p) => ({
                  ...p,
                  images: [src, ...p.images.filter((_, n) => n !== i)],
                }))
              }
            >
              №1
            </button>
          </div>
        ))}
      </div>
      <label className="upload-label">
        <Upload size={22} />
        {uploading ? "Оптимізуємо фото…" : "Завантажити власне фото"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading || p.images.length >= 8}
          onChange={(e) => upload(e.target.files[0])}
        />
      </label>
      <div className="promo-form">
        <input
          aria-label="HTTPS-посилання на фото"
          placeholder="Або HTTPS-посилання на фото"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <Button
          type="button"
          kind="outline"
          disabled={!imageUrl || p.images.length >= 8}
          onClick={() => {
            if (imageUrl.startsWith("https://")) {
              setP((p) => ({ ...p, images: [...p.images, imageUrl] }));
              setImageUrl("");
            } else setError("Потрібне HTTPS-посилання");
          }}
        >
          Додати
        </Button>
      </div>
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
      <label>
        Розміри через кому
        <input
          value={sizesText}
          onChange={(e) => setSizesText(e.target.value)}
          onBlur={() => {
            const sizes = [
              ...new Set(
                sizesText
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              ),
            ];
            if (sizes.length) rebuild(p.colors, sizes);
          }}
        />
      </label>
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
        Демонстраційний товар (не продається в бойовому режимі)
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-save">
        <Button type="button" kind="outline" onClick={onClose}>
          Скасувати
        </Button>
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
export default function Admin() {
  const { user, t, refresh, setToast } = useShop();
  const [data, setData] = useState(null),
    [tab, setTab] = useState("overview"),
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
  }, [user?.id]);
  if (!user)
    return (
      <main className="wrap account-login">
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          SNAP ADMIN
        </p>
        <Login />
        <div className="notice">
          {t(
            "Увійди з email, доданим власником до ADMIN_EMAILS у Railway.",
            "Sign in with an email listed by the owner in Railway ADMIN_EMAILS.",
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
            "Цей акаунт не має прав адміністратора.",
            "This account does not have administrator access.",
          )}
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
    const base = structuredClone(data.products[0]);
    const id = "p-" + crypto.randomUUID().slice(0, 8);
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
      demo: true,
      active: false,
      createdAt: new Date().toISOString(),
      popularity: 0,
    });
  }
  return (
    <main className="wrap admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">SNAP / CONTROL ROOM</p>
          <h1>Твій магазин. Усе під контролем.</h1>
        </div>
        <Button kind="outline" onClick={load}>
          <RefreshCw size={16} />
          Оновити
        </Button>
      </div>
      <div className="admin-tabs">
        {[
          ["overview", "Огляд"],
          ["products", "Товари"],
          ["orders", "Замовлення"],
          ["customers", "Клієнти"],
          ["promos", "Промокоди"],
          ["settings", "Налаштування"],
          ["mail", "Пошта"],
          ["newsletter", "Підписники"],
        ].map(([key, label]) => (
          <button
            key={key}
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
          <div className="table-scroll">
            <table className="admin-table">
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
                {data.products
                  .filter((p) =>
                    (p.name + " " + p.brand + " " + p.sku)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
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
                      <td>{money(p.price)}</td>
                      <td>
                        <span className="admin-status">
                          {p.active ? "У каталозі" : "Приховано"}
                        </span>
                        {p.demo && <span className="admin-status">DEMO</span>}
                      </td>
                      <td>
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
        wide
      >
        {edit && (
          <ProductEditor
            key={edit.id}
            product={edit}
            onSave={saved}
            onClose={() => setEdit(null)}
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
