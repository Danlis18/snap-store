import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { seedProducts, defaultSettings, brands as seedBrands } from "./seed.js";
export function createStore(directory) {
  mkdirSync(directory, { recursive: true });
  mkdirSync(path.join(directory, "uploads"), { recursive: true });
  const db = new DatabaseSync(path.join(directory, "snap.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  db.exec(`
 CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS brands(name TEXT PRIMARY KEY COLLATE NOCASE);
 CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,active INTEGER NOT NULL,demo INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',addresses TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL,recent TEXT NOT NULL DEFAULT '[]');
 CREATE TABLE IF NOT EXISTS otps(email TEXT PRIMARY KEY,hash TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS carts(owner TEXT PRIMARY KEY,data TEXT NOT NULL DEFAULT '[]');
 CREATE TABLE IF NOT EXISTS wishlists(owner TEXT PRIMARY KEY,data TEXT NOT NULL DEFAULT '[]');
 CREATE TABLE IF NOT EXISTS promos(code TEXT PRIMARY KEY,percent INTEGER NOT NULL CHECK(percent BETWEEN 1 AND 50),min_total INTEGER NOT NULL DEFAULT 0,max_uses INTEGER NOT NULL DEFAULT 0,expires TEXT,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL,demo INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL,created_at TEXT NOT NULL,idempotency TEXT NOT NULL UNIQUE);
 CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),order_id TEXT NOT NULL REFERENCES orders(id),amount INTEGER NOT NULL,kind TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(order_id,kind));
 CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),user_id TEXT NOT NULL REFERENCES users(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),text TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(product_id,user_id));
 CREATE TABLE IF NOT EXISTS newsletter(email TEXT PRIMARY KEY,created_at TEXT NOT NULL,consent TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,recipient TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_try INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_products_active ON products(active,demo);
 CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id,created_at DESC);
 CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id);
 CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id,created_at);
 CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires);
 CREATE INDEX IF NOT EXISTS idx_outbox_retry ON outbox(status,next_try);
 `);
  if (!db.prepare("SELECT 1 FROM migrations WHERE version=1").get()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const put = db.prepare("INSERT INTO products VALUES(?,?,?,?,?)");
      for (const p of seedProducts())
        put.run(p.id, p.slug, 1, 1, JSON.stringify(p));
      db.prepare("INSERT INTO settings VALUES(1,?)").run(
        JSON.stringify(defaultSettings),
      );
      db.prepare("INSERT INTO promos VALUES(?, ?, ?, ?, ?, ?)").run(
        "SNAP10",
        10,
        200000,
        0,
        null,
        1,
      );
      db.prepare("INSERT INTO migrations VALUES(1,?)").run(
        new Date().toISOString(),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  if (!db.prepare("SELECT 1 FROM migrations WHERE version=2").get()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const put = db.prepare("INSERT OR IGNORE INTO brands(name) VALUES(?)");
      for (const name of seedBrands) put.run(name);
      for (const row of db.prepare("SELECT data FROM products").all()) put.run(JSON.parse(row.data).brand);
      db.prepare("INSERT INTO migrations VALUES(2,?)").run(new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  const brands = () => db.prepare("SELECT name FROM brands ORDER BY name COLLATE NOCASE").all().map((row) => row.name);
  db.exec("PRAGMA optimize");
  const tx = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      db.exec("COMMIT");
      return r;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const settings = () => ({
    ...defaultSettings,
    ...JSON.parse(
      db.prepare("SELECT data FROM settings WHERE id=1").get().data,
    ),
  });
  const products = (all = false) =>
    db
      .prepare(`SELECT data FROM products ${all ? "" : "WHERE active=1"}`)
      .all()
      .map((r) => JSON.parse(r.data));
  const product = (id) => {
    const r = db
      .prepare("SELECT data FROM products WHERE id=? OR slug=?")
      .get(id, id);
    return r ? JSON.parse(r.data) : null;
  };
  const balance = (id) =>
    Math.max(
      0,
      db
        .prepare(
          "SELECT COALESCE(SUM(amount),0) AS balance FROM ledger WHERE user_id=?",
        )
        .get(id).balance,
    );
  const getList = (table, owner) => {
    if (!["carts", "wishlists"].includes(table)) throw Error("table");
    const r = db.prepare(`SELECT data FROM ${table} WHERE owner=?`).get(owner);
    return r ? JSON.parse(r.data) : [];
  };
  const setList = (table, owner, list) => {
    if (!["carts", "wishlists"].includes(table)) throw Error("table");
    db.prepare(
      `INSERT INTO ${table}(owner,data) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data`,
    ).run(owner, JSON.stringify(list));
  };
  return { db, tx, brands, settings, products, product, balance, getList, setList };
}
