import { sizePrice, priceRange } from "../shared/product-pricing.js";
import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Heart,
  Plus,
  Minus,
  ArrowUpRight,
  ShoppingBag,
  Check,
  Truck,
  ArrowRight,
  Mail,
  LoaderCircle,
} from "lucide-react";
import { api, Link, money, navigate, useShop } from "./core";
import { productImages } from "../shared/product-media.js";
export function CarrierLogo({ carrier }) {
  const logo = {
    nova: ["nova-poshta.png", "Нова пошта"],
    ukrposhta: ["ukrposhta.png", "Укрпошта"],
  }[carrier];
  return logo ? (
    <span className={`carrier-logo ${carrier}`} aria-hidden="true">
      <img src={`/carriers/${logo[0]}`} alt="" width={carrier === "nova" ? 32 : 17} height={carrier === "nova" ? 32 : 24} />
    </span>
  ) : <Truck size={20} aria-hidden="true" />;
}
export function Carriers({ className = "" }) {
  const { t } = useShop();
  return <div className={`carriers ${className}`}>
    <span><CarrierLogo carrier="nova" />{t("Нова пошта", "Nova Poshta")}</span>
    <span><CarrierLogo carrier="ukrposhta" />{t("Укрпошта", "Ukrposhta")}</span>
  </div>;
}
export function CountBadge({ count }) {
  if (count < 1) return null;
  return <span className="counter" aria-hidden="true">{count > 99 ? "99+" : count}</span>;
}
export function Button({
  children,
  kind = "",
  className = "",
  busy = false,
  ...props
}) {
  return (
    <button
      className={`button ${kind} ${className}`}
      {...props}
      disabled={busy || props.disabled}
    >
      {busy ? <LoaderCircle className="spin" size={18} /> : null}
      {children}
    </button>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  drawer = false,
  wide = false,
  closeOnly = false,
}) {
  const ref = useRef();
  useEffect(() => {
    if (open) {
      if (!ref.current.open) ref.current.showModal();
      document.body.style.overflow = "hidden";
    } else if (ref.current.open) ref.current.close();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialog ${drawer ? "drawer" : ""} ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        if (!closeOnly) onClose();
      }}
      onClick={(e) => {
        if (!closeOnly && e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="dialog-inner">
        <header className="dialog-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Закрити / Close"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        {open ? children : null}
      </div>
    </dialog>
  );
}
export function Empty({ icon: Icon = ShoppingBag, title, text, action }) {
  return (
    <div className="empty">
      <Icon size={42} strokeWidth={1} />
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function ProductPrice({ product, size, color, old = false }) {
  const { t, lang } = useShop();
  const range = priceRange(product, color);
  const amount = size ? sizePrice(product, size) : range.min;
  return <>{!size && range.min !== range.max ? t("від ", "from ") : ""}{money(amount, lang)}{old && product.oldPrice > (size ? amount : range.max) && <> <del>{money(product.oldPrice, lang)}</del></>}</>;
}
export function ProductCard({ product: p }) {
  const { wishlist, t, lang, toggleWish, setQuick } = useShop();
  const selected = wishlist?.includes(p.id);
  const range = priceRange(p);
  const off = p.oldPrice && range.min === range.max ? Math.round((1 - range.min / p.oldPrice) * 100) : 0;
  return (
    <article className="product-card">
      <div className="product-visual">
        <Link to={"/product/" + p.slug} aria-label={`${p.brand} ${p.name}`}>
          <img
            src={p.images[0]}
            alt={`${p.brand}: ${lang === "uk" ? p.name : p.nameEn}${p.demo ? t(" — демонстраційне фото", " — demo image") : ""}`}
            loading="lazy"
            width="600"
            height="600"
          />
          {p.images[1] && (
            <img
              className="second-image"
              src={p.images[1]}
              alt=""
              loading="lazy"
            />
          )}
        </Link>
        <div className="badges">
          {p.badge && (
            <span className={p.badge === "new" ? "blue" : ""}>
              {p.badge === "new"
                ? "NEW"
                : p.badge === "hit"
                  ? "BESTSELLER"
                  : t("ОСТАННІ РОЗМІРИ", "LAST SIZES")}
            </span>
          )}
          {off > 0 && <span className="sale-badge">−{off}%</span>}
        </div>
        <button
          className={`icon-button wish ${selected ? "selected" : ""}`}
          aria-label={
            selected
              ? t("Прибрати з обраного", "Remove from wishlist")
              : t("Додати в обране", "Add to wishlist")
          }
          aria-pressed={selected}
          onClick={() => toggleWish(p)}
        >
          <Heart size={20} fill={selected ? "currentColor" : "none"} />
        </button>
        <button className="quick-add" onClick={() => setQuick(p)}>
          <Plus size={17} />
          {t("Швидкий вибір", "Quick add")}
        </button>
      </div>
      <div className="product-info">
        <Link to={"/product/" + p.slug}>
          <h3>{p.brand}</h3>
          <p>{lang === "uk" ? p.name : p.nameEn}</p>
        </Link>
        <div className="price">
          <ProductPrice product={p} old />
        </div>
        <div className="card-bottom">
          <div className="swatches">
            {p.colors.map((c) => (
              <span key={c.name} title={c.name} style={{ background: c.hex }} />
            ))}
          </div>
          <span>
            {t("Репліка", "Replica")}
            {p.demo ? " · DEMO" : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
export function ProductGrid({ products }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function VariantPicker({ product: p, onAdded, compact = false, onColorChange, onSizeChange }) {
  const { t, lang, addToCart, setToast, toggleWish, wishlist } = useShop();
  const [color, setColor] = useState(p.colors[0]?.name),
    [size, setSize] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const valid = (s) =>
    p.variants.some((v) => v.color === color && v.size === s && v.available);
  async function add() {
    if (!size || !valid(size)) {
      setError(
        t("Спочатку обери доступний розмір", "Select an available size first"),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addToCart(p, color, size);
      onAdded?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="variant-picker">
      <div className="field-label">
        {t("Колір", "Colour")}: <strong>{color}</strong>
      </div>
      <div className="color-picker">
        {p.colors.map((c) => (
          <button
            key={c.name}
            style={{ "--swatch": c.hex }}
            className={color === c.name ? "active" : ""}
            aria-label={c.name}
            aria-pressed={color === c.name}
            onClick={() => {
              setColor(c.name);
              setSize("");
              setError("");
              onColorChange?.(c.name);
              onSizeChange?.("");
            }}
          >
            <span />
          </button>
        ))}
      </div>
      <div className="field-label">
        {t("Розмір", "Size")}
        <span>{t("Обери свій", "Choose yours")}</span>
      </div>
      <div className="sizes">
        {p.sizes.map((s) => (
          <button
            key={s}
            className={size === s ? "active" : ""}
            disabled={!valid(s)}
            onClick={() => {
              setSize(s);
              setError("");
              onSizeChange?.(s);
            }}
            aria-pressed={size === s}
            title={money(sizePrice(p, s), lang)}
          >
            {s}
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="add-row">
        <Button busy={busy} onClick={add}>
          <ShoppingBag size={18} />
          {t("Додати в кошик", "Add to bag")}
          <span><ProductPrice product={p} size={size} color={color} /></span>
        </Button>
        {!compact && (
          <button
            className="icon-button outlined"
            aria-label={t("В обране", "Wishlist")}
            onClick={() => toggleWish(p)}
          >
            <Heart fill={wishlist.includes(p.id) ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    </div>
  );
}
export function QuickView() {
  const { quick, setQuick, t, lang } = useShop();
  const [selection, setSelection] = useState(null);
  useEffect(() => setSelection(null), [quick]);
  const color = selection && quick && selection.id === quick.id ? selection.color : quick?.colors[0]?.name;
  return (
    <Modal
      open={Boolean(quick)}
      onClose={() => setQuick(null)}
      title={t("Швидкий вибір", "Quick selection")}
    >
      {quick && (
        <>
          <div className="quick-product">
            <img src={productImages(quick, color)[0]} alt={quick.name} />
            <div>
              <p className="eyebrow">{quick.brand}</p>
              <h3>{lang === "uk" ? quick.name : quick.nameEn}</h3>
              <p>{t("Репліка • не оригінал", "Replica • not original")}</p>
            </div>
          </div>
          <VariantPicker
            key={quick.id}
            product={quick}
            onColorChange={(color) => setSelection({ id: quick.id, color })}
            compact
            onAdded={() => setQuick(null)}
          />
          <Link
            className="text-link"
            to={"/product/" + quick.slug}
            onClick={() => setQuick(null)}
          >
            {t("Детальніше про товар", "View full details")}
            <ArrowUpRight size={16} />
          </Link>
        </>
      )}
    </Modal>
  );
}
export function Login({ onSuccess }) {
  const { t, lang, refresh, settings, setLoginOpen } = useShop();
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [devCode, setDevCode] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const codeInput = useRef(null);
  const unavailable = settings?.mailReady === false && !settings?.devAuth;
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => { if (sent) codeInput.current?.focus(); }, [sent]);
  async function requestCode() {
    const normalized = email.trim().toLowerCase();
    const r = await api("/auth/request", { method: "POST", body: { email: normalized, lang } });
    setEmail(normalized);
    setSent(true);
    setCode("");
    setDevCode(r.devCode || "");
    setCooldown(r.retryAfter || 60);
    codeInput.current?.focus();
  }
  async function resend() {
    if (busy || cooldown) return;
    setBusy(true);
    setError("");
    try { await requestCode(); }
    catch (e) { setError(e.message); if (e.retryAfter) setCooldown(e.retryAfter); }
    finally { setBusy(false); }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        await requestCode();
      } else {
        await api("/auth/verify", { method: "POST", body: { email, code } });
        await refresh();
        onSuccess?.();
      }
    } catch (e) {
      setError(e.message);
      if (e.retryAfter) setCooldown(e.retryAfter);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form login-form" onSubmit={submit} aria-busy={busy}>
      <div className="login-symbol">
        <Mail size={28} />
      </div>
      <h3>
        {sent
          ? t("Перевір свою пошту", "Check your email")
          : t("Твій особистий SNAP", "Your personal SNAP")}
      </h3>
      <p className="muted">
        {sent
          ? t(
              `Код надіслано на ${email}. Він діє 10 хвилин.`,
              `Code sent to ${email}. It is valid for 10 minutes.`,
            )
          : t(
              "Без паролів. Введи email — надішлемо одноразовий код. Кабінет створиться автоматично.",
              "No passwords. Enter your email for a one-time code. Your account is created automatically.",
            )}
      </p>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          required
          readOnly={sent}
          disabled={busy || unavailable}
          autoFocus
        />
      </label>
      {sent && (
        <label>
          {t("Код підтвердження", "Verification code")}
          <input
            ref={codeInput}
            className="otp-input"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            minLength={6}
            placeholder="000000"
            aria-invalid={Boolean(error)}
            disabled={busy}
            required
          />
        </label>
      )}
      {devCode && (
        <div className="notice">
          DEV ONLY · {t("Локальний тестовий код", "Local test code")}:{" "}
          <strong>{devCode}</strong>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {unavailable && <p className="notice login-unavailable" role="status">
        {t("Вхід тимчасово недоступний. Спробуй трохи пізніше.", "Sign-in is temporarily unavailable. Please try again later.")}
      </p>}
      <Button busy={busy} type="submit" disabled={unavailable || (sent && code.length !== 6)}>
        {sent ? t("Увійти", "Sign in") : t("Отримати код", "Get a code")}
        <ArrowRight size={18} />
      </Button>
      {sent && (
        <div className="login-actions">
        <button
          type="button"
          className="text-link"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode("");
            setError("");
            setDevCode("");
          }}
        >
          {t("Змінити email", "Change email")}
        </button>
        <button type="button" className="text-link" disabled={busy || cooldown > 0} onClick={resend}>
          {cooldown > 0 ? t(`Повторити через ${cooldown} с`, `Resend in ${cooldown}s`) : t("Надіслати ще раз", "Resend code")}
        </button>
        </div>
      )}
      {sent && <p className="fine">{t("Немає листа? Перевір папку «Спам» та правильність адреси.", "No email? Check your spam folder and the email address.")}</p>}
      <p className="fine">
        {t(
          "Дані використовуємо для входу та замовлень.",
          "Your data is used for sign-in and orders.",
        )}{" "}
        <Link to="/privacy" onClick={() => setLoginOpen(false)}>{t("Конфіденційність", "Privacy")}</Link>
      </p>
    </form>
  );
}
export function CartDrawer() {
  const {
    cart = [],
    products,
    cartOpen,
    setCartOpen,
    saveCart,
    t,
    lang,
    setToast,
    settings,
  } = useShop();
  const [q, setQ] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (cartOpen) {
      setError("");
      api("/quote", { method: "POST", body: {} })
        .then(setQ)
        .catch((e) => setError(e.message));
    }
  }, [cartOpen, cart]);
  async function change(index, delta) {
    setBusy(true);
    try {
      const items = cart.map((i) => ({ ...i }));
      items[index].quantity += delta;
      await saveCart(items.filter((i) => i.quantity > 0));
    } catch (e) {
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      drawer
      title={`${t("Твій кошик", "Your bag")} (${cart.reduce((s, i) => s + i.quantity, 0)})`}
    >
      {cart.length ? (
        <>
          <div className="cart-scroll">
            {cart.map((item, index) => {
              const p = products.find((p) => p.id === item.productId);
              return (
                <div
                  className="cart-line"
                  key={[item.productId, item.color, item.size].join()}
                >
                  <img
                    src={productImages(p, item.color)[0]}
                    alt={p?.name || t("Товар", "Product")}
                  />
                  <div className="cart-line-info">
                    <div className="cart-line-heading">
                      <div>
                        <strong>{p?.brand}</strong>
                        <p>{lang === "uk" ? p?.name : p?.nameEn}</p>
                      </div>
                      <button
                        aria-label={t("Видалити товар", "Remove item")}
                        className="icon-button"
                        disabled={busy}
                        onClick={() => change(index, -item.quantity)}
                      >
                        <X size={17} />
                      </button>
                    </div>
                    <small>
                      {item.color} / {item.size}
                    </small>
                    <div className="cart-line-actions">
                    <div className="quantity">
                      <button
                        disabled={busy}
                        aria-label={t(
                          "Зменшити кількість",
                          "Decrease quantity",
                        )}
                        onClick={() => change(index, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        disabled={busy || item.quantity >= 50}
                        aria-label={t(
                          "Збільшити кількість",
                          "Increase quantity",
                        )}
                        onClick={() => change(index, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <strong className="cart-line-price">
                      {p ? money(sizePrice(p, item.size) * item.quantity, lang) : "—"}
                    </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {q && (
            <div className="cart-summary">
              <div className="shipping-progress">
                <p>
                  <Truck size={16} />
                  {q.freeShipping
                    ? t("Доставка за наш рахунок", "Shipping is on us")
                    : t(
                        `Ще ${money(q.freeShippingRemaining)} до безкоштовної доставки`,
                        `${money(q.freeShippingRemaining, lang)} to free shipping`,
                      )}
                </p>
                <progress
                  value={Math.min(q.total, settings.freeShipping)}
                  max={settings.freeShipping || 1}
                />
              </div>
              <div className="summary-line">
                <span>{t("Товари", "Subtotal")}</span>
                <span>{money(q.subtotal, lang)}</span>
              </div>
              {q.discount > 0 ? (
                <div className="summary-line blue-text">
                  <span>
                    {t("Знижка за кількість", "Quantity discount")} −{q.percent}
                    %
                  </span>
                  <span>−{money(q.discount, lang)}</span>
                </div>
              ) : (
                <p className="fine">
                  {t(
                    "Від 5 речей — 5%, кожна наступна +1%, максимум 20%.",
                    "5 items = 5%, each extra item +1%, up to 20%.",
                  )}
                </p>
              )}
              <div className="summary-line total">
                <span>{t("Разом", "Total")}</span>
                <span>{money(q.total, lang)}</span>
              </div>
              <Button
                onClick={() => {
                  setCartOpen(false);
                  navigate("/checkout");
                }}
              >
                {t("Оформити замовлення", "Checkout")}
                <ArrowRight size={18} />
              </Button>
              <p className="fine center">
                {t(
                  "Оплата при отриманні. Комісія післяплати окремо.",
                  "Pay on delivery. Cash-on-delivery fees are separate.",
                )}
              </p>
            </div>
          )}
        </>
      ) : (
        <Empty
          title={t("Тут буде твій новий стиль", "Your next look starts here")}
          text={t(
            "Додай першу річ, а ми порахуємо всі вигоди.",
            "Add your first piece and we’ll calculate your savings.",
          )}
          action={
            <Button
              onClick={() => {
                setCartOpen(false);
                navigate("/catalog");
              }}
            >
              {t("До каталогу", "Explore catalog")}
              <ArrowRight size={18} />
            </Button>
          }
        />
      )}
    </Modal>
  );
}
