import { app } from "./app.js";
const server = app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () => console.log("IssueCatcher ready"),
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
