import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
const Context = createContext(null);
let csrf = "";
export async function api(url, options = {}, retried = false) {
  const response = await fetch("/api" + url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      "X-CSRF-Token": csrf,
      ...options.headers,
    },
    body:
      options.body instanceof FormData
        ? options.body
        : options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => {
    throw new Error("Не вдалося з’єднатися з магазином. Спробуйте ще раз.");
  });
  if (response.status === 403 && data.code === "SESSION_REFRESHED" && !retried) {
    await api("/bootstrap");
    return api(url, options, true);
  }
  if (!response.ok) {
    const error = new Error((data.error || "Не вдалося виконати дію.") + (data.details ? " · " + data.details.join("; ") : ""));
    error.status = response.status;
    error.retryAfter = Number(data.retryAfter || response.headers.get("Retry-After")) || 0;
    throw error;
  }
  if (data.csrf) csrf = data.csrf;
  return data;
}
export function navigate(url) {
  history.pushState(null, "", url);
  window.dispatchEvent(new Event("popstate"));
  window.scrollTo({ top: 0, behavior: "instant" });
}
export function Link({ to, children, onClick, ...props }) {
  return (
    <a
      href={to}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (
          !e.defaultPrevented &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey &&
          e.button === 0 &&
          to.startsWith("/")
        ) {
          e.preventDefault();
          navigate(to);
        }
      }}
    >
      {children}
    </a>
  );
}
export function useRoute() {
  const [route, setRoute] = useState(location.pathname + location.search);
  useEffect(() => {
    const f = () => setRoute(location.pathname + location.search);
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, []);
  return route;
}
export const money = (n, lang = "uk") =>
  new Intl.NumberFormat(lang === "uk" ? "uk-UA" : "en-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: n % 100 ? 2 : 0,
  }).format(n / 100);
export function Provider({ children }) {
  const [data, setData] = useState(null),
    [products, setProducts] = useState([]),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [cartOpen, setCartOpen] = useState(false),
    [loginOpen, setLoginOpen] = useState(false),
    [quick, setQuick] = useState(null);
  const [lang, setLang] = useState(
      () => localStorage.getItem("snap-lang") || "uk",
    ),
    [theme, setTheme] = useState(
      () => localStorage.getItem("snap-theme") || "light",
    );
  const t = useCallback((uk, en) => (lang === "uk" ? uk : en), [lang]);
  const refresh = useCallback(async () => {
    const d = await api("/bootstrap");
    const p = await api("/products");
    setData(d);
    setProducts(p);
    setError("");
    return d;
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    localStorage.setItem("snap-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    localStorage.setItem("snap-theme", theme);
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#101116" : "#2456ef");
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  async function saveCart(items) {
    const r = await api("/cart", { method: "PUT", body: { items } });
    setData((d) => ({ ...d, cart: r.items }));
    return r;
  }
  async function addToCart(p, color, size, quantity = 1) {
    const items = [...data.cart.map((i) => ({ ...i }))],
      old = items.find(
        (i) => i.productId === p.id && i.color === color && i.size === size,
      );
    if (old) old.quantity += quantity;
    else items.push({ productId: p.id, color, size, quantity });
    await saveCart(items);
    window.dispatchEvent(
      new CustomEvent("snap-commerce", {
        detail: {
          name: "add_to_cart",
          data: {
            currency: "UAH",
            value: (p.price * quantity) / 100,
            items: [{ item_id: p.id, price: p.price / 100, quantity }],
          },
        },
      }),
    );
    setToast(t("Додано до кошика", "Added to bag"));
  }
  async function toggleWish(p) {
    try {
      const items = data.wishlist.includes(p.id)
        ? data.wishlist.filter((id) => id !== p.id)
        : [...data.wishlist, p.id];
      const wishlist = await api("/wishlist", {
        method: "PUT",
        body: { items },
      });
      setData((d) => ({ ...d, wishlist }));
    } catch (e) {
      setToast(e.message);
    }
  }
  return (
    <Context.Provider
      value={{
        ...data,
        data,
        products,
        error,
        refresh,
        setData,
        toast,
        setToast,
        cartOpen,
        setCartOpen,
        loginOpen,
        setLoginOpen,
        quick,
        setQuick,
        lang,
        setLang,
        theme,
        setTheme,
        t,
        saveCart,
        addToCart,
        toggleWish,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useShop = () => useContext(Context);
