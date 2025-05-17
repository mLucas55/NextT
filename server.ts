import bodyParser from "body-parser";
import compression from "compression";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { tracker } from "./tracker";

/* create express app */
const app = express();

/* configure express */
app.disable('x-powered-by');
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
if (process.env.PATH_TO_FRONTEND !== undefined) {
    app.use(express.static(process.env.PATH_TO_FRONTEND));
}

/* configure routes */
app.get('/', (_, res, next) => {
    if (process.env.PATH_TO_FRONTEND !== undefined) {
        res.sendFile('index.html', { root: process.env.PATH_TO_FRONTEND });
    } else {
        next();
    }
});

/* create server */
const server = http.createServer(app);

/* create websocket server */
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    tracker.attach(ws);
});

export default server;