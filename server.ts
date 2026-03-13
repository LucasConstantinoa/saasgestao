import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("trafficflow.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    type TEXT DEFAULT 'direct_sales',
    monthly_budget REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0,
    budget REAL DEFAULT 0,
    report_sent BOOLEAN DEFAULT 0,
    last_deduction_date DATE DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campaign_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    objective TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    group_id INTEGER,
    name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    spend REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES campaign_groups(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    sale_value REAL DEFAULT 0,
    membership_fee REAL DEFAULT 0,
    monthly_fee REAL DEFAULT 0,
    item_sold TEXT,
    adhesion_value REAL DEFAULT 0,
    commission_value REAL DEFAULT 0,
    has_installment BOOLEAN DEFAULT 0,
    installments INTEGER DEFAULT 0,
    installment_value REAL DEFAULT 0,
    total_ltv REAL NOT NULL,
    roi REAL DEFAULT 0,
    date DATE NOT NULL,
    product TEXT,
    channel TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    detail TEXT,
    type TEXT DEFAULT 'info',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS branch_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_date DATETIME,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
  );
`);

// Migration to add missing columns to existing databases
const migrations = [
  { table: 'branches', column: 'last_deduction_date', type: 'DATE DEFAULT \'2000-01-01\'' },
  { table: 'companies', column: 'type', type: "TEXT DEFAULT 'direct_sales'" },
  { table: 'sales', column: 'membership_fee', type: 'REAL DEFAULT 0' },
  { table: 'sales', column: 'monthly_fee', type: 'REAL DEFAULT 0' },
  { table: 'sales', column: 'item_sold', type: 'TEXT' }
];

for (const m of migrations) {
  try {
    db.prepare(`SELECT ${m.column} FROM ${m.table} LIMIT 1`).get();
  } catch (e) {
    try {
      db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
      console.log(`Migration: Added ${m.column} column to ${m.table} table`);
    } catch (err) {
      console.error(`Migration failed for ${m.table}.${m.column}:`, err);
    }
  }
}

// Function to process daily deductions
function processDailyDeductions() {
  const today = new Date().toISOString().split('T')[0];
  
  // Get branches that need deduction (last_deduction_date is before today or null)
  const branches = db.prepare("SELECT * FROM branches WHERE last_deduction_date < ? OR last_deduction_date IS NULL").all(today);
  
  for (const branch of branches as any[]) {
    if (!branch.last_deduction_date) {
      // If no date is set, just set it to today to start tracking
      db.prepare("UPDATE branches SET last_deduction_date = ? WHERE id = ?").run(today, branch.id);
      continue;
    }

    const lastDate = new Date(branch.last_deduction_date);
    const currentDate = new Date(today);
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      // Get daily spend for this branch
      const campaigns = db.prepare("SELECT spend FROM campaigns WHERE branch_id = ?").all(branch.id) as any[];
      const dailySpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
      
      if (dailySpend > 0) {
        const totalDeduction = dailySpend * diffDays;
        db.prepare("UPDATE branches SET balance = balance - ?, last_deduction_date = ? WHERE id = ?").run(totalDeduction, today, branch.id);
        
        // Log the deduction
        db.prepare("INSERT INTO audit_log (action, detail, type) VALUES (?, ?, ?)").run(
          'Dedução Automática', 
          `Dedução de R$ ${totalDeduction.toFixed(2)} (${diffDays} dias) da filial "${branch.name}"`, 
          'info'
        );
      } else {
        db.prepare("UPDATE branches SET last_deduction_date = ? WHERE id = ?").run(today, branch.id);
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Run deductions on startup
  processDailyDeductions();
  
  // Run deductions every hour
  setInterval(processDailyDeductions, 60 * 60 * 1000);

  // --- API ROUTES ---

  // Companies
  app.get("/api/companies", (req, res) => {
    const companies = db.prepare("SELECT * FROM companies").all();
    res.json(companies);
  });

  app.post("/api/companies", (req, res) => {
    const { name, logo, monthly_budget, type } = req.body;
    const result = db.prepare("INSERT INTO companies (name, logo, monthly_budget, type) VALUES (?, ?, ?, ?)").run(name, logo, monthly_budget, type || 'direct_sales');
    const newCompany = db.prepare("SELECT * FROM companies WHERE id = ?").get(result.lastInsertRowid);
    res.json(newCompany);
  });

  app.put("/api/companies/:id", (req, res) => {
    const { name, logo, monthly_budget, type } = req.body;
    db.prepare("UPDATE companies SET name = ?, logo = ?, monthly_budget = ?, type = ? WHERE id = ?").run(name, logo, monthly_budget, type, req.params.id);
    const updatedCompany = db.prepare("SELECT * FROM companies WHERE id = ?").get(req.params.id);
    res.json(updatedCompany);
  });

  app.delete("/api/companies/:id", (req, res) => {
    db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Branches
  app.get("/api/companies/:companyId/branches", (req, res) => {
    processDailyDeductions();
    const branches = db.prepare("SELECT * FROM branches WHERE company_id = ?").all(req.params.companyId);
    res.json(branches);
  });

  app.get("/api/branches", (req, res) => {
    processDailyDeductions();
    const branches = db.prepare("SELECT * FROM branches").all();
    res.json(branches);
  });

  app.post("/api/companies/:companyId/branches", (req, res) => {
    const { name, balance, budget } = req.body;
    const result = db.prepare("INSERT INTO branches (company_id, name, balance, budget) VALUES (?, ?, ?, ?)").run(req.params.companyId, name, balance, budget);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/branches/:id", (req, res) => {
    const { name, balance, budget, report_sent } = req.body;
    db.prepare("UPDATE branches SET name = ?, balance = ?, budget = ?, report_sent = ? WHERE id = ?").run(name, balance, budget, report_sent ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/branches/:id", (req, res) => {
    db.prepare("DELETE FROM branches WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Campaigns
  app.get("/api/branches/:branchId/campaigns", (req, res) => {
    const campaigns = db.prepare("SELECT * FROM campaigns WHERE branch_id = ?").all(req.params.branchId);
    res.json(campaigns);
  });

  app.post("/api/branches/:branchId/campaigns", (req, res) => {
    const { name, purpose, spend, group_id } = req.body;
    const result = db.prepare("INSERT INTO campaigns (branch_id, name, purpose, spend, group_id) VALUES (?, ?, ?, ?, ?)").run(req.params.branchId, name, purpose, spend, group_id);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/campaigns/:id", (req, res) => {
    db.prepare("DELETE FROM campaigns WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Sales
  app.get("/api/branches/:branchId/sales", (req, res) => {
    const sales = db.prepare("SELECT * FROM sales WHERE branch_id = ?").all(req.params.branchId);
    res.json(sales);
  });

  app.post("/api/branches/:branchId/sales", (req, res) => {
    const { 
      client_name, sale_value, adhesion_value, commission_value, 
      has_installment, installments, installment_value, total_ltv, 
      roi, date, product, channel, notes, membership_fee, monthly_fee, item_sold 
    } = req.body;
    
    const result = db.prepare(`
      INSERT INTO sales (
        branch_id, client_name, sale_value, adhesion_value, commission_value, 
        has_installment, installments, installment_value, total_ltv, roi, 
        date, product, channel, notes, membership_fee, monthly_fee, item_sold
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.branchId, client_name, sale_value || 0, adhesion_value || 0, commission_value || 0, 
      has_installment ? 1 : 0, installments || 0, installment_value || 0, total_ltv, roi || 0, 
      date, product || item_sold, channel, notes, membership_fee || 0, monthly_fee || 0, item_sold
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/sales/:id", (req, res) => {
    db.prepare("DELETE FROM sales WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Audit Log
  app.get("/api/audit-log", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  app.post("/api/audit-log", (req, res) => {
    const { action, detail, type } = req.body;
    db.prepare("INSERT INTO audit_log (action, detail, type) VALUES (?, ?, ?)").run(action, detail, type);
    res.json({ success: true });
  });

  // Notifications
  app.get("/api/notifications", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50").all();
    res.json(notifications);
  });

  app.put("/api/notifications/read-all", (req, res) => {
    db.prepare("UPDATE notifications SET read = 1").run();
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Branch Reports
  app.get("/api/branch-reports", (req, res) => {
    const reports = db.prepare(`
      SELECT br.*, b.name as branch_name, c.name as company_name 
      FROM branch_reports br
      JOIN branches b ON br.branch_id = b.id
      JOIN companies c ON b.company_id = c.id
      ORDER BY br.sent_date DESC
    `).all();
    res.json(reports);
  });

  app.post("/api/branch-reports", (req, res) => {
    const { branch_id, period_start, period_end } = req.body;
    const result = db.prepare("INSERT INTO branch_reports (branch_id, period_start, period_end) VALUES (?, ?, ?)").run(branch_id, period_start, period_end);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/branch-reports/:id/receive", (req, res) => {
    db.prepare("UPDATE branch_reports SET status = 'received', received_date = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
