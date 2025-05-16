import { EventEmitter } from "events";
import { WebSocket } from "ws";
import { Client, VehicleResource } from "./api/mbta";

/**
 * IDs of routes which should be tracked.
 */
const ROUTES_IDS = ['Red', 'Orange', 'Green-B', 'Green-C', 'Green-D', 'Green-E', 'Blue'];

interface Shape {
    id: string;
    polyline: string;
}

interface Route {
    id: string;
    type: number;
    shapes: Shape[];
    textColor?: string;
    sortOrder?: number;
    shortName?: string;
    longName?: string;
    fareClass?: string;
    directionNames?: string[];
    directionDestination?: string[];
    description?: string;
    color?: string;
}

interface TrackerCache {
    shapes: Shape[];
    routes: Route[];
    vehicles: VehicleResource[];
}

/**
 * Collects data from the MBTA api at regular intervals and caches it.
 */
class Tracker extends EventEmitter<{ updateRoutes: [Route[]] }> {
    /**
     * The MBTA API client associated with the tracker.
     */
    readonly client: Client;
    #cache: TrackerCache;

    constructor(client: Client) {
        super();
        this.setMaxListeners(Infinity);
        this.client = client;
        this.#cache = {
            shapes: [],
            routes: [],
            vehicles: []
        };
    }

    attach(ws: WebSocket) {
        ws.send(JSON.stringify({
            type: 'ROUTES_REFRESH',
            data: this.#cache.routes
        }));
        const updateRoutesCallback = (routes: Route[]) => {
            const data = {
                type: 'ROUTES_REFRESH',
                data: routes
            };
            ws.send(JSON.stringify(data));
        }
        ws.once("close", () => {
            this.removeListener('updateRoutes', updateRoutesCallback);
        });
        this.on('updateRoutes', updateRoutesCallback);
    }

    async #updateRoutes() {
        const { data: routes } = await this.client.getRoutes({ 'filter[id]': ROUTES_IDS.join(',') });
        this.#cache.routes = [];
        for (const route of routes) {
            if (route.id && route.attributes?.type !== undefined) {
                // shapes must be fetched separately for each route since there's no way of knowing which 
                // route a shape corresponds to from it's attributes
                const { data: resources } = await this.client.getShapes({ 'filter[route]': route.id });
                const shapes: Shape[] = [];
                for (const shape of resources) {
                    if (shape.id && shape.attributes?.polyline) {
                        shapes.push({ id: shape.id, ...shape.attributes } as Shape);
                    }
                }
                this.#cache.routes.push({ id: route.id, shapes, ...route.attributes } as Route);
            }
        }
        this.emit('updateRoutes', this.#cache.routes);
    }

    /**
     * Initializes tracking.
     */
    async track() {
        // TODO: Collect API data at regular intervals.
        /*
         * Collect the following data:
         * - Vehicles - For position/speed/direction & any other data we might want to show
         * - Schedules - For schedules times
         * - Predictions - For predicted times
         * Maybe also the following data at significantly less frequent intervals:
         * - Routes, Shapes, Stops, Alerts
         */
        await this.#updateRoutes();
    }
}

const client = new Client(process.env.MBTA_API_KEY);
const tracker = new Tracker(client);

export {
    Tracker,
    tracker
};
