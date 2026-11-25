import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { CryptoLab } from "./crypto-lab.jsx";
const scenarios = [
  [
    "A01",
    "Control de acceso",
    "Datos ajenos expuestos",
    "Verificación de propiedad y roles",
    "/api/admin/users",
    403,
  ],
  [
    "A02",
    "Configuración",
    "Cabeceras ausentes",
    "Helmet y CSP",
    "/health",
    200,
  ],
  [
    "A03",
    "Dependencias",
    "Paquetes sin revisión",
    "npm audit y CI",
    null,
    null,
  ],
  [
    "A04",
    "Criptografía",
    "Datos legibles en BD",
    "Argon2id y AES-GCM",
    null,
    null,
  ],
  [
    "A05",
    "Inyección",
    "Entrada interpretada como código",
    "Consultas parametrizadas y escape",
    "/api/notes/invalid-uuid",
    400,
  ],
  [
    "A06",
    "Diseño inseguro",
    "Recursos sin límites",
    "Límites y modelo STRIDE",
    null,
    null,
  ],
  [
    "A07",
    "Autenticación",
    "Sesiones sin comprobar",
    "JWT y rate limit",
    "/api/auth/me",
    200,
  ],
  [
    "A08",
    "Integridad",
    "Datos alterados aceptados",
    "Firma verificada y CI",
    null,
    null,
  ],
  [
    "A09",
    "Auditoría",
    "Eventos invisibles",
    "Registro de eventos",
    "/api/admin/audit",
    403,
  ],
  [
    "A10",
    "Excepciones",
    "Detalles internos expuestos",
    "Errores genéricos y timeouts",
    "/api/not-found",
    404,
  ],
];
function App() {
  const [user, U] = useState(null),
    [page, P] = useState("login"),
    [notes, N] = useState([]),
    [out, O] = useState(null),
    [idx, I] = useState(0),
    [mode, M] = useState("simulation"),
    [edit, E] = useState(null),
    [profile, F] = useState(null),
    [admin, A] = useState([]),
    [error, B] = useState("");
  const [reset] = useState(() => {
    const t = new URLSearchParams(location.search).get("reset");
    if (t) history.replaceState(null, "", location.pathname);
    return t;
  });
  const [historyRows, H] = useState([]),
    [busy, Q] = useState(false);
  const req = async (path, method = "GET", data) => {
    try {
      Q(true);
      const start = performance.now(),
        r = await fetch(path, {
          signal: AbortSignal.timeout(10000),
          method,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          ...(data ? { body: JSON.stringify(data) } : {}),
        });
      const raw = await r.text();
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
      const result = {
        source: "API real",
        method,
        path,
        status: r.status,
        ms: Math.round(performance.now() - start),
        headers: Object.fromEntries(r.headers),
        body,
      };
      O({
        ...result,
        body: body?.error
          ? { error: body.error }
          : { message: "Contenido privado oculto en el inspector" },
        headers: {
          "content-security-policy": r.headers.get("content-security-policy"),
          "x-content-type-options": r.headers.get("x-content-type-options"),
        },
      });
      H((old) =>
        [
          { source: "API real", method, path, status: r.status, ms: result.ms },
          ...old,
        ].slice(0, 40),
      );
      if (r.status === 401 && user) {
        U(null);
        E(null);
        N([]);
        F(null);
        A([]);
        P("login");
      }
      if (!r.ok) B(body?.error || "Solicitud no completada");
      else B("");
      return result;
    } catch {
      B("No se pudo conectar con el servidor");
      return { status: 0 };
    } finally {
      Q(false);
    }
  };
  useEffect(() => {
    if (reset) {
      P("reset");
      return;
    }
    req("/api/auth/me").then((r) => {
      if (r.status === 200) {
        U(r.body);
        P("dashboard");
      } else B("");
    });
  }, []);
  async function loadNotes() {
    const r = await req("/api/notes");
    if (r.status === 200) N(r.body);
  }
  async function go(p) {
    location.hash = p;
    P(p);
    B("");
    if (p === "notes") loadNotes();
    if (p === "profile") {
      const r = await req("/api/profile");
      F(r.body);
    }
    if (["users", "audit", "alerts", "sessions"].includes(p)) {
      const r = await req("/api/admin/" + p);
      A(Array.isArray(r.body) ? r.body : []);
    }
  }
  async function submit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    if (page === "reset") d.token = reset;
    const r = await req(
      "/api/auth/" +
        ({ forgot: "forgot-password", reset: "reset-password" }[page] || page),
      "POST",
      d,
    );
    if (page === "login" && r.status === 200) {
      U(r.body);
      E(null);N([]);F(null);A([]);
      P("dashboard");
    } else if (r.status === 202 || r.status === 204) {
      B("Solicitud procesada");
      P("login");
    }
  }
  useEffect(() => {
    const onHash = () => {
      const p = location.hash.slice(1);
      if (
        ["login", "register", "forgot", "lab"].includes(p) ||
        (user &&
          [
            "dashboard",
            "notes",
            "profile",
            "crypto",
            "results",
            "inspector",
            ...(user.role === "admin"
              ? ["users", "audit", "alerts", "sessions"]
              : []),
          ].includes(p))
      )
        go(p);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [user]);
  const s = scenarios[idx];
  return (
    <>
      <header>
        <strong>
          Issue<span>Catcher</span>
        </strong>
        <small>Detect. Understand. Protect.</small>
        <span className="session-state">
          {busy ? "Procesando…" : user ? user.role : "Sin sesión"}
        </span>
      </header>
      <div className="layout">
        <aside>
          {(user
            ? [
                "dashboard",
                "notes",
                "profile",
                "lab",
                "crypto",
                "results",
                ...(user.role === "admin"
                  ? ["users", "audit", "alerts", "sessions"]
                  : []),
              ]
            : ["login", "register", "forgot", "lab"]
          ).map((p) => (
            <button
              key={p}
              className={p === page ? "active" : ""}
              onClick={() => go(p)}
            >
              {
                {
                  dashboard: "Inicio",
                  crypto: "Criptografía",
                  results: "Resultados",
                  alerts: "Alertas",
                  sessions: "Sesiones",
                  lab: "Laboratorio OWASP",
                  notes: "Mis notas",
                  profile: "Perfil",
                  users: "Usuarios",
                  audit: "Bitácora",
                  login: "Iniciar sesión",
                  register: "Registro",
                  forgot: "Recuperación",
                }[p]
              }
            </button>
          ))}
          {user && (
            <button
              onClick={async () => {
                const r = await req("/api/auth/logout", "POST");
                if (r.status === 204 || r.status === 401) {
                  U(null);
                  E(null);H([]);O(null);
                  N([]);
                  F(null);
                  A([]);
                  P("login");
                }
              }}
            >
              Cerrar sesión
            </button>
          )}
        </aside>
        <main>
          <p className="eyebrow">ISSUECATCHER / SECURITY LAB / 01</p>
          {error && (
            <p className="error" role="status">
              {error}
            </p>
          )}
          {page === "dashboard" && (
            <>
              <h1>
                Detect.
                <br />
                <span className="outline">Understand.</span>
                <br />
                Protect.
              </h1>
              <p>
                Notas privadas y seguridad verificable. Un laboratorio sencillo
                para aprender a proteger tus datos.
              </p>
              <div className="row">
                <button onClick={() => go("notes")}>
                  Mis notas privadas ↗
                </button>
                <button onClick={() => go("lab")}>
                  Explorar laboratorio ↗
                </button>
              </div>
              <section>
                <h2>Tu espacio seguro</h2>
                <p>
                  Sesiones de 15 minutos · Datos cifrados · Acceso por
                  propietario
                </p>
                <p>
                  Los resultados describen peticiones concretas; no certifican
                  toda una categoría OWASP.
                </p>
              </section>
            </>
          )}
          {page === "crypto" && <CryptoLab />}
          {page === "results" && (
            <section>
              <h1>Resultados de esta sesión</h1>
              <p>
                Metadatos de peticiones reales. No contienen cuerpos privados ni
                credenciales. No persisten al recargar.
              </p>
              <pre>{JSON.stringify(historyRows, null, 2)}</pre>
            </section>
          )}
          {["login", "register", "forgot", "reset"].includes(page) && (
            <section>
              <h1>
                {page === "login"
                  ? "Iniciar sesión"
                  : page === "register"
                    ? "Crear cuenta"
                    : "Recuperar contraseña"}
              </h1>
              <form onSubmit={submit}>
                {page === "register" && (
                  <label>
                    Nombre
                    <input name="name" required />
                  </label>
                )}
                {page !== "reset" && (
                  <label>
                    Correo
                    <input type="email" name="email" required />
                  </label>
                )}
                {page !== "forgot" && (
                  <label>
                    Contraseña
                    <input
                      type="password"
                      name="password"
                      autoComplete={
                        page === "login" ? "current-password" : "new-password"
                      }
                      minLength={page === "login" ? 1 : 12}
                      maxLength={128}
                      required
                    />
                  </label>
                )}
                <p>
                  Contraseñas nuevas: de 12 a 128 caracteres, con letras y
                  números.
                </p>
                <button className="primary" disabled={busy}>
                  Continuar
                </button>
              </form>
            </section>
          )}
          {page === "lab" && (
            <>
              <h1>Laboratorio de seguridad</h1>
              <p>
                Compara escenarios ficticios y respuestas verificables de
                nuestra API.
              </p>
              <section>
                <label>
                  Categoría OWASP
                  <select
                    value={idx}
                    onChange={(e) => {
                      I(+e.target.value);
                      O(null);
                    }}
                  >
                    {scenarios.map((v, i) => (
                      <option key={v[0]} value={i}>
                        {v[0]} · {v[1]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="row">
                  <button
                    className={mode === "simulation" ? "danger" : ""}
                    onClick={() => {
                      M("simulation");
                      O(null);
                    }}
                  >
                    Modo vulnerable (simulación)
                  </button>
                  <button
                    className={mode === "real" ? "primary" : ""}
                    onClick={() => {
                      M("real");
                      O(null);
                    }}
                  >
                    Modo protegido
                  </button>
                </div>
                <p>{mode === "simulation" ? s[2] : s[3]}</p>
                <button
                  className="primary"
                  onClick={() =>
                    mode === "simulation"
                      ? O({
                          source: "SIMULACIÓN: no es evidencia",
                          scenario: s[0],
                          risk: s[2],
                          mitigation: s[3],
                          example:
                            s[0] === "A01"
                              ? "SELECT * FROM notes WHERE id=$1 AND owner_id=$2"
                              : "Consulta docs/SECURITY_REPORT.md para implementación y evidencia",
                        })
                      : s[4]
                        ? req(s[4]).then((r) =>
                            O((current) => ({
                              ...current,
                              expectedStatus:
                                s[0] === "A01" || s[0] === "A09"
                                  ? user
                                    ? user.role === "admin"
                                      ? 200
                                      : 403
                                    : 401
                                  : s[0] === "A05"
                                    ? user
                                      ? 400
                                      : 401
                                    : s[0] === "A07"
                                      ? user
                                        ? 200
                                        : 401
                                      : s[5],
                              assessment:
                                "Comparar este código con expectedStatus. Este sondeo verifica solo esta petición.",
                            })),
                          )
                        : O({
                            source: "Pendiente de prueba automatizada",
                            scenario: s[0],
                            mitigation: s[3],
                            example:
                              s[0] === "A01"
                                ? "SELECT * FROM notes WHERE id=$1 AND owner_id=$2"
                                : "Consulta docs/SECURITY_REPORT.md para implementación y evidencia",
                          })
                  }
                >
                  Ejecutar prueba
                </button>
              </section>
            </>
          )}
          {page === "notes" && (
            <>
              <h1>Mis notas</h1>
              <section>
                <form
                  key={edit?.id || "new"}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = e.target;
                    const r = await req(
                      "/api/notes" + (edit ? "/" + edit.id : ""),
                      edit ? "PATCH" : "POST",
                      Object.fromEntries(new FormData(f)),
                    );
                    if (r.status === 201 || r.status === 200) {
                      E(null);
                      f.reset();
                      loadNotes();
                    }
                  }}
                >
                  <label>
                    Título
                    <input
                      name="title"
                      defaultValue={edit?.title}
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    Contenido
                    <textarea
                      name="content"
                      defaultValue={edit?.content}
                      maxLength={5000}
                      required
                    />
                  </label>
                  <button className="primary">Guardar</button>
                  <button type="button" onClick={() => E(null)}>
                    Cancelar
                  </button>
                </form>
              </section>
              {notes.map((n) => (
                <section key={n.id}>
                  <h3>{n.title}</h3>
                  <p>{n.content}</p>
                  <button onClick={() => E(n)}>Editar</button>
                  <button
                    onClick={async () => {
                      if (confirm("¿Eliminar nota?")) {
                        await req("/api/notes/" + n.id, "DELETE");
                        loadNotes();
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </section>
              ))}
            </>
          )}
          {page === "profile" && (
            <section>
              <h1>Mi perfil</h1>
              <p>
                {profile?.name} · {profile?.email}
              </p>
              <p>Teléfono: {profile?.phone || "No configurado"}</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await req(
                    "/api/profile",
                    "PATCH",
                    Object.fromEntries(new FormData(e.target)),
                  );
                  go("profile");
                }}
              >
                <label>
                  Nuevo teléfono
                  <input name="phone" required />
                </label>
                <button className="primary">Guardar</button>
              </form>
            </section>
          )}
          {["users", "audit", "alerts", "sessions"].includes(page) && (
            <section>
              <h1>
                {
                  {
                    users: "Usuarios y roles",
                    audit: "Bitácora",
                    alerts: "Alertas",
                    sessions: "Sesiones",
                  }[page]
                }
              </h1>
              {admin.map((v) => (
                <p key={v.id}>
                  {v.email || v.event || v.user_id} ·{" "}
                  {v.role || v.created_at || v.expires_at}
                  {page === "users" && (
                    <button
                      onClick={async () => {
                        const r = await req(
                          "/api/admin/users/" + v.id + "/role",
                          "PATCH",
                          { role: v.role === "admin" ? "user" : "admin" },
                        );
                        if (r.status === 204) go("users");
                      }}
                    >
                      Cambiar a {v.role === "admin" ? "usuario" : "admin"}
                    </button>
                  )}
                  {page === "sessions" && !v.revoked_at && (
                    <button
                      onClick={async () => {
                        await req("/api/admin/sessions/" + v.id, "DELETE");
                        go("sessions");
                      }}
                    >
                      Revocar
                    </button>
                  )}
                </p>
              ))}
            </section>
          )}
          <section>
            <h2>Inspector de respuestas</h2>
            <p>Las simulaciones se distinguen de las peticiones reales.</p>
            <pre>{out ? JSON.stringify(out, null, 2) : "Sin resultados"}</pre>
          </section>
        </main>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
