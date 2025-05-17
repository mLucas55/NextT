import { EventEmitter } from "events";
import { WebSocket } from "ws";
import { Client, Resource, RouteResource, Routes, ShapeResource, TripResource } from "./api/mbta";
import { EventSource } from "eventsource";

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
    textColor?: string;
    sortOrder?: number;
    shortName?: string;
    longName?: string;
    fareClass?: string;
    directionNames?: string[];
    directionDestination?: string[];
    description?: string;
    color?: string;
    shapes: Shape[];
}
interface Vehicle {
    updatedAt?: string;
    speed?: number;
    revenueStatus?: string;
    occupancyStatus?: string;
    longitude?: number;
    latitude?: number;
    label?: string;
    directionId?: number;
    currentStopSequence?: number;
    currentStatus?: string;
    carriages?: {
        occupancyStatus?: string;
        occupancyPercentage?: number;
        label?: string;
    }[];
    bearing?: number;
}

interface StreamEventMap<T = any> {
    reset: T[];
    add: T;
    update: T;
    remove: T;
}
type EventMap<T extends keyof TypeMap = keyof TypeMap> = {
    [P in keyof StreamEventMap<TypeMap[T]>]: [{
        type: T,
        data: StreamEventMap<TypeMap[T]>[P]
    }];
};
interface TypeMap {
    route: Route;
}

function mapRoutes(data: Resource | Resource[]) {
    if (!Array.isArray(data)) {
        data = [data];
    }
    const routes = [];
    for (const resource of data) {
        if (resource.type === 'route' && resource.id && resource.attributes?.type !== undefined) {
            // get included shapes assocated with the route
            const trips = data?.filter(value => value.type === 'trip' && (value.relationships?.route?.data as TripResource)?.id === resource.id) || [];
            const shapes: Shape[] = [];
            for (const resource of data) {
                if (resource.type === 'shape' && trips?.some(trip => resource.id && (trip.relationships?.shape.data as ShapeResource)?.id === resource.id)) {
                    shapes.push({ id: resource.id, ...resource.attributes } as Shape);
                }
            }
            routes.push({ id: resource.id, ...resource.attributes, shapes } as Route);
        }
    }
    return routes;
}

function map<T extends keyof TypeMap>(type: T, data: Resource | Resource[]): TypeMap[T][] {
    switch (type) {
        case 'route':
            return mapRoutes(data);
    }
}
// A tracker collects data from the API in a stream and stores it to the cache according to the event.
// The websockets should listen for when a stream gets a message and have the message forwarded to it.

class TrackerCache extends EventEmitter<EventMap> {
    readonly routes: Map<string, Route>;

    constructor() {
        super();
        this.setMaxListeners(Infinity);
        this.routes = new Map();
    }

    #for<T extends keyof TypeMap>(type: T): Map<string, TypeMap[T]> {
        switch (type) {
            case 'route':
                return this.routes;
        }
    }

    reset<T extends keyof TypeMap>(type: T, data: TypeMap[T][]) {
        const cache = this.#for(type);
        cache.clear();
        for (const resource of data) {
            cache.set(resource.id, resource);
        }
    }

    add<T extends keyof TypeMap>(type: T, data: TypeMap[T]) {
        const cache = this.#for(type);
        cache.set(data.id, data);
    }

    update<T extends keyof TypeMap>(type: T, data: TypeMap[T]) {
        const cache = this.#for(type);
        cache.set(data.id, data);
    }

    remove<T extends keyof TypeMap>(type: T, data: Pick<TypeMap[T], 'id' | 'type'>) {
        const cache = this.#for(type);
        cache.delete(data.id);
    }

    put(trackerType: keyof TypeMap, eventType: keyof StreamEventMap, data: Resource[]) {
        const mapped = map(trackerType, data);
        switch (eventType) {
            case 'reset':
                this.reset(trackerType, mapped);
                break;
            case 'add':
                this.add(trackerType, mapped[0]);
                break;
            case 'update':
                this.update(trackerType, mapped[0]);
                break;
            case 'remove':
                this.remove(trackerType, mapped[0]);
                break;
        }
    }
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
        this.#cache = new TrackerCache();
    }

    attach(ws: WebSocket) {
        const listener = <T extends keyof EventMap>(event: T, { type, data }: EventMap[T][0]) => {
            const payload = {
                type: `${type.toUpperCase()}_${event.toUpperCase()}`,
                data: data
            };
            ws.send(JSON.stringify(payload));
        }
        const resetListener = listener.bind(this, 'reset');
        const addListener = listener.bind(this, 'add');
        const updateListener = listener.bind(this, 'update');
        const removeListener = listener.bind(this, 'remove');
        // sent initial reset events to sync data
        resetListener({ type: 'route', data: Array.from(this.#cache.routes.values()) });
        ws.once("close", () => {
            this.#cache.removeListener('reset', resetListener);
            this.#cache.removeListener('add', addListener);
            this.#cache.removeListener('update', updateListener);
            this.#cache.removeListener('remove', removeListener);
        });
        this.#cache.on('reset', resetListener);
        this.#cache.on('add', addListener);
        this.#cache.on('update', updateListener);
        this.#cache.on('remove', removeListener);
    }

    // async #updateRoutes() {
    //     const { data, included } = await this.client.getRoutes({ 'filter[id]': ROUTES_IDS.join(','), include: 'route_patterns.representative_trip.shape' });
    //     console.log(included);
    //     this.#cache.routes = [];
    //     for (const route of data) {
    //         if (route.id && route.attributes?.type !== undefined) {
    //             // get included shapes assocated with the route
    //             const trips = included?.filter(value => value.type === 'trip' && value.relationships?.route?.data?.id === route.id) || [];
    //             const shapes: Shape[] = [];
    //             for (const resource of included || []) {
    //                 if (resource.type === 'shape' && trips?.some(trip => resource.id && trip.relationships?.shape.data?.id === resource.id)) {
    //                     shapes.push({ id: resource.id, ...resource.attributes } as Shape);
    //                 }
    //             }
    //             this.#cache.routes.push({ id: route.id, ...route.attributes, shapes } as Route);
    //         }
    //     }
    //     this.emit('updateRoutes', this.#cache.routes);
    // }

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
        const routeListener = (event: MessageEvent) => this.#cache.put('route', event.type as keyof StreamEventMap, JSON.parse(event.data));
        const routeStream = this.client.streamRoutes({ 'filter[id]': ROUTES_IDS.join(','), include: 'route_patterns.representative_trip.shape' });
        routeStream.addEventListener('reset', routeListener);
        routeStream.addEventListener('add', routeListener);
        routeStream.addEventListener('update', routeListener);
        routeStream.addEventListener('create', routeListener);
        // const routeStream = this.client.streamRoutes({ 'fields[route]': ROUTES_IDS.join(','), include: 'route_patterns.representative_trip.shape' });
        // routeStream.addEventListener('message', (event) => this.#cache.put('route', event.type as keyof StreamEventMap, event.data));
    }
}

const client = new Client(process.env.MBTA_API_KEY);
const tracker = new Tracker(client);

export {
    Tracker,
    tracker
};
