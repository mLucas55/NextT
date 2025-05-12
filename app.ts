import server from "./server";
import { tracker } from "./tracker";

/* initialize tracker */
tracker.track();

/* listen */
const port = 3000;
server.listen(port);
console.log('Listening on port ' + port);