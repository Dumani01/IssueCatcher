import { test, expect } from "@playwright/test";
import pg from "pg";
if (!process.env.DATABASE_URL) process.loadEnvFile("backend/.env.test");
test("browser registration, login, CRUD, XSS, phone, crypto, lab, logout and mobile", async ({
  page,
}) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query("TRUNCATE auth_attempts");
  const email = `browser${Date.now()}@example.test`,
    password = "BrowserTesting123!Secure";
  let errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Registro", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Browser Example");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Detect/ })).toBeVisible();
  await page.getByRole("button", { name: "Mis notas", exact: true }).click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("<script>window.pwned=true</script>");
  await page
    .getByLabel("Contenido", { exact: true })
    .fill("Secret browser note");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "<script>window.pwned=true</script>" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Edited in browser");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edited in browser" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edited in browser" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByLabel("Nuevo teléfono").fill("+50688881234");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Teléfono: ***-***-1234")).toBeVisible();
  await page.getByRole("button", { name: "Criptografía", exact: true }).click();
  await page
    .getByRole("button", { name: "Cifrar, descifrar y manipular" })
    .click();
  await expect(page.locator("pre").first()).toContainText(
    '"tamperingRejected": true',
  );
  await page
    .getByRole("button", { name: "Laboratorio OWASP", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Modo protegido", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ejecutar prueba", exact: true })
    .click();
  await expect(page.locator("pre").last()).toContainText("403");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await db.query("DELETE FROM users WHERE email=$1", [email]);
  await db.end();
});
