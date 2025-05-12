import { Client, RouteResource, StopResource, VehicleResource } from "./api/mbta";

/**
 * IDs of routes which should be tracked.
 */
const ROUTES = ['red'];

interface TrackerCache {
    vehicles: VehicleResource[];
}

/**
 * Collects data from the MBTA api at regular intervals and caches it.
 */
class Tracker {
    /**
     * The MBTA API client associated with the tracker.
     */
    readonly client: Client;
    #cache: TrackerCache;

    constructor(client: Client) {
        this.client = client;
        this.#cache = {
            vehicles: []
        };
    }

    /**
     * Returns a list of vehicles.
     */
    getVehicles(): VehicleResource[] {
        return this.#cache.vehicles;
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
         * - Routes - For route data.
         * - Shapes - For shape data.
         * - Stops - For stop data.
         */
        // const { data: [route] } = await this.client.getRoutes({ 'filter[type]': '0,1,2,3' });
        // const shapes = await this.client.getShapes({ 'filter[route]': route.id });
        // console.log(shapes);
    }
}

const client = new Client(process.env.MBTA_API_KEY);
const tracker = new Tracker(client);

export {
    Tracker,
    tracker
};