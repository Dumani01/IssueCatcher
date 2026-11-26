import { app } from "./app.js";
const port = Number(process.env.PORT || 3001);
const host = process.env.RENDER === "true"
  ? "0.0.0.0"
  : process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const server = app.listen(
  port,
  host,
  () => console.log(`IssueCatcher ready on ${host}:${port}`),
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
