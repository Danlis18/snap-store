import React, { useState, useEffect } from "react";
import {
  LogOut,
  ShoppingBag,
  Gift,
  User,
  Heart,
  ArrowUpRight,
  Plus,
  X,
} from "lucide-react";
import { api, useShop, money, Link } from "../core";
import { Button, Login, Empty, Modal } from "../components";
const statuses = {
  new: ["Нове", "New"],
  confirmed: ["Підтверджено", "Confirmed"],
  shipped: ["Відправлено", "Shipped"],
  delivered: ["Отримано", "Delivered"],
  cancelled: ["Скасовано", "Cancelled"],
  return_requested: ["Запит повернення", "Return requested"],
  returned: ["Повернено", "Returned"],
};
export default function Account() {
  const { user, t, lang, refresh, setToast } = useShop();
  const [orders, setOrders] = useState([]),
    [tab, setTab] = useState("orders"),
    [error, setError] = useState(""),
    [profile, setProfile] = useState({
      name: user?.name || "",
      phone: user?.phone || "+380",
      addresses: user?.addresses || [],
    }),
    [busy, setBusy] = useState(false),
    [returnOrder, setReturnOrder] = useState(null),
    [reason, setReason] = useState("");
  async function load() {
    try {
      setOrders(await api("/orders"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (user) {
      load();
      setProfile({
        name: user.name,
        phone: user.phone || "+380",
        addresses: user.addresses,
      });
    }
  }, [user?.id]);
  if (!user)
    return (
      <main className="wrap account-login">
        <Login />
      </main>
    );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/profile", { method: "PUT", body: profile });
      await refresh();
      setToast(t("Збережено", "Saved"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function requestReturn(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/orders/" + returnOrder.id + "/return", {
        method: "POST",
        body: { reason },
      });
      setReturnOrder(null);
      setReason("");
      load();
      setToast(t("Запит повернення надіслано", "Return request sent"));
    } catch (e) {
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="wrap account-page">
      <div className="account-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL SPACE</p>
          <h1>
            {t("Привіт", "Hello")}
            {user.name ? ", " + user.name.split(" ")[0] : ""}.
          </h1>
          <p className="muted">{user.email}</p>
        </div>
        <Button
          kind="outline"
          onClick={async () => {
            await api("/auth/logout", { method: "POST", body: {} });
            await refresh();
          }}
        >
          <LogOut size={17} />
          {t("Вийти", "Sign out")}
        </Button>
      </div>
      <div className="account-stats">
        <div className="reward-card">
          <Gift size={26} />
          <span>{t("Твої бонуси", "Your rewards")}</span>
          <b>{money(user.balance, lang)}</b>
          <Link to="/club">
            {t("Як це працює", "How it works")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <ShoppingBag size={25} />
          <span>{t("Замовлення", "Orders")}</span>
          <b>{orders.length}</b>
        </div>
        <Link to="/wishlist">
          <Heart size={25} />
          <span>{t("Твоє обране", "Your wishlist")}</span>
          <ArrowUpRight size={30} />
        </Link>
        {user.isAdmin && (
          <Link to="/admin">
            <User size={25} />
            <span>{t("Керування магазином", "Store management")}</span>
            <ArrowUpRight size={30} />
          </Link>
        )}
      </div>
      <div className="pill-tabs">
        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => setTab("orders")}
        >
          {t("Мої замовлення", "My orders")}
        </button>
        <button
          className={tab === "profile" ? "active" : ""}
          onClick={() => setTab("profile")}
        >
          {t("Дані та адреси", "Details & addresses")}
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {tab === "orders" ? (
        orders.length ? (
          <div className="orders-list">
            {orders.map((o) => (
              <details className="order-card" key={o.id}>
                <summary>
                  <div>
                    <strong>{o.id}</strong>
                    <small>
                      {new Date(o.createdAt).toLocaleDateString(
                        lang === "uk" ? "uk-UA" : "en-GB",
                      )}
                      {o.demo ? " · DEMO" : ""}
                    </small>
                  </div>
                  <span className={"order-status " + o.status}>
                    {t(...statuses[o.status])}
                  </span>
                  <b>{money(o.quote.total, lang)}</b>
                  <Plus size={18} />
                </summary>
                <div className="order-content">
                  {o.quote.lines.map((l, i) => (
                    <div className="checkout-item" key={i}>
                      <img src={l.image} alt={l.name} />
                      <div>
                        <strong>{l.brand}</strong>
                        <p>{lang === "uk" ? l.name : l.nameEn}</p>
                        <small>
                          {l.color} / {l.size} × {l.quantity}
                        </small>
                      </div>
                      <b>{money(l.total, lang)}</b>
                    </div>
                  ))}
                  <p>
                    <b>{t("Доставка", "Delivery")}:</b> {o.delivery.city},{" "}
                    {o.delivery.address}
                  </p>
                  {o.tracking && (
                    <p>
                      <b>{t("ТТН", "Tracking")}:</b> {o.tracking}
                    </p>
                  )}
                  {o.status === "delivered" && (
                    <Button kind="outline" onClick={() => setReturnOrder(o)}>
                      {t("Запит на повернення", "Request a return")}
                    </Button>
                  )}
                  {o.returnReason && (
                    <p>
                      {t("Причина повернення", "Return reason")}:{" "}
                      {o.returnReason}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <Empty
            title={t("Перший образ ще попереду", "Your first look is ahead")}
            action={
              <Link className="button" to="/catalog">
                {t("До каталогу", "Browse catalog")}
              </Link>
            }
          />
        )
      ) : (
        <form className="form profile-form" onSubmit={save}>
          <div className="form-grid">
            <label>
              {t("Ім’я та прізвище", "Full name")}
              <input
                required
                minLength={2}
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
              />
            </label>
            <label>
              {t("Телефон", "Phone")}
              <input
                type="tel"
                pattern="\+380[0-9]{9}"
                required
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </label>
          </div>
          <h2>{t("Збережені адреси", "Saved addresses")}</h2>
          {profile.addresses.map((a, i) => (
            <div className="address-row" key={i}>
              <label>
                {t("Місто", "City")}
                <input
                  required
                  minLength={2}
                  value={a.city}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      addresses: p.addresses.map((x, n) =>
                        n === i ? { ...x, city: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </label>
              <label>
                {t("Перевізник", "Carrier")}
                <select
                  value={a.carrier}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      addresses: p.addresses.map((x, n) =>
                        n === i ? { ...x, carrier: e.target.value } : x,
                      ),
                    }))
                  }
                >
                  <option value="nova">Нова пошта</option>
                  <option value="ukrposhta">Укрпошта</option>
                  <option value="courier">{t("Кур’єр", "Courier")}</option>
                </select>
              </label>
              <label>
                {t("Адреса", "Address")}
                <input
                  required
                  minLength={3}
                  value={a.address}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      addresses: p.addresses.map((x, n) =>
                        n === i ? { ...x, address: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </label>
              <button
                type="button"
                aria-label={t("Видалити адресу", "Delete address")}
                className="icon-button"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    addresses: p.addresses.filter((_, n) => i !== n),
                  }))
                }
              >
                <X size={20} />
              </button>
            </div>
          ))}
          {profile.addresses.length < 5 && (
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setProfile((p) => ({
                  ...p,
                  addresses: [
                    ...p.addresses,
                    { city: "", carrier: "nova", address: "" },
                  ],
                }))
              }
            >
              <Plus size={18} />
              {t("Додати адресу", "Add address")}
            </button>
          )}
          <Button busy={busy} type="submit">
            {t("Зберегти зміни", "Save changes")}
          </Button>
        </form>
      )}
      <Modal
        open={Boolean(returnOrder)}
        onClose={() => setReturnOrder(null)}
        title={t("Запит повернення", "Return request")}
      >
        <form className="form" onSubmit={requestReturn}>
          <p>
            {t(
              "Опиши причину. Адміністратор побачить запит у замовленні.",
              "Describe the reason. The administrator will see it with your order.",
            )}
          </p>
          <label>
            {t("Причина повернення", "Reason for return")}
            <textarea
              value={reason}
              required
              minLength={10}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button busy={busy}>{t("Надіслати", "Send")}</Button>
        </form>
      </Modal>
    </main>
  );
}
