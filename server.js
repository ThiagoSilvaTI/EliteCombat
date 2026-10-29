const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = process.env.PORT || 3847;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const TURMA = { BABY: "baby", KIDS: "kids", JOVEM: "jovem_adulto" };

const DEFAULT_UNIFORMS = [
  { id: "u1", name: "Camisa", icon: "👕", desc: "Camisa oficial Elite Combat — tecido respirável para treinos." },
  { id: "u2", name: "Short", icon: "🩳", desc: "Short de Muay Thai com elástico reforçado e logo bordado." },
  { id: "u3", name: "Bandagem", icon: "🎀", desc: "Bandagem elástica 5 m — proteção para punhos e tornozelos." },
  { id: "u4", name: "Luva", icon: "🥊", desc: "Luvas de treino 10–16 oz conforme idade e peso." },
  { id: "u5", name: "Caneleira", icon: "🦵", desc: "Caneleira com proteção de instep — uso obrigatório no sparring." },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

const sessions = new Map();

function uid() {
  return crypto.randomBytes(8).toString("hex");
}

function defaultDb() {
  return {
    users: [],
    announcements: [],
    attendanceSessions: [],
    payments: [],
    uniforms: DEFAULT_UNIFORMS,
    delegatedStudentIds: [],
  };
}

function readDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const d = defaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2), "utf8");
    return d;
  }
  try {
    return { ...defaultDb(), ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) };
  } catch {
    return defaultDb();
  }
}

function writeDb(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

function normalizePhone(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11) return "55" + digits;
  if (digits.length === 13 && digits.startsWith("55")) return digits;
  if (digits.length >= 10 && digits.length <= 13) {
    return digits.startsWith("55") ? digits : "55" + digits;
  }
  return digits;
}

function turmaFromAge(age) {
  const n = Number(age);
  if (n >= 5 && n <= 8) return TURMA.BABY;
  if (n >= 9 && n <= 13) return TURMA.KIDS;
  if (n >= 14) return TURMA.JOVEM;
  return null;
}

function randomChars(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

function getUser(db, id) {
  return db.users.find((u) => u.id === id) || null;
}

function isProfessor(u) {
  return u && u.role === "professor";
}

function canPost(db, u) {
  if (!u) return false;
  if (isProfessor(u)) return true;
  return db.delegatedStudentIds.includes(u.id);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function getToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function auth(req) {
  const token = getToken(req);
  if (!token || !sessions.has(token)) return null;
  return { token, userId: sessions.get(token) };
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname === "/" ? "index.html" : pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (pathname.startsWith("/api")) return false;
    filePath = path.join(ROOT, "index.html");
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleApi(req, res, pathname) {
  const method = req.method;

  if (method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, name: "Elite Combat" });
  }

  if (method === "GET" && pathname === "/api/bootstrap") {
    const db = readDb();
    return sendJson(res, 200, { hasUsers: db.users.length > 0, uniforms: db.uniforms });
  }

    if (method === "POST" && pathname === "/api/register") {
    const body = await readBody(req);
    const name = String(body.name || "").trim();
    const phone = normalizePhone(body.phone);
    const age = Number(body.age);
    const password = String(body.password || "").trim();
    const db = readDb();

    if (name.length < 3) return sendJson(res, 400, { error: "Informe o nome completo." });
    if (!phone || phone.length < 12) return sendJson(res, 400, { error: "WhatsApp inválido (use DDD)." });
    if (password.length < 6) {
      return sendJson(res, 400, { error: "A senha deve ter pelo menos 6 caracteres." });
    }
    if (db.users.some((u) => u.phone === phone)) {
      return sendJson(res, 400, { error: "Este WhatsApp já está cadastrado." });
    }

    const isFirst = db.users.length === 0;
    let role = "aluno";
    let turma = null;

    if (isFirst) {
      role = "professor";
      if (!age || age < 1) return sendJson(res, 400, { error: "Informe sua idade." });
    } else {
      turma = turmaFromAge(age);
      if (!turma) {
        return sendJson(res, 400, {
          error: "Idade inválida. Baby: 5–8, Kids: 9–13, Jovem/Adulto: 14+.",
        });
      }
    }

    db.users.push({
      id: uid(),
      name,
      phone,
      age,
      role,
      turma,
      password,
      createdAt: Date.now(),
    });
    writeDb(db);
    return sendJson(res, 201, {
      ok: true,
      role,
      turma,
      message: "Cadastro realizado com sucesso.",
    });
  }

  if (method === "POST" && pathname === "/api/login") {
    const body = await readBody(req);
    const phone = normalizePhone(body.phone);
    const password = String(body.password || "").trim();
    const db = readDb();
    const user = db.users.find((u) => u.phone === phone && u.password === password);
    if (!user) return sendJson(res, 401, { error: "WhatsApp ou senha incorretos." });
    const token = uid();
    sessions.set(token, user.id);
    return sendJson(res, 200, { token, user: publicUser(user) });
  }

  const session = auth(req);

  if (method === "POST" && pathname === "/api/logout") {
    if (session) sessions.delete(session.token);
    return sendJson(res, 200, { ok: true });
  }

  if (!session) return sendJson(res, 401, { error: "Não autorizado." });

  const db = readDb();
  const user = getUser(db, session.userId);
  if (!user) return sendJson(res, 404, { error: "Usuário não encontrado." });

  if (method === "GET" && pathname === "/api/me") {
    return sendJson(res, 200, {
      user: publicUser(user),
      canPost: canPost(db, user),
      delegated: db.delegatedStudentIds.includes(user.id),
    });
  }

  if (method === "GET" && pathname === "/api/announcements") {
    const list = db.announcements
      .filter((a) => {
        if (a.turmaTarget === "all" || !a.turmaTarget) return true;
        if (isProfessor(user)) return true;
        return user.turma === a.turmaTarget;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((a) => ({
        ...a,
        read: (a.readBy || []).includes(user.id),
        authorName: getUser(db, a.authorId)?.name || "—",
      }));
    return sendJson(res, 200, { announcements: list, canPost: canPost(db, user) });
  }

  if (method === "POST" && pathname === "/api/announcements") {
    if (!canPost(db, user)) return sendJson(res, 403, { error: "Sem permissão." });
    const body = await readBody(req);
    const title = String(body.title || "").trim();
    const text = String(body.body || "").trim();
    if (!title || !text) return sendJson(res, 400, { error: "Título e mensagem são obrigatórios." });
    const ann = {
      id: uid(),
      authorId: user.id,
      title,
      body: text,
      type: String(body.type || "geral"),
      turmaTarget: String(body.turmaTarget || "all"),
      createdAt: Date.now(),
      readBy: [user.id],
    };
    db.announcements.push(ann);
    writeDb(db);
    return sendJson(res, 201, { announcement: ann });
  }

  const readMatch = pathname.match(/^\/api\/announcements\/([^/]+)\/read$/);
  if (method === "POST" && readMatch) {
    const ann = db.announcements.find((a) => a.id === readMatch[1]);
    if (!ann) return sendJson(res, 404, { error: "Comunicado não encontrado." });
    if (!ann.readBy) ann.readBy = [];
    if (!ann.readBy.includes(user.id)) ann.readBy.push(user.id);
    writeDb(db);
    return sendJson(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/students") {
    if (!isProfessor(user)) return sendJson(res, 403, { error: "Apenas professor." });
    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const turma = parsed.searchParams.get("turma");
    let students = db.users.filter((u) => u.role === "aluno");
    if (turma && turma !== "all") students = students.filter((u) => u.turma === turma);
    students.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return sendJson(res, 200, { students: students.map(publicUser) });
  }

  if (method === "GET" && pathname === "/api/attendance") {
    if (!isProfessor(user)) return sendJson(res, 403, { error: "Apenas professor." });
    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const turma = parsed.searchParams.get("turma");
    const date = parsed.searchParams.get("date");
    if (!turma || !date) return sendJson(res, 400, { error: "Informe turma e data." });
    const sessionRow = db.attendanceSessions.find((s) => s.turma === turma && s.date === date);
    return sendJson(res, 200, { records: sessionRow?.records || {} });
  }

  if (method === "PUT" && pathname === "/api/attendance") {
    if (!isProfessor(user)) return sendJson(res, 403, { error: "Apenas professor." });
    const body = await readBody(req);
    const { turma, date, records } = body;
    if (!turma || !date || !records || typeof records !== "object") {
      return sendJson(res, 400, { error: "Dados inválidos." });
    }
    let row = db.attendanceSessions.find((s) => s.turma === turma && s.date === date);
    if (!row) {
      row = { id: uid(), turma, date, createdBy: user.id, records: {} };
      db.attendanceSessions.push(row);
    }
    row.records = records;
    writeDb(db);
    return sendJson(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/payments") {
    if (!isProfessor(user)) return sendJson(res, 403, { error: "Apenas professor." });
    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const month = Number(parsed.searchParams.get("month"));
    const year = Number(parsed.searchParams.get("year"));
    const turma = parsed.searchParams.get("turma") || "all";
    if (!month || !year) return sendJson(res, 400, { error: "Informe mês e ano." });
    let students = db.users.filter((u) => u.role === "aluno");
    if (turma !== "all") students = students.filter((u) => u.turma === turma);
    students.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const rows = students.map((s) => {
      const pay = db.payments.find((p) => p.studentId === s.id && p.month === month && p.year === year);
      return { student: publicUser(s), confirmed: !!(pay && pay.confirmed), paymentId: pay?.id || null };
    });
    return sendJson(res, 200, { rows, month, year });
  }

  if (method === "POST" && pathname === "/api/payments/toggle") {
    if (!isProfessor(user)) return sendJson(res, 403, { error: "Apenas professor." });
    const body = await readBody(req);
    const { studentId, month, year } = body;
    if (!studentId || !month || !year) return sendJson(res, 400, { error: "Dados inválidos." });
    let pay = db.payments.find((p) => p.studentId === studentId && p.month === month && p.year === year);
    if (!pay) {
      pay = { id: uid(), studentId, month, year, confirmed: false, confirmedBy: null, confirmedAt: null };
      db.payments.push(pay);
    }
    pay.confirmed = !pay.confirmed;
    pay.confirmedBy = pay.confirmed ? user.id : null;
    pay.confirmedAt = pay.confirmed ? Date.now() : null;
    writeDb(db);
    return sendJson(res, 200, { confirmed: pay.confirmed });
  }

  if (method === "GET" && pathname === "/api/delegation") {
    if (!isProfessor(user)) return sendJson(res, 403, { error: "Apenas professor." });
    return sendJson(res, 200, { delegatedStudentIds: db.delegatedStudentIds });
  }

  if (method === "PUT" && pathname === "/api/delegation") {
    if (!isProfessor(user)) return sendJson(res, 403, { error: "Apenas professor." });
    const body = await readBody(req);
    const ids = Array.isArray(body.delegatedStudentIds) ? body.delegatedStudentIds : [];
    const valid = new Set(db.users.filter((u) => u.role === "aluno").map((u) => u.id));
    db.delegatedStudentIds = ids.filter((id) => valid.has(id));
    writeDb(db);
    return sendJson(res, 200, { delegatedStudentIds: db.delegatedStudentIds });
  }

  return sendJson(res, 404, { error: "Rota não encontrada." });
}

const server = http.createServer(async (req, res) => {
    // Permite que o aplicativo Capacitor acesse a API no Render.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // Responde às verificações preliminares CORS.
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  
  try {
    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(parsed.pathname);

    if (pathname.startsWith("/api")) {
      await handleApi(req, res, pathname);
      return;
    }

    if (serveStatic(req, res, pathname)) return;

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Erro interno." });
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("  Elite Combat — Lute Como Um Tubarão");
  console.log(`  Abra no navegador: http://localhost:${PORT}`);
  console.log("  Logo: salve como logo.png nesta pasta");
  console.log("");
});
