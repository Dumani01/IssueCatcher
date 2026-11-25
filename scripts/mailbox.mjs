import { createServer as netServer } from "node:net";
import { createServer as httpServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
export function createMailbox(onMail) {
  return netServer((socket) => {
    socket.setTimeout(10000, () => socket.destroy());
    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP laboratory\r\n");
    let buffer = "",
      data = false,
      mail = [];
    socket.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.length > 65536) return socket.destroy();
      let i;
      while ((i = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        if (data) {
          if (line === ".") {
            data = false;
            onMail(mail.join("\n"));
            mail = [];
            socket.write("250 accepted\r\n");
          } else {
            mail.push(line.replace(/^\.\./, "."));
            if (mail.join("").length > 65536) socket.destroy();
          }
          continue;
        }
        if (/^EHLO|^HELO/i.test(line)) socket.write("250 localhost\r\n");
        else if (/^MAIL FROM:|^RCPT TO:|^RSET|^NOOP/i.test(line))
          socket.write("250 OK\r\n");
        else if (/^DATA/i.test(line)) {
          data = true;
          socket.write("354 End with dot\r\n");
        } else if (/^QUIT/i.test(line)) {
          socket.end("221 Bye\r\n");
        } else socket.write("502 Unsupported\r\n");
      }
    });
    socket.on("error", () => {});
  });
}
if (process.argv[1]?.endsWith("mailbox.mjs")) {
  if (process.env.NODE_ENV === "production")
    throw Error("Mailbox is development only");
  let messages = [];
  mkdirSync(".local/mail", { recursive: true });
  createMailbox((mail) => {
    messages.unshift(mail);
    messages = messages.slice(0, 20);
    writeFileSync(".local/mail/latest.eml", mail, { mode: 0o600 });
  }).listen(1025, "127.0.0.1");
  httpServer((req, res) => {
    if (
      req.headers.host !== "localhost:8025" &&
      req.headers.host !== "127.0.0.1:8025"
    ) {
      res.writeHead(403);
      return res.end();
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(
      messages.join("\n\n---\n\n") ||
        "Sin correos locales. Solo desarrollo; no envía mensajes a Internet.",
    );
  }).listen(8025, "127.0.0.1");
  console.log("Local mailbox: http://localhost:8025");
}
