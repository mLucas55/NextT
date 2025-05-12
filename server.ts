import bodyParser from "body-parser";
import compression from "compression";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

/* create express app */
const app = express();

/* configure express */
app.set('view engine', 'ejs')
app.disable('x-powered-by');
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

/* configure routes */
app.get('/', (_, res) => {
    res.render('index');
});

/* create server */
const server = http.createServer(app);

/* create websocket server */
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    setInterval(() => { ws.send(Buffer.from(Date.now().toString())) }, 1000);
    // TODO: Attach websocket to tracker so updates are sent over the socket
});

export default server;