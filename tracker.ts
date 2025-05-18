import { EventEmitter } from "events";
import { EventSource } from "eventsource";
import { WebSocket } from "ws";
import { Client, Resource, ResourceIdentifier, RouteResource, ShapeResource, TripResource } from "./api/mbta";

/**
 * IDs of routes which should be tracked.
 */
const ROUTES_IDS = ['Red', 'Orange', 'Green-B', 'Green-C', 'Green-D', 'Green-E', 'Blue'];

interface Identifier {
    id: string;
}
interface Shape extends Identifier {
    polyline: string;
}
interface Route extends Identifier {
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
interface ResourceMap {
    route: RouteResource;
}
interface TypeMap {
    route: Route;
}
type ResourceType = keyof TypeMap;
interface StreamEventMap<T extends Identifier = Identifier> {
    reset: T[];
    add: T;
    update: T;
    remove: Identifier;
}
type EventType = keyof StreamEventMap;
type PayloadMap<T extends ResourceType = ResourceType> = {
    [P in EventType]: {
        type: T;
        data: StreamEventMap<TypeMap[T]>[P];
    };
};
type EventMap<T extends ResourceType = ResourceType> = {
    [P in keyof PayloadMap]: [PayloadMap<T>[P]];
};

function mapRoutes(data: Resource | Resource[]) {
    if (!Array.isArray(data)) {
        data = [data];
    }
    const routes = [];
    for (const resource of data) {
        if (resource.type === 'route' && resource.attributes?.type !== undefined) {
            // get included shapes assocated with the route
            const trips = data?.filter(value => value.type === 'trip' && (value.relationships?.route?.data as ResourceIdentifier | undefined)?.id === resource.id) || [];
            const shapes: Shape[] = [];
            for (const resource of data) {
                if (resource.type === 'shape' && trips?.some(trip => resource.id && (trip.relationships?.shape?.data as ResourceIdentifier | undefined)?.id === resource.id)) {
                    shapes.push({ id: resource.id, ...resource.attributes } as Shape);
                }
            }
            routes.push({ id: resource.id, ...resource.attributes, shapes } as Route);
        }
    }
    return routes;
}

function map<T extends ResourceType>(type: T, data: Resource | Resource[]): TypeMap[T][] {
    switch (type) {
        case 'route':
            return mapRoutes(data);
    }
}

class TrackerCache extends EventEmitter<EventMap> {
    readonly routes: Map<string, Route>;

    constructor() {
        super();
        this.setMaxListeners(Infinity);
        this.routes = new Map();
    }

    #for<T extends ResourceType>(type: T): Map<string, TypeMap[T]> {
        switch (type) {
            case 'route':
                return this.routes;
        }
    }

    reset<T extends ResourceType>(type: T, resources: ResourceMap[T][]) {
        const data = map(type, resources);
        const cache = this.#for(type);
        cache.clear();
        for (const resource of data) {
            cache.set(resource.id, resource);
        }
        this.emit('reset', { type, data });
    }

    add<T extends ResourceType>(type: T, resource: ResourceMap[T]) {
        const [data] = map(type, resource);
        const cache = this.#for(type);
        cache.set(data.id, data);
        this.emit('add', { type, data });
    }

    update<T extends ResourceType>(type: T, resource: ResourceMap[T]) {
        const [data] = map(type, resource);
        const cache = this.#for(type);
        cache.set(data.id, data);
        this.emit('update', { type, data });
    }

    remove<T extends ResourceType>(type: T, identifier: ResourceIdentifier) {
        const { id } = identifier;
        const cache = this.#for(type);
        cache.delete(id);
        this.emit('remove', { type, data: { id } });
    }

    bind(type: ResourceType, es: EventSource) {
        es.addEventListener('reset', (event) => this.reset(type, JSON.parse(event.data)));
        es.addEventListener('add', (event) => this.add(type, JSON.parse(event.data)));
        es.addEventListener('update', (event) => this.update(type, JSON.parse(event.data)));
        es.addEventListener('remove', (event) => this.remove(type, JSON.parse(event.data)));
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
        const listener = <T extends EventType>(event: T, { type, data }: PayloadMap[T]) => {
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
        const routes = this.client.streamRoutes({ 'filter[id]': ROUTES_IDS.join(','), include: 'route_patterns.representative_trip.shape' });
        this.#cache.bind('route', routes);
    }
}

const client = new Client(process.env.MBTA_API_KEY);
const tracker = new Tracker(client);

export {
    Tracker,
    tracker
};

