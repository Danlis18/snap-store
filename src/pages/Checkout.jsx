import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, Truck, ShieldCheck, Gift } from "lucide-react";
import { api, useShop, money, Link } from "../core";
import { Button, Login, Empty } from "../components";
export default function Checkout() {
  const { t, lang, user, cart, products, settings, refresh } = useShop();
  const [form, setForm] = useState({
      name: user?.name || "",
      phone: user?.phone || "+380",
      city: user?.addresses?.[0]?.city || "",
      carrier: user?.addresses?.[0]?.carrier || "nova",
      address: user?.addresses?.[0]?.address || "",
      comment: "",
      consent: false,
    }),
    [q, setQ] = useState(null),
    [promo, setPromo] = useState(""),
    [applied, setApplied] = useState(""),
    [useBonus, setUseBonus] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [quoteBusy, setQuoteBusy] = useState(false),
    [order, setOrder] = useState(null);
  const idem = useRef(crypto.randomUUID());
  useEffect(() => {
    if (user)
      setForm((f) => ({
        ...f,
        name: f.name || user.name,
        phone: f.phone === "+380" ? user.phone || "+380" : f.phone,
      }));
  }, [user]);
  useEffect(() => {
    if (cart.length) {
      setQuoteBusy(true);
      api("/quote", {
        method: "POST",
        body: { promoCode: applied, bonus: useBonus ? user?.balance || 0 : 0 },
      })
        .then(setQ)
        .catch((e) => {
          setQ(null);
          setError(e.message);
        })
        .finally(() => setQuoteBusy(false));
    }
  }, [cart, applied, useBonus, user?.balance]);
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });
  async function apply(e) {
    e.preventDefault();
    setError("");
    setQuoteBusy(true);
    try {
      const quote = await api("/quote", {
        method: "POST",
        body: { promoCode: promo, bonus: useBonus ? user?.balance || 0 : 0 },
      });
      setApplied(promo.trim());
      setQ(quote);
    } catch (e) {
      setError(e.message);
    } finally {
      setQuoteBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const result = await api("/orders", {
        method: "POST",
        body: {
          name: form.name,
          phone: form.phone,
          delivery: {
            city: form.city,
            carrier: form.carrier,
            address: form.address,
          },
          comment: form.comment,
          consent: form.consent,
          promoCode: applied,
          bonus: useBonus ? user.balance : 0,
          idempotency: idem.current,
          expectedTotal: q.total,
        },
      });
      setOrder(result);
      if (!result.demo)
        window.dispatchEvent(
          new CustomEvent("snap-commerce", {
            detail: {
              name: "purchase",
              data: {
                transaction_id: result.id,
                currency: "UAH",
                value: result.quote.total / 100,
                items: result.quote.lines.map((l) => ({
                  item_id: l.productId,
                  price: l.price / 100,
                  quantity: l.quantity,
                })),
              },
            },
          }),
        );
      await refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message);
      api("/quote", {
        method: "POST",
        body: { promoCode: applied, bonus: useBonus ? user?.balance || 0 : 0 },
      })
        .then(setQ)
        .catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (order)
    return (
      <main className="wrap order-success">
        <span className="success-icon">
          <Check size={42} />
        </span>
        <p className="eyebrow">{order.id}</p>
        <h1>
          {order.demo
            ? t("Демо-замовлення створено", "Demo order created")
            : t("Твій SNAP уже ближче.", "Your SNAP is on its way.")}
        </h1>
        <p>
          {order.demo
            ? t(
                "Це тест сценарію: товари не відправляються, оплата не стягується, листи не надсилаються.",
                "This is a flow test: no goods are shipped, no payment is charged and no emails are sent.",
              )
            : t(
                "Ми зберегли замовлення. Підтвердження буде на твоїй пошті. Статус доступний у кабінеті.",
                "We saved your order. Confirmation will arrive by email. Track the status in your account.",
              )}
        </p>
        <div className="success-summary">
          <span>{t("Товари до сплати", "Products total")}</span>
          <b>{money(order.quote.total, lang)}</b>
          <span>{t("Оплата", "Payment")}</span>
          <b>{t("При отриманні", "On delivery")}</b>
        </div>
        <Link className="button" to="/account">
          {t("Мої замовлення", "My orders")}
          <ArrowRight size={18} />
        </Link>
      </main>
    );
  if (!cart.length)
    return (
      <main className="wrap">
        <Empty
          title={t("Кошик порожній", "Your bag is empty")}
          action={
            <Link className="button" to="/catalog">
              {t("До каталогу", "Shop now")}
            </Link>
          }
        />
      </main>
    );
  return (
    <main className="wrap checkout-page">
      <div className="breadcrumbs">
        <Link to="/">SNAP</Link>
        <span>/</span>
        {t("Оформлення", "Checkout")}
      </div>
      <h1>{t("Майже твоє.", "Almost yours.")}</h1>
      <p className="muted">
        {t(
          "Кілька деталей — і можна чекати свій новий образ.",
          "A few details and your new look is on its way.",
        )}
      </p>
      {!settings.shopLive && (
        <div className="notice">
          {t(
            "Демонстраційний режим: замовлення буде тестовим. Реальні продажі ще не відкриті.",
            "Demo mode: this will be a test order. Real sales are not open yet.",
          )}
        </div>
      )}
      <div className="checkout-layout">
        <section>
          <div className="checkout-step">
            <h2>
              <span>01</span>
              {t("Твій email", "Your email")}
            </h2>
            {user ? (
              <div className="signed-in">
                <Check size={20} />
                {user.email}
                <span>{t("Підтверджено", "Verified")}</span>
              </div>
            ) : (
              <Login />
            )}
          </div>
          <form className="form" onSubmit={submit}>
            <fieldset disabled={!user || busy}>
              <div className="checkout-step">
                <h2>
                  <span>02</span>
                  {t("Контактні дані", "Contact details")}
                </h2>
                <div className="form-grid">
                  <label>
                    {t("Ім’я та прізвище", "Full name")}
                    <input
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      {...field("name")}
                    />
                  </label>
                  <label>
                    {t("Телефон", "Phone")}
                    <input
                      autoComplete="tel"
                      type="tel"
                      pattern="\+380[0-9]{9}"
                      title="+380XXXXXXXXX"
                      required
                      {...field("phone")}
                    />
                  </label>
                </div>
              </div>
              <div className="checkout-step">
                <h2>
                  <span>03</span>
                  {t("Куди доставити?", "Where to deliver?")}
                </h2>
                <div className="delivery-options">
                  {[
                    ["nova", "Нова пошта", "Nova Poshta"],
                    ["ukrposhta", "Укрпошта", "Ukrposhta"],
                    ["courier", "Кур’єр", "Courier"],
                  ].map(([value, uk, en]) => (
                    <label
                      className={form.carrier === value ? "active" : ""}
                      key={value}
                    >
                      <input
                        type="radio"
                        name="carrier"
                        value={value}
                        checked={form.carrier === value}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            carrier: e.target.value,
                            address: "",
                          }))
                        }
                      />
                      <Truck size={18} />
                      {t(uk, en)}
                    </label>
                  ))}
                </div>
                {user?.addresses?.length > 0 && (
                  <label>
                    {t("Збережена адреса", "Saved address")}
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const a = user.addresses[Number(e.target.value)];
                        if (a) setForm((f) => ({ ...f, ...a }));
                      }}
                    >
                      <option value="">
                        {t(
                          "Вибрати або ввести нову",
                          "Choose or enter a new address",
                        )}
                      </option>
                      {user.addresses.map((a, i) => (
                        <option key={i} value={i}>
                          {a.city}, {a.address}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="form-grid">
                  <label>
                    {t("Місто", "City")}
                    <input
                      autoComplete="address-level2"
                      required
                      minLength={2}
                      maxLength={100}
                      {...field("city")}
                    />
                  </label>
                  <label>
                    {form.carrier === "courier"
                      ? t(
                          "Вулиця, будинок, квартира",
                          "Street, building, apartment",
                        )
                      : t(
                          "Відділення / поштомат, адреса",
                          "Branch / locker, address",
                        )}
                    <input
                      required
                      minLength={3}
                      maxLength={250}
                      {...field("address")}
                    />
                  </label>
                </div>
                <p className="fine">
                  {t(
                    "Вкажи точний номер та адресу. Дані вводяться вручну, без автоматичної перевірки перевізником.",
                    "Enter the exact number and address. Details are entered manually and are not verified by the carrier API.",
                  )}
                </p>
              </div>
              <div className="checkout-step">
                <h2>
                  <span>04</span>
                  {t("Оплата", "Payment")}
                </h2>
                <div className="payment-option">
                  <ShieldCheck size={23} />
                  <div>
                    <strong>{t("При отриманні", "Pay on delivery")}</strong>
                    <p>
                      {t(
                        "Жодних даних банківської картки на сайті. Доставку й комісію післяплати перевізник рахує окремо.",
                        "No card details are collected on this site. The carrier calculates delivery and cash-on-delivery fees separately.",
                      )}
                    </p>
                  </div>
                  <Check size={19} />
                </div>
                <label>
                  {t("Коментар до замовлення", "Order note")}
                  <textarea maxLength={1000} {...field("comment")} />
                </label>
                <label className="check-label consent">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    required
                    onChange={(e) =>
                      setForm((f) => ({ ...f, consent: e.target.checked }))
                    }
                  />
                  <span>
                    {t("Погоджуюсь з", "I agree to the")}{" "}
                    <Link to="/terms">
                      {t("умовами покупки", "terms of sale")}
                    </Link>{" "}
                    {t("та", "and")}{" "}
                    <Link to="/privacy">
                      {t("політикою конфіденційності", "privacy policy")}
                    </Link>
                    .{" "}
                    {t(
                      "Розумію, що купую репліки, не оригінали.",
                      "I understand that these are replicas, not originals.",
                    )}
                  </span>
                </label>
                {error && (
                  <div role="alert" className="form-error">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  busy={busy}
                  disabled={!user || !q || quoteBusy}
                >
                  {!settings.shopLive
                    ? t("Створити демо-замовлення", "Create demo order")
                    : t("Підтвердити замовлення", "Place order")}
                  <ArrowRight size={19} />
                </Button>
              </div>
            </fieldset>
          </form>
        </section>
        <aside className="checkout-summary">
          <h2>
            {t("Твій вибір", "Your selection")}
            <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          </h2>
          {cart.map((i, n) => {
            const p = products.find((p) => p.id === i.productId);
            return (
              <div className="checkout-item" key={n}>
                <img src={p?.images[0]} alt={p?.name} />
                <div>
                  <strong>{p?.brand}</strong>
                  <p>{lang === "uk" ? p?.name : p?.nameEn}</p>
                  <small>
                    {i.color} / {i.size} × {i.quantity}
                  </small>
                </div>
                <b>{p && money(p.price * i.quantity, lang)}</b>
              </div>
            );
          })}
          <form className="promo-form" onSubmit={apply}>
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder={t("Промокод", "Promo code")}
              aria-label={t("Промокод", "Promo code")}
              maxLength={30}
            />
            <Button kind="outline" busy={quoteBusy}>
              {t("Застосувати", "Apply")}
            </Button>
          </form>
          {applied && (
            <p className="fine blue-text">
              {applied}
              <button
                className="text-link"
                onClick={() => {
                  setApplied("");
                  setPromo("");
                }}
              >
                {t("Прибрати", "Remove")}
              </button>
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {user && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={useBonus}
                onChange={(e) => setUseBonus(e.target.checked)}
                disabled={!user.balance}
              />
              {t("Використати бонуси", "Use rewards")} (
              {money(user.balance, lang)})
            </label>
          )}
          {q && (
            <>
              <div className="summary-line">
                <span>{t("Товари", "Products")}</span>
                <b>{money(q.subtotal, lang)}</b>
              </div>
              <div className="summary-line">
                <span>
                  {t("Знижка", "Discount")} {q.percent}%
                </span>
                <b>−{money(q.discount, lang)}</b>
              </div>
              {q.bonusUsed > 0 && (
                <div className="summary-line">
                  <span>{t("Бонуси", "Rewards")}</span>
                  <b>−{money(q.bonusUsed, lang)}</b>
                </div>
              )}
              <div className="summary-line">
                <span>{t("Доставка", "Shipping")}</span>
                <span>
                  {q.freeShipping
                    ? t("За наш рахунок", "On us")
                    : t("За тарифами перевізника", "Carrier rate")}
                </span>
              </div>
              <div className="summary-line total">
                <span>{t("Разом за товари", "Products total")}</span>
                <b>{money(q.total, lang)}</b>
              </div>
              <p className="bonus-message">
                <Gift size={17} />
                {settings.shopLive
                  ? t(
                      `+${money(q.earn)} бонусами після отримання`,
                      `+${money(q.earn, lang)} in rewards after delivery`,
                    )
                  : t(
                      "Демо-замовлення не нараховує бонуси",
                      "Demo orders do not earn rewards",
                    )}
              </p>
              <p className="fine">
                {t(
                  "Застосовуємо вигіднішу знижку: за кількість або промокод. Бонуси можна використати після неї.",
                  "The better of quantity or promo discount applies. Rewards can be used afterwards.",
                )}
              </p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
