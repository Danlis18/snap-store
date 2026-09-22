import { sizePrice, priceRange, offerPrices } from "../shared/product-pricing.js";
import React, { useEffect, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Menu,
  X,
  Heart,
  ShoppingBag,
  User,
  Sun,
  Moon,
  Sparkles,
  Truck,
  Check,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  Plus,
  ShieldCheck,
  Mail,
  Instagram,
  Send,
  Gift,
} from "lucide-react";
import {
  Provider,
  useShop,
  Link,
  navigate,
  useRoute,
  money,
  api,
} from "./core";
import {
  Button,
  Modal,
  Empty,
  ProductGrid,
  ProductPrice,
  VariantPicker,
  QuickView,
  Login,
  CartDrawer,
  CountBadge,
  Carriers,
} from "./components";
import "./styles.css";
import { productImages } from "../shared/product-media.js";
import { AgentTools, Consent } from "./enhancements";
const Checkout = lazy(() => import("./pages/Checkout"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));
const Studio = lazy(() => import("./pages/Studio"));

const navItems = [
  ["new", "Новинки", "New in"],
  ["clothing", "Одяг", "Clothing"],
  ["shoes", "Взуття", "Shoes"],
  ["accessories", "Аксесуари", "Accessories"],
  ["brands", "Топ бренди", "Top brands"],
  ["sale", "Розпродаж", "Sale"],
];
function Header() {
  const {
    t,
    lang,
    setLang,
    theme,
    setTheme,
    cart = [],
    wishlist = [],
    user,
    setCartOpen,
    setLoginOpen,
    products,
    brands,
  } = useShop();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false);
  const route = useRoute();
  useEffect(() => {
    setMenu(false);
    setSearchOpen(false);
  }, [route]);
  const results = search.trim()
    ? products
        .filter((p) =>
          (p.name + " " + p.nameEn + " " + p.brand)
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
        .slice(0, 5)
    : products.slice(0, 4);
  const searchForm = (
    <form
      className="search-box"
      onSubmit={(e) => {
        e.preventDefault();
        setSearchOpen(false);
        navigate("/catalog?q=" + encodeURIComponent(search));
      }}
    >
      <Search size={18} />
      <input
        aria-label={t("Пошук товарів", "Search products")}
        placeholder={t(
          "Знайди свій наступний must-have",
          "Find your next must-have",
        )}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
      />
      <span className="search-shortcut">⌘ K</span>
    </form>
  );
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector(".search-box input")?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  return (
    <>
      <div className="top-strip">
        <span>
          <Truck size={14} />
          {t(
            "Доставка за наш рахунок від 7 777 ₴",
            "Shipping on us from UAH 7,777",
          )}
        </span>
        <Link to="/delivery">
          {t("Доставка та оплата", "Shipping & payment")}
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="site-header">
        <div className="header-main wrap">
          <div className="header-brand">
            <button
              className="icon-button mobile-menu"
              aria-label={t("Меню", "Menu")}
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <Link to="/" className="logo" aria-label="SNAP Store — головна">
              <img
                src="/brand/snap-logo-full.png"
                alt="SNAP Store"
                width="2047"
                height="926"
              />
            </Link>
          </div>
          <div className="desktop-search">{searchForm}</div>
          <div className="header-actions">
            <button
              className="language"
              onClick={() => setLang(lang === "uk" ? "en" : "uk")}
              aria-label={t("Switch to English", "Перемкнути українською")}
            >
              {lang === "uk" ? "UA" : "EN"}
              <ChevronDown size={12} />
            </button>
            <button
              className="icon-button"
              aria-label={
                theme === "light"
                  ? t("Темна тема", "Dark theme")
                  : t("Світла тема", "Light theme")
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              className="icon-button account-icon"
              aria-label={t("Особистий кабінет", "My account")}
              onClick={() => (user ? navigate("/account") : setLoginOpen(true))}
            >
              <User size={21} />
            </button>
            <Link
              to="/wishlist"
              className="icon-button wishlist-icon"
              aria-label={t(`Обране: ${wishlist.length}`, `Wishlist: ${wishlist.length}`)}
            >
              <Heart size={21} />
              <CountBadge count={wishlist.length} />
            </Link>
            <button
              className="icon-button cart-icon"
              aria-label={t(`Відкрити кошик: ${cart.reduce((s, i) => s + i.quantity, 0)}`, `Open bag: ${cart.reduce((s, i) => s + i.quantity, 0)}`)}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={22} />
              <CountBadge count={cart.reduce((s, i) => s + i.quantity, 0)} />
            </button>
          </div>
        </div>
        <div className="mobile-search wrap">{searchForm}</div>
        <div className="nav-wrap">
          <nav
            className="desktop-nav wrap"
            aria-label={t("Категорії", "Categories")}
          >
            <div>
              {navItems.map(([key, uk, en]) => (
                <Link
                  className={key === "sale" ? "sale-link" : ""}
                  key={key}
                  to={key === "brands" ? "/brands" : "/catalog/" + key}
                >
                  {t(uk, en)}
                </Link>
              ))}
            </div>
            <Link to="/stylist" className="studio-link">
              <Sparkles size={17} />
              SNAP STUDIO<span>3D</span>
            </Link>
          </nav>
        </div>
        {searchOpen && (
          <div className="search-results">
            <div className="wrap">
              <div className="section-label">
                {search
                  ? t("Результати пошуку", "Search results")
                  : t("Спробуй щось нове", "Discover something new")}
                <button
                  className="icon-button"
                  aria-label={t("Закрити пошук", "Close search")}
                  onClick={() => setSearchOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              {results.length ? (
                results.map((p) => (
                  <Link
                    key={p.id}
                    to={"/product/" + p.slug}
                    className="search-result"
                  >
                    <img src={p.images[0]} alt="" />
                    <div>
                      <strong>{p.brand}</strong>
                      <p>{lang === "uk" ? p.name : p.nameEn}</p>
                    </div>
                    <span><ProductPrice product={p} /></span>
                    <ArrowUpRight size={17} />
                  </Link>
                ))
              ) : (
                <p>
                  {t(
                    "Нічого не знайдено. Спробуй іншу назву.",
                    "No results. Try another name.",
                  )}
                </p>
              )}
              <Link
                className="text-link"
                to={"/catalog?q=" + encodeURIComponent(search)}
              >
                {t("Усі результати", "All results")}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </header>
      <Modal open={menu} onClose={() => setMenu(false)} title="SNAP" drawer>
        <nav className="mobile-nav">
          {navItems.map(([key, uk, en]) => (
            <Link
              key={key}
              to={key === "brands" ? "/brands" : "/catalog/" + key}
            >
              {t(uk, en)}
              <ArrowUpRight size={20} />
            </Link>
          ))}
          <Link to="/stylist">
            <Sparkles size={20} />
            SNAP STUDIO · 3D
          </Link>
          <Link to="/club">SNAP CLUB</Link>
          <Link to="/delivery">
            {t("Доставка та оплата", "Shipping & payment")}
          </Link>
          <Link to="/account">{t("Особистий кабінет", "My account")}</Link>
        </nav>
      </Modal>
    </>
  );
}
function Home() {
  const { t, lang, products, brands, settings } = useShop();
  const hero =
    products.find((p) => p.id === settings.heroProductId) ||
    products.find((p) => p.type === "jacket") ||
    products[0];
  const [tab, setTab] = useState("edit");
  let featured =
    tab === "new"
      ? products.filter((p) => p.badge === "new")
      : tab === "hit"
        ? products.filter((p) => p.badge === "hit")
        : products;
  return (
    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-rule" />
            THE SNAP EDIT / 01
          </div>
          <h1>
            {(lang === "uk" ? settings.headline : settings.headlineEn)
              .split("\n")
              .map((line, i) => (
                <React.Fragment key={line}>
                  {i > 0 && <br />}
                  {i === 1 ? <span>{line}</span> : line}
                </React.Fragment>
              ))}
          </h1>
          <p>{lang === "uk" ? settings.heroText : settings.heroTextEn}</p>
          <Link to="/catalog" className="button">
            {t("Знайти своє", "Find your fit")}
            <ArrowUpRight size={21} />
          </Link>
          <div className="hero-foot">
            <span>PREMIUM LOOK. SMART PRICE.</span>
            <span>01 / 03</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-word">SNAP</div>
          <img
            src={hero?.images[0] || "/assets/puffer.webp"}
            alt={
              hero
                ? lang === "uk"
                  ? hero.name
                  : hero.nameEn
                : "SNAP editorial"
            }
            width="900"
            height="900"
            fetchPriority="high"
          />
          <div className="edition-label">
            <span>NEW PERSPECTIVE</span>
            <span>COBALT / 26</span>
          </div>
          <Link
            className="hero-product-label"
            to={hero ? "/product/" + hero.slug : "/catalog"}
          >
            <span>
              {hero
                ? lang === "uk"
                  ? hero.name
                  : hero.nameEn
                : t("Знайди свій стиль", "Find your style")}
              <small>
                {hero?.demo
                  ? t("Демонстраційна колекція", "Demo collection")
                  : t("Дивитися товар", "Explore the product")}
              </small>
            </span>
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <section className="perks wrap">
        <Link to="/delivery">
          <Truck />
          <span>
            {t("По всій Україні", "Across Ukraine")}
            <small>{t("Оплата при отриманні", "Pay on delivery")}</small>
          </span>
        </Link>
        <Link to="/club">
          <Gift />
          <span>
            {t("Більше речей — більше вигоди", "More pieces. More savings.")}
            <small>
              {t("Від 5% до 20% у кошику", "5–20% quantity discount")}
            </small>
          </span>
        </Link>
        <Link to="/about">
          <ShieldCheck />
          <span>
            {t("Прозорий вибір", "Know what you buy")}
            <small>
              {t(
                "Репліки, без прихованих обіцянок",
                "Replicas, clearly labelled",
              )}
            </small>
          </span>
        </Link>
        <Link to="/stylist">
          <Sparkles />
          <span>
            {t("Твій персональний образ", "Your own look")}
            <small>
              {t("3 запитання. 3D-стиліст.", "3 questions. 3D stylist.")}
            </small>
          </span>
        </Link>
      </section>
      <section className="brands-strip wrap">
        <div className="eyebrow">YOUR FAVOURITES</div>
        <div>
          {brands.slice(1, 6).map((b) => (
            <Link key={b} to={"/brands/" + encodeURIComponent(b)}>
              {b}
            </Link>
          ))}
          <Link to="/brands" className="all-brands">
            {t("Усі бренди", "All brands")}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="wrap product-section">
        <div className="section-top">
          <div>
            <span className="eyebrow">CURATED FOR YOU</span>
            <h2>{t("Зараз у фокусі", "In the spotlight")}</h2>
          </div>
          <Link className="text-link" to="/catalog">
            {t("Увесь каталог", "Shop all")}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="pill-tabs">
          {[
            ["edit", "Для тебе", "For you"],
            ["new", "Новинки", "New in"],
            ["hit", "Бестселери", "Bestsellers"],
          ].map(([key, uk, en]) => (
            <button
              className={tab === key ? "active" : ""}
              key={key}
              onClick={() => setTab(key)}
            >
              {t(uk, en)}
            </button>
          ))}
        </div>
        <ProductGrid products={featured.slice(0, 8)} />
      </section>
      <section className="studio-banner wrap">
        <div className="studio-banner-copy">
          <p className="eyebrow">
            <Sparkles size={16} />
            SNAP STUDIO
          </p>
          <h2>
            {t("Не знаєш, що з чим?", "Not sure what goes together?")}
            <br />
            <span>{t("Знайди свій match.", "Find your match.")}</span>
          </h2>
          <p>
            {t(
              "Розкажи про свій стиль. Зберемо поєднання з каталогу й покажемо силует у 3D.",
              "Tell us your style. We’ll combine catalog pieces and show their silhouette in 3D.",
            )}
          </p>
          <Link to="/stylist" className="button light">
            {t("Зібрати образ", "Build a look")}
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="studio-collage" aria-hidden="true">
          <img src="/assets/tshirt.webp" alt="" loading="lazy" />
          <img src="/assets/sneakers.webp" alt="" loading="lazy" />
          <span>
            3D
            <br />
            STUDIO
          </span>
        </div>
      </section>
      <section className="club-teaser wrap">
        <div>
          <p className="eyebrow">SNAP CLUB</p>
          <h2>{t("Твій стиль повертає бонуси.", "Your style gives back.")}</h2>
          <p>
            {t(
              `${settings.bonusPercent}% від отриманих покупок — на наступний образ.`,
              `${settings.bonusPercent}% back on delivered purchases — towards your next look.`,
            )}
          </p>
        </div>
        <Link
          to="/club"
          className="round-link"
          aria-label={t("Про SNAP Club", "About SNAP Club")}
        >
          <ArrowUpRight size={30} />
        </Link>
      </section>
    </main>
  );
}
function Catalog({ category = "", brand = "", wishlistOnly = false }) {
  const { t, lang, products, brands, wishlist } = useShop(),
    route = useRoute();
  const params = new URLSearchParams(route.split("?")[1]);
  const [query, setQuery] = useState(params.get("q") || ""),
    [selectedBrands, setBrands] = useState(brand ? [brand] : []),
    [type, setType] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [season, setSeason] = useState(""),
    [max, setMax] = useState(10000),
    [sort, setSort] = useState("popular"),
    [onSale, setOnSale] = useState(false),
    [filters, setFilters] = useState(false),
    [visible, setVisible] = useState(24);
  useEffect(() => {
    setBrands(brand ? [brand] : []);
    setType("");
    setSize("");
    setColor("");
    setSeason("");
    setMax(10000);
    setVisible(24);
    setOnSale(false);
    setQuery(new URLSearchParams(route.split("?")[1]).get("q") || "");
  }, [category, brand, wishlistOnly, route]);
  const filtered = products
    .filter(
      (p) =>
        (!wishlistOnly || wishlist.includes(p.id)) &&
        (!category ||
          !["clothing", "shoes", "accessories"].includes(category) ||
          p.category === category) &&
        (category !== "new" || p.badge === "new") &&
        (category !== "sale" || p.oldPrice) &&
        (!onSale || p.oldPrice) &&
        (!selectedBrands.length || selectedBrands.includes(p.brand)) &&
        (!type || p.type === type) &&
        (size ? sizePrice(p, size) : priceRange(p, color).min) <= max * 100 &&
        (!size || p.variants.some((v) => v.size === size && v.available)) &&
        (!color || p.colors.some((c) => c.name === color)) &&
        (!season || p.season === season) &&
        (!query ||
          (p.name + " " + p.nameEn + " " + p.brand)
            .toLowerCase()
            .includes(query.toLowerCase())),
    )
    .sort((a, b) =>
      sort === "low"
        ? priceRange(a).min - priceRange(b).min
        : sort === "high"
          ? priceRange(b).min - priceRange(a).min
          : sort === "new"
            ? b.createdAt.localeCompare(a.createdAt)
            : sort === "discount"
              ? (b.oldPrice ? 1 - priceRange(b).min / b.oldPrice : 0) -
                (a.oldPrice ? 1 - priceRange(a).min / a.oldPrice : 0)
              : b.popularity - a.popularity,
    );
  const title = wishlistOnly
    ? t("Твоє обране", "Your wishlist")
    : brand ||
      {
        clothing: t("Одяг", "Clothing"),
        shoes: t("Взуття", "Shoes"),
        accessories: t("Аксесуари", "Accessories"),
        new: t("Новинки", "New in"),
        sale: t("Розпродаж", "Sale"),
      }[category] ||
      t("Увесь каталог", "All pieces");
  const clear = () => {
    setBrands(brand ? [brand] : []);
    setType("");
    setSize("");
    setColor("");
    setSeason("");
    setMax(10000);
    setOnSale(false);
    setQuery("");
  };
  const count =
    selectedBrands.length +
    Boolean(type) +
    Boolean(size) +
    Boolean(color) +
    Boolean(season) +
    (max < 10000) +
    onSale;
  const filterContent = (
    <div className="filters">
      <div className="filter-title">
        {t("Фільтри", "Filters")}
        <button className="text-link" onClick={clear}>
          {t("Скинути", "Reset")}
          <RotateCcw size={13} />
        </button>
      </div>
      <details open>
        <summary>
          {t("Бренди", "Brands")}
          <Plus size={16} />
        </summary>
        {brands.map((b) => (
          <label className="check-label" key={b}>
            <input
              type="checkbox"
              checked={selectedBrands.includes(b)}
              onChange={() =>
                setBrands(
                  selectedBrands.includes(b)
                    ? selectedBrands.filter((x) => x !== b)
                    : [...selectedBrands, b],
                )
              }
            />
            {b}
            <span>{products.filter((p) => p.brand === b).length}</span>
          </label>
        ))}
      </details>
      <details open>
        <summary>
          {t("Категорія", "Category")}
          <Plus size={16} />
        </summary>
        <select
          aria-label={t("Тип товару", "Product type")}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">{t("Усі речі", "All types")}</option>
          {[
            ["tshirt", "Футболки", "T-shirts"],
            ["hoodie", "Худі", "Hoodies"],
            ["jacket", "Куртки", "Jackets"],
            ["trousers", "Штани", "Trousers"],
            ["sneakers", "Кросівки", "Sneakers"],
            ["bag", "Сумки", "Bags"],
          ].map(([k, u, e]) => (
            <option key={k} value={k}>
              {t(u, e)}
            </option>
          ))}
        </select>
      </details>
      <details open>
        <summary>
          {t("Ціна", "Price")}
          <Plus size={16} />
        </summary>
        <label className="range-label">
          {t("До", "Up to")} {money(max * 100, lang)}
          <input
            type="range"
            min="500"
            max="10000"
            step="100"
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </label>
        <div className="range-extents">
          <span>500 ₴</span>
          <span>10 000 ₴</span>
        </div>
      </details>
      <details open>
        <summary>
          {t("Розмір", "Size")}
          <Plus size={16} />
        </summary>
        <div className="sizes mini">
          {[
            "XS",
            "S",
            "M",
            "L",
            "XL",
            "XXL",
            "39",
            "40",
            "41",
            "42",
            "43",
            "44",
            "45",
            "ONE SIZE",
          ].map((s) => (
            <button
              key={s}
              className={size === s ? "active" : ""}
              onClick={() => setSize(size === s ? "" : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </details>
      <details>
        <summary>
          {t("Колір і сезон", "Colour & season")}
          <Plus size={16} />
        </summary>
        <select
          aria-label={t("Колір", "Colour")}
          value={color}
          onChange={(e) => setColor(e.target.value)}
        >
          <option value="">{t("Усі кольори", "All colours")}</option>
          {[
            ...new Set(products.flatMap((p) => p.colors.map((c) => c.name))),
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label={t("Сезон", "Season")}
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        >
          <option value="">{t("Усі сезони", "All seasons")}</option>
          {[...new Set(products.map((p) => p.season))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </details>
      <label className="check-label sale-check">
        <input
          type="checkbox"
          checked={onSale}
          onChange={(e) => setOnSale(e.target.checked)}
        />
        {t("Лише зі знижками", "Sale only")}
      </label>
    </div>
  );
  return (
    <main className="wrap catalog-page">
      <div className="breadcrumbs">
        <Link to="/">SNAP</Link>
        <span>/</span>
        {title}
      </div>
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">THE SNAP SELECTION</p>
          <h1>
            {title}
            <sup>{filtered.length}</sup>
          </h1>
        </div>
        <p>
          {t(
            "Вибирай те, що відчувається твоїм.",
            "Choose what feels like you.",
          )}
        </p>
      </div>
      <div className="category-pills">
        {[
          ["", "Усе", "All"],
          ["clothing", "Одяг", "Clothing"],
          ["shoes", "Взуття", "Shoes"],
          ["accessories", "Аксесуари", "Accessories"],
        ].map(([k, u, e]) => (
          <Link
            key={k}
            className={category === k ? "active" : ""}
            to={"/catalog" + (k ? "/" + k : "")}
          >
            {t(u, e)}
          </Link>
        ))}
      </div>
      <div className="catalog-layout">
        <aside className="desktop-filters">{filterContent}</aside>
        <section className="catalog-results">
          <div className="catalog-toolbar">
            <button className="filter-toggle" onClick={() => setFilters(true)}>
              <SlidersHorizontal size={17} />
              {t("Фільтри", "Filters")}
              {count > 0 && ` (${count})`}
            </button>
            <span className="result-count">
              {filtered.length} {t("товарів", "pieces")}
            </span>
            <label className="sort-label">
              {t("Сортувати:", "Sort:")}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="popular">{t("Популярні", "Popular")}</option>
                <option value="new">{t("Новинки", "Newest")}</option>
                <option value="low">
                  {t("Спочатку дешевші", "Price: low to high")}
                </option>
                <option value="high">
                  {t("Спочатку дорожчі", "Price: high to low")}
                </option>
                <option value="discount">
                  {t("Найбільша знижка", "Biggest discount")}
                </option>
              </select>
            </label>
          </div>
          {query && (
            <button className="filter-chip" onClick={() => setQuery("")}>
              «{query}» <X size={14} />
            </button>
          )}
          {selectedBrands.length > 0 && (
            <div className="active-filters">
              {selectedBrands.map((b) => (
                <button
                  className="filter-chip"
                  key={b}
                  onClick={() =>
                    setBrands(selectedBrands.filter((x) => x !== b))
                  }
                >
                  {b}
                  <X size={14} />
                </button>
              ))}
            </div>
          )}
          {filtered.length ? (
            <ProductGrid products={filtered.slice(0, visible)} />
          ) : (
            <Empty
              icon={wishlistOnly ? Heart : Search}
              title={t("Поки нічого немає", "Nothing here yet")}
              text={
                wishlistOnly
                  ? t(
                      "Зберігай речі сердечком — вони чекатимуть тут.",
                      "Save pieces with the heart button.",
                    )
                  : t(
                      "Спробуй прибрати частину фільтрів.",
                      "Try removing a few filters.",
                    )
              }
              action={
                <Button
                  kind="outline"
                  onClick={wishlistOnly ? () => navigate("/catalog") : clear}
                >
                  {t("До всіх товарів", "Browse all pieces")}
                </Button>
              }
            />
          )}{" "}
          {visible < filtered.length && (
            <div className="load-more">
              <Button kind="outline" onClick={() => setVisible((v) => v + 24)}>
                {t("Показати ще", "Load more")}
                <Plus size={18} />
              </Button>
              <small>
                {Math.min(visible, filtered.length)} / {filtered.length}
              </small>
            </div>
          )}
        </section>
      </div>
      <Modal
        open={filters}
        onClose={() => setFilters(false)}
        drawer
        title={t("Знайти своє", "Find your fit")}
      >
        {filterContent}
        <Button className="filter-apply" onClick={() => setFilters(false)}>
          {t(
            `Показати ${filtered.length} товарів`,
            `Show ${filtered.length} pieces`,
          )}
        </Button>
      </Modal>
    </main>
  );
}
function Brands() {
  const { t, brands, products } = useShop();
  const [q, setQ] = useState("");
  return (
    <main className="wrap brands-page">
      <div className="breadcrumbs">
        <Link to="/">SNAP</Link>
        <span>/</span>
        {t("Бренди", "Brands")}
      </div>
      <p className="eyebrow">THE NAMES YOU KNOW</p>
      <h1>
        {t("Топ бренди.", "Your top brands.")}
        <br />
        <span className="muted">{t("Твій вибір.", "Your own choice.")}</span>
      </h1>
      <p>
        {t(
          "Добірки реплік за брендами. SNAP не є офіційним представником.",
          "Replica collections by brand. SNAP is not an official representative.",
        )}
      </p>
      <div className="brand-search">
        <Search size={20} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Знайти бренд", "Find a brand")}
          aria-label={t("Пошук бренду", "Search brand")}
        />
      </div>
      <div className="brand-grid">
        {brands
          .filter((b) => b.toLowerCase().includes(q.toLowerCase()))
          .map((b, i) => (
            <Link key={b} to={"/brands/" + encodeURIComponent(b)}>
              <span className="brand-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{b}</h2>
              <span>
                {products.filter((p) => p.brand === b).length}{" "}
                {t("речей", "pieces")}
                <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
      </div>
    </main>
  );
}
function Product({ slug }) {
  const { products, t, lang, refresh, setToast, recent = [] } = useShop();
  const p = products.find((p) => p.slug === slug);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const chosenSize = selectedSize?.id === p?.id ? selectedSize?.size : "";
  const chosenColor = selectedColor?.id === p?.id ? selectedColor?.color : p?.colors[0]?.name;
  const gallery = productImages(p, selectedColor && p && selectedColor.id === p.id ? selectedColor.color : p?.colors[0]?.name);
  const [photo, setPhoto] = useState(0),
    [zoom, setZoom] = useState(false),
    [reviews, setReviews] = useState({ reviews: [], canReview: false }),
    [review, setReview] = useState(""),
    [rating, setRating] = useState(5),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPhoto(0);
    if (p) {
      api("/recent", { method: "POST", body: { id: p.id } }).catch(() => {});
      api("/products/" + p.id + "/reviews")
        .then(setReviews)
        .catch(() => {});
    }
  }, [p?.id]);
  if (!p)
    return (
      <Empty
        title={t("Товар не знайдено", "Product not found")}
        action={
          <Link className="button" to="/catalog">
            {t("До каталогу", "Catalog")}
          </Link>
        }
      />
    );
  async function postReview(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/products/" + p.id + "/reviews", {
        method: "POST",
        body: { rating, text: review },
      });
      setReviews(await api("/products/" + p.id + "/reviews"));
      setReview("");
      setToast(t("Дякуємо за відгук", "Thank you for your review"));
    } catch (e) {
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="wrap product-page">
      <div className="breadcrumbs">
        <Link to="/">SNAP</Link>
        <span>/</span>
        <Link to="/catalog">{t("Каталог", "Catalog")}</Link>
        <span>/</span>
        {p.brand}
      </div>
      <div className="product-detail">
        <div className="gallery">
          <button
            className="main-photo"
            onClick={() => setZoom(true)}
            aria-label={t("Збільшити фото", "Enlarge image")}
          >
            <img
              src={gallery[photo] || gallery[0]}
              alt={lang === "uk" ? p.name : p.nameEn}
              width="900"
              height="900"
            />
            <span>
              <Plus size={18} />
            </span>
          </button>
          <div className="thumbnails">
            {gallery.map((src, i) => (
              <button
                key={src + i}
                className={i === photo ? "active" : ""}
                onClick={() => setPhoto(i)}
                aria-label={`${t("Фото", "Photo")} ${i + 1}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
          {p.demo && (
            <p className="fine">
              {t(
                "Демонстраційне фото. Не зображує реальний товар бренду.",
                "Demo image. Does not depict an actual product from the brand.",
              )}
            </p>
          )}
        </div>
        <div className="product-description">
          <Link
            className="eyebrow brand-title"
            to={"/brands/" + encodeURIComponent(p.brand)}
          >
            {p.brand}
            <ArrowUpRight size={14} />
          </Link>
          <h1>{lang === "uk" ? p.name : p.nameEn}</h1>
          <p className="replica-label">
            {t(
              "Люксова репліка • не оригінал",
              "Luxury replica • not original",
            )}
          </p>
          <div className="detail-price">
            <ProductPrice product={p} size={chosenSize} color={chosenColor} old />
          </div>
          <p className="fine">
            {t("Код товару", "SKU")}: {p.sku}
          </p>
          <VariantPicker key={p.id} product={p} onColorChange={(color) => { setSelectedColor({ id: p.id, color }); setPhoto(0); }} onSizeChange={(size) => setSelectedSize({ id: p.id, size })} />
          <div className="detail-perks">
            <p>
              <Truck size={18} />
              {t(
                "Доставка по Україні. Оплата при отриманні.",
                "Delivery across Ukraine. Pay on delivery.",
              )}
            </p>
            <p>
              <Gift size={18} />
              {t(
                "Бонуси після отримання замовлення",
                "Earn rewards after delivery",
              )}
            </p>
          </div>
          <details open>
            <summary>
              {t("Про товар", "About this piece")}
              <Plus size={16} />
            </summary>
            <p>{lang === "uk" ? p.description : p.descriptionEn}</p>
            <p>
              {t("Склад", "Composition")}: {p.composition}
            </p>
            <p>
              {t("Посадка", "Fit")}: {p.fit}
            </p>
          </details>
          <details>
            <summary>
              {t("Таблиця розмірів", "Size guide")}
              <Plus size={16} />
            </summary>
            <p className="preserve-lines">{p.sizeGuide}</p>
          </details>
          <details>
            <summary>
              {t("Доставка та повернення", "Shipping & returns")}
              <Plus size={16} />
            </summary>
            <Link className="text-link" to="/delivery">
              {t("Умови доставки", "Shipping information")}
              <ArrowUpRight size={15} />
            </Link>
            <Link className="text-link" to="/returns">
              {t("Умови повернення", "Return policy")}
              <ArrowUpRight size={15} />
            </Link>
          </details>
        </div>
      </div>
      <section className="reviews-section">
        <div className="section-top">
          <h2>{t("Слово покупцям", "From our community")}</h2>
          <span className="verified-note">
            <ShieldCheck size={17} />
            {t("Лише перевірені покупки", "Verified purchases only")}
          </span>
        </div>
        {reviews.reviews.length ? (
          reviews.reviews.map((r) => (
            <article className="review" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <span aria-label={`${r.rating}/5`}>
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
              </div>
              <p>{r.text}</p>
              <small>
                {new Date(r.created_at).toLocaleDateString(
                  lang === "uk" ? "uk-UA" : "en-GB",
                )}{" "}
                · {t("Покупку підтверджено", "Verified purchase")}
              </small>
            </article>
          ))
        ) : (
          <p className="muted">
            {t(
              "Тут ще немає відгуків. Після отримання покупки ти зможеш залишити свій.",
              "No reviews yet. Leave yours after your purchase is delivered.",
            )}
          </p>
        )}
        {reviews.canReview && (
          <form onSubmit={postReview} className="form">
            <label>
              {t("Оцінка", "Rating")}
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              {t("Твій відгук", "Your review")}
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </label>
            <Button busy={busy}>
              {t("Опублікувати відгук", "Post review")}
            </Button>
          </form>
        )}
      </section>
      <section className="product-section">
        <div className="section-top">
          <h2>{t("Твій наступний match", "Your next match")}</h2>
        </div>
        <ProductGrid
          products={products
            .filter((x) => x.category === p.category && x.id !== p.id)
            .slice(0, 4)}
        />
      </section>
      {recent.filter((id) => id !== p.id).length > 0 && (
        <section className="product-section">
          <h2>{t("Нещодавно переглянуті", "Recently viewed")}</h2>
          <ProductGrid
            products={recent
              .filter((id) => id !== p.id)
              .map((id) => products.find((p) => p.id === id))
              .filter(Boolean)
              .slice(0, 4)}
          />
        </section>
      )}
      <Modal
        open={zoom}
        onClose={() => setZoom(false)}
        title={lang === "uk" ? p.name : p.nameEn}
        wide
      >
        <img className="zoom-photo" src={gallery[photo] || gallery[0]} alt={p.name} />
      </Modal>
    </main>
  );
}
function Info({ page }) {
  const { settings: s, t, lang, setLoginOpen, user } = useShop();
  const titles = {
    delivery: t("Доставка та оплата", "Shipping & payment"),
    returns: t("Повернення", "Returns"),
    privacy: t("Конфіденційність", "Privacy"),
    terms: t("Умови покупки", "Terms of sale"),
    about: t("Про SNAP", "About SNAP"),
    contacts: t("На зв’язку", "Get in touch"),
    club: "SNAP CLUB",
  };
  const key = {
    delivery: "deliveryText",
    returns: "returnsText",
    privacy: "privacyText",
    terms: "termsText",
  }[page];
  return (
    <main className="wrap info-page">
      <div className="breadcrumbs">
        <Link to="/">SNAP</Link>
        <span>/</span>
        {titles[page]}
      </div>
      <p className="eyebrow">GOOD TO KNOW</p>
      <h1>{titles[page]}</h1>
      {key ? (
        <>
          {page === "delivery" && <Carriers className="delivery-carriers" />}
          <p className="preserve-lines">
            {s[key + (lang === "en" ? "En" : "")]}
          </p>
          {page === "terms" && <p>{s.sellerDetails}</p>}
          {!s.policiesApproved && page !== "delivery" && (
            <div className="notice">
              {t(
                "Чернетка: продавець має затвердити цю сторінку до початку продажів.",
                "Draft: the seller must approve this page before opening sales.",
              )}
            </div>
          )}
        </>
      ) : page === "club" ? (
        <>
          <p>
            {t(
              "Купуй речі, які тобі близькі. Збирай бонуси на наступні.",
              "Choose the pieces you love. Earn rewards for the next ones.",
            )}
          </p>
          <div className="club-cards">
            <div>
              <b>{s.bonusPercent}%</b>
              <h3>{t("Повертаємо бонусами", "Back in rewards")}</h3>
              <p>
                {t(
                  "Від фактичної суми товарів після знижок. Бонуси доступні, коли замовлення отримано.",
                  "Based on the amount paid for products after discounts. Rewards arrive when the order is delivered.",
                )}
              </p>
            </div>
            <div>
              <b>{s.bonusSpendPercent}%</b>
              <h3>{t("Наступного замовлення", "Towards your next order")}</h3>
              <p>
                {t(
                  "Можна оплатити бонусами. 1 бонусна гривня = 1 гривня знижки. Доставка не входить.",
                  "Can be paid with rewards. UAH 1 in rewards = UAH 1 off. Excludes shipping.",
                )}
              </p>
            </div>
            <div>
              <b>5–20%</b>
              <h3>{t("За кількість речей", "Quantity discount")}</h3>
              <p>
                {t(
                  "5 речей = 5%, 6 = 6% і так до 20%. Рахуємо всі одиниці в одному кошику.",
                  "5 pieces = 5%, 6 = 6%, up to 20%. All units in one bag count.",
                )}
              </p>
            </div>
          </div>
          <p className="fine">
            {t(
              "Промокод і знижку за кількість не підсумовуємо: застосовується вигідніша. Бонуси — після неї. За скасовану чи повернену покупку нарахування анулюється. Демозамовлення бонусів не дають.",
              "Promo and quantity discounts do not stack: the better discount applies. Rewards apply afterwards. Cancelled or returned purchases have their rewards reversed. Demo orders earn no rewards.",
            )}
          </p>
          <Button
            onClick={() => (user ? navigate("/account") : setLoginOpen(true))}
          >
            {t("Мій SNAP Club", "My SNAP Club")}
            <ArrowRight size={18} />
          </Button>
        </>
      ) : page === "about" ? (
        <>
          <p>
            {t(
              "SNAP — чоловічий одяг, взуття й аксесуари для власного ритму. Ми поєднуємо зручний вибір, зрозумілі ціни та бонуси за покупки.",
              "SNAP is menswear, footwear and accessories for your own rhythm. Easy discovery, transparent prices and rewards on purchases.",
            )}
          </p>
          <p>
            {t(
              "У нашому магазині — репліки, не оригінали. Ми не є офіційними представниками зазначених брендів. Назви використовуємо для навігації каталогом.",
              "Our store offers replicas, not originals. We are not official representatives of the listed brands. Names are used to organize the catalog.",
            )}
          </p>
        </>
      ) : (
        <div className="contacts-list">
          {s.supportEmail && (
            <a href={"mailto:" + s.supportEmail}>
              <Mail />
              {s.supportEmail}
            </a>
          )}
          {s.phone && <a href={"tel:" + s.phone}>{s.phone}</a>}
          {["telegram", "instagram", "viber", "whatsapp"]
            .filter((k) => s[k])
            .map((k) => (
              <a key={k} href={s[k]} target="_blank" rel="noopener noreferrer">
                {k}
                <ArrowUpRight size={18} />
              </a>
            ))}
          {!s.supportEmail && !s.phone && !s.telegram && !s.instagram && (
            <p className="notice">
              {t(
                "Контакти магазину ще не додано. Власник заповнить їх перед запуском.",
                "Store contacts have not been added yet. The owner will provide them before launch.",
              )}
            </p>
          )}
          {s.sellerDetails && <p>{s.sellerDetails}</p>}
        </div>
      )}
    </main>
  );
}
function Footer() {
  const { t, settings: s } = useShop();
  const [email, setEmail] = useState(""),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState("");
  return (
    <>
      <footer className="footer">
        <div className="wrap footer-top">
          <div className="footer-brand">
            <Link className="logo" to="/">
              <img
                src="/brand/snap-logo-full.png"
                alt="SNAP Store"
                width="2047"
                height="926"
                loading="lazy"
              />
            </Link>
            <p>
              PREMIUM LOOK.
              <br />
              SMART PRICE.
            </p>
            <Carriers className="footer-carriers" />
            <div className="socials">
              {s.instagram && (
                <a
                  aria-label="Instagram"
                  href={s.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram size={21} />
                </a>
              )}
              {s.telegram && (
                <a
                  aria-label="Telegram"
                  href={s.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send size={21} />
                </a>
              )}
            </div>
          </div>
          <div>
            <h3>{t("Твій SNAP", "Your SNAP")}</h3>
            <Link to="/catalog">{t("Каталог", "Catalog")}</Link>
            <Link to="/brands">{t("Топ бренди", "Top brands")}</Link>
            <Link to="/stylist">SNAP Studio</Link>
            <Link to="/club">SNAP Club</Link>
          </div>
          <div>
            <h3>{t("Допоможемо", "Here to help")}</h3>
            <Link to="/delivery">
              {t("Доставка та оплата", "Shipping & payment")}
            </Link>
            <Link to="/returns">{t("Повернення", "Returns")}</Link>
            <Link to="/contacts">{t("Контакти", "Contact")}</Link>
            <Link to="/about">{t("Про нас", "About us")}</Link>
          </div>
          <div className="footer-note">
            <h3>{t("Чесно про головне", "Keep it transparent")}</h3>
            <p>
              {t(
                "Люксові репліки. Не оригінали. SNAP не пов’язаний з власниками торговельних марок.",
                "Luxury replicas. Not originals. SNAP is not affiliated with the trademark owners.",
              )}
            </p>
            {s.newsletterEnabled && (
              <form
                className="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api("/newsletter", {
                      method: "POST",
                      body: { email, consent },
                    });
                    setMessage(t("Підписку збережено", "Subscription saved"));
                  } catch (e) {
                    setMessage(e.message);
                  }
                }}
              >
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                  />
                  {t("Хочу отримувати новини", "I want to receive news")}
                </label>
                <Button kind="light">{t("Підписатися", "Subscribe")}</Button>
                <p role="status">{message}</p>
              </form>
            )}
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} SNAP Store</span>
          <div>
            <Link to="/privacy">{t("Конфіденційність", "Privacy")}</Link>
            <Link to="/terms">{t("Умови покупки", "Terms")}</Link>
            {s.analyticsEnabled && (
              <button
                className="text-link"
                onClick={() => window.dispatchEvent(new Event("snap-consent"))}
              >
                {t("Налаштування cookies", "Cookie settings")}
              </button>
            )}
            <Link to="/admin">{t("Адміністратор", "Admin")}</Link>
          </div>
          <span>MADE FOR YOUR EVERYDAY.</span>
        </div>
      </footer>
      <nav
        className="bottom-nav"
        aria-label={t("Швидка навігація", "Quick navigation")}
      >
        <Link to="/catalog">
          <Search size={21} />
          {t("Каталог", "Shop")}
        </Link>
        <Link to="/brands">
          <Menu size={21} />
          {t("Бренди", "Brands")}
        </Link>
        <Link className="studio-bottom" to="/stylist">
          <Sparkles size={22} />
          Studio
        </Link>
        <Link to="/wishlist">
          <Heart size={21} />
          {t("Обране", "Saved")}
        </Link>
        <Link to="/account">
          <User size={21} />
          {t("Кабінет", "Account")}
        </Link>
      </nav>
    </>
  );
}
function App() {
  const ctx = useShop(),
    route = useRoute(),
    { data, error, t, refresh, loginOpen, setLoginOpen, toast } = ctx;
  const pathname = route.split("?")[0];
  useEffect(() => {
    if (!data) return;
    const p = ctx.products.find((p) => "/product/" + p.slug === pathname);
    const labels = {
      catalog: t("Каталог", "Catalog"),
      clothing: t("Чоловічий одяг", "Menswear"),
      shoes: t("Взуття", "Footwear"),
      accessories: t("Аксесуари", "Accessories"),
      new: t("Новинки", "New in"),
      sale: t("Розпродаж", "Sale"),
      brands: t("Бренди", "Brands"),
      account: t("Мій кабінет", "My account"),
      checkout: t("Оформлення замовлення", "Checkout"),
      admin: t("Керування магазином", "Store management"),
      wishlist: t("Обране", "Wishlist"),
      stylist: "SNAP Studio",
      delivery: t("Доставка та оплата", "Delivery & payment"),
      returns: t("Повернення", "Returns"),
      privacy: t("Конфіденційність", "Privacy"),
      terms: t("Умови продажу", "Terms"),
      contacts: t("Контакти", "Contacts"),
      about: t("Про SNAP", "About SNAP"),
      club: "SNAP Club",
    };
    const last = decodeURIComponent(pathname.split("/").pop() || "");
    const title = p
      ? `${ctx.lang === "uk" ? p.name : p.nameEn} — ${t("репліка", "replica")} ${p.brand} | SNAP`
      : pathname === "/"
        ? t(
            "SNAP — чоловічий одяг, взуття та люксові репліки",
            "SNAP — menswear, footwear and luxury replicas",
          )
        : `${labels[last] || last} | SNAP`;
    document.title = title;
    const description = p
      ? `${ctx.lang === "uk" ? p.name : p.nameEn}. ${t("Репліка, не оригінал. Доставка Україною.", "Replica, not original. Delivery within Ukraine.")} ${priceRange(p).min !== priceRange(p).max ? t("від ", "from ") : ""}${money(priceRange(p).min, ctx.lang)}`
      : t(
          "Чоловічий одяг, взуття та аксесуари SNAP. Репліки, не оригінали. Доставка Україною, оплата при отриманні.",
          "SNAP menswear, footwear and accessories. Replicas, not originals. Delivery within Ukraine, payment on delivery.",
        );
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = new URL(pathname, canonical.href).href;
    const noindex =
      !ctx.settings.seoIndex ||
      !ctx.settings.shopLive ||
      route.includes("?") ||
      Boolean(p?.demo) ||
      /^\/(admin|account|checkout|wishlist|stylist)/.test(pathname);
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute("content", noindex ? "noindex,follow" : "index,follow");
    // Remove record-specific server metadata when navigating away from its product.
    document
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((el) => el.remove());
    if (p && !p.demo) {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name + " — репліка",
        description,
        sku: p.sku,
        image: p.images.map(
          (i) => new URL(i, canonical?.href || location.origin).href,
        ),
        offers: {
          ...offerPrices(p),
          priceCurrency: "UAH",
          availability: p.variants.some((v) => v.available)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: canonical?.href,
        },
      });
      document.head.appendChild(el);
    }
  }, [pathname, route, data, ctx.products, ctx.lang, t]);
  if (error && !data)
    return (
      <Empty
        title="SNAP"
        text={error}
        action={
          <Button onClick={() => refresh().catch(() => {})}>
            {t("Спробувати ще", "Try again")}
          </Button>
        }
      />
    );
  if (!data)
    return (
      <div className="initial-loading">
        <span>SNAP</span>
        <div className="loading-bar" />
      </div>
    );
  let page;
  if (pathname === "/") page = <Home />;
  else if (pathname.startsWith("/catalog"))
    page = <Catalog category={pathname.split("/")[2] || ""} />;
  else if (pathname === "/brands") page = <Brands />;
  else if (pathname.startsWith("/brands/"))
    page = <Catalog brand={decodeURIComponent(pathname.slice(8))} />;
  else if (pathname.startsWith("/product/"))
    page = <Product slug={pathname.slice(9)} />;
  else if (pathname === "/wishlist") page = <Catalog wishlistOnly />;
  else if (pathname === "/checkout") page = <Checkout />;
  else if (pathname === "/account") page = <Account />;
  else if (pathname === "/admin") page = <Admin />;
  else if (pathname === "/stylist") page = <Studio />;
  else if (
    [
      "delivery",
      "returns",
      "privacy",
      "terms",
      "about",
      "contacts",
      "club",
    ].includes(pathname.slice(1))
  )
    page = <Info page={pathname.slice(1)} />;
  else
    page = (
      <Empty
        title="404"
        text={t("Такої сторінки немає", "Page not found")}
        action={
          <Link className="button" to="/">
            {t("На головну", "Home")}
          </Link>
        }
      />
    );
  return (
    <>
      <a className="skip-link" href="#content">
        {t("До вмісту", "Skip to content")}
      </a>
      <Header />
      {ctx.user?.isAdmin && (
        <nav className="owner-bar" aria-label={t("Керування магазином", "Store management")}>
          <div className="wrap owner-bar-inner">
            <Link to="/admin" className="owner-home"><ShieldCheck size={18} />{t("Панель керування", "Manage store")}</Link>
            <div className="owner-shortcuts">
              <Link to="/admin?tab=products">{t("Товари", "Products")}</Link>
              <Link to="/admin?tab=brands">{t("Бренди", "Brands")}</Link>
              <Link to="/admin?tab=orders">{t("Замовлення", "Orders")}</Link>
              <Link to="/admin?tab=settings">{t("Налаштування", "Settings")}</Link>
              <Link to="/admin?tab=overview" className="owner-mode">{ctx.settings.shopLive ? t("Продажі відкрито", "Sales open") : t("Підготовка магазину", "Store setup")}</Link>
            </div>
          </div>
        </nav>
      )}
      <AgentTools />
      <Consent />
      <div id="content" tabIndex={-1}>
        <Suspense
          fallback={
            <div className="page-loading">
              <span className="loading-bar" />
              {t("Завантажуємо…", "Loading…")}
            </div>
          }
        >
          {page}
        </Suspense>
      </div>
      <Footer />
      <CartDrawer />
      <QuickView />
      <Modal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title={t("Особистий кабінет", "My account")}
      >
        <Login onSuccess={() => setLoginOpen(false)} />
      </Modal>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {!ctx.settings.shopLive && (
        <div
          className="demo-indicator"
          title={t(
            "Демо-каталог. Реальні продажі вимкнені.",
            "Demo catalog. Live sales are disabled.",
          )}
        >
          <span />
          {t("Демо-каталог · продажі ще не відкрито", "Demo catalog · sales not open yet")}
        </div>
      )}
    </>
  );
}
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e) {
    console.error(e);
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h1>SNAP</h1>
        <p>Щось пішло не так. Оновіть сторінку.</p>
        <button className="button" onClick={() => location.reload()}>
          Спробувати знову
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function Storefront() {
  return (
    <ErrorBoundary>
      <Provider>
        <App />
      </Provider>
    </ErrorBoundary>
  );
}
export const appRoot = createRoot(document.getElementById("root"));
appRoot.render(<Storefront />);
