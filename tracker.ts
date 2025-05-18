import { EventEmitter } from "events";
import { EventSource } from "eventsource";
import { WebSocket } from "ws";
import { Client, Resource, ResourceIdentifier, ResourceMap, ResourceType, RouteResource, VehicleResource } from "./api/mbta";

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
interface Vehicle extends Identifier {
    updatedAt?: string;
    speed?: number;
    revenueStatus?: string;
    occupancyStatus?: string;
    longitude: number;
    latitude: number;
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
interface TypeMap {
    route: Route;
    vehicle: Vehicle;
}
type APIType = keyof TypeMap;
interface StreamEventMap<T extends Identifier = Identifier> {
    reset: T[];
    add: T;
    update: T;
    remove: Identifier;
}
type EventType = keyof StreamEventMap;
type PayloadMap<T extends APIType = APIType> = {
    [P in EventType]: {
        type: T;
        data: StreamEventMap<TypeMap[T]>[P];
    };
};
type EventMap<T extends APIType = APIType> = {
    [P in EventType]: [PayloadMap<T>[P]];
};

type ResourceCache = {
    [key: string]: Map<string, Resource>
} & {
    [P in ResourceType]: Map<string, ResourceMap[P]>;
};

class TrackerCache extends EventEmitter<EventMap> {
    #cache: Partial<ResourceCache>;
    /**
     * Map of resource types to the getters for the type that should be tracked.
     */
    #getters: { [P in ResourceType]?: readonly [(id: string) => Identifier | undefined, () => Identifier[]] };
    get routes() {
        return this.#getRoutes();
    }
    get vehicles() {
        return this.#getVehicles();
    }

    constructor() {
        super();
        this.setMaxListeners(Infinity);
        this.#cache = {};
        const routeGetters = [this.#getRoute.bind(this), this.#getRoutes.bind(this)] as const;
        const vehicleGetters = [this.#getVehicle.bind(this), this.#getVehicles.bind(this)] as const;
        this.#getters = {
            route: routeGetters,
            vehicle: vehicleGetters
        };
    }

    #mapRoute(resource: RouteResource) {
        if (resource.attributes?.type !== undefined) {
            // get included shapes assocated with the route
            const trips = Array.from(this.#cache.trip?.values() || []).filter(value => value.relationships?.route?.data?.id === resource.id);
            const shapes: Shape[] = [];
            for (const resource of this.#cache.shape?.values() || []) {
                if (trips?.some(trip => trip.relationships?.shape?.data?.id === resource.id)) {
                    shapes.push({ id: resource.id, ...resource.attributes } as Shape);
                }
            }
            return { id: resource.id, ...resource.attributes, shapes } as Route;
        }
    }

    #getRoute(id: string) {
        const resource = this.#cache.route?.get(id);
        if (resource) {
            return this.#mapRoute(resource);
        }
    }

    #getRoutes() {
        const routes: Route[] = [];
        for (const resource of this.#cache.route?.values() || []) {
            const route = this.#mapRoute(resource);
            if (route) {
                routes.push(route);
            }
        }
        return routes;
    }

    #mapVehicle(resource: VehicleResource) {
        return { id: resource.id, ...resource.attributes } as Vehicle;
    }

    #getVehicle(id: string) {
        const resource = this.#cache.vehicle?.get(id);
        if (resource) {
            return this.#mapVehicle(resource);
        }
    }

    #getVehicles() {
        const vehicles: Vehicle[] = [];
        for (const resource of this.#cache.vehicle?.values() || []) {
            const vehicle = this.#mapVehicle(resource);
            if (vehicle) {
                vehicles.push(vehicle);
            }
        }
        return vehicles;
    }

    #get<T extends ResourceType>(type: T): T extends keyof TypeMap ? TypeMap[T][] : undefined;
    #get<T extends ResourceType>(type: T, id: string): T extends keyof TypeMap ? TypeMap[T] : undefined;
    #get(type: ResourceType, id?: string) {
        const getter = this.#getters[type];
        if (getter) {
            if (id) {
                return getter[0](id);
            } else {
                return getter[1]();
            }
        }
    }

    #isTracked<T extends ResourceType>(type: T) {
        return type in this.#getters;
    }

    #for<T extends string>(type: T) {
        if (!this.#cache[type]) {
            this.#cache[type] = new Map();
        }
        return this.#cache[type] as ResourceCache[T];
    }

    reset(resources: Resource[]) {
        const cleared = new Set<ResourceType>();
        for (const resource of resources) {
            const { type } = resource;
            const cache = this.#for(type);
            if (!cleared.has(type)) {
                cache.clear();
                cleared.add(type);
            }
            cache.set(resource.id, resource);
        }
        // send reset events if applicable
        for (const type of cleared) {
            const data = this.#get(type);
            if (data) {
                this.emit('reset', { type: type as APIType, data });
            }
        }
    }

    add(resource: Resource) {
        const { type } = resource;
        const cache = this.#for(type);
        cache.set(resource.id, resource);
        // send add event if applicable
        const data = this.#get(type, resource.id);
        if (data) {
            this.emit('add', { type: type as APIType, data });
        }
    }

    update(resource: Resource) {
        const { type } = resource;
        const cache = this.#for(type);
        cache.set(resource.id, resource);
        // send update event if applicable
        const data = this.#get(type, resource.id);
        if (data) {
            this.emit('update', { type: type as APIType, data });
        }
    }

    remove({ id, type }: ResourceIdentifier) {
        const cache = this.#for(type);
        cache.delete(id);
        // send remove event if applicable
        if (this.#isTracked(type)) {
            this.emit('remove', { type: type as APIType, data: { id } });
        }
    }

    bind(es: EventSource) {
        es.addEventListener('reset', (event) => this.reset(JSON.parse(event.data)));
        es.addEventListener('add', (event) => this.add(JSON.parse(event.data)));
        es.addEventListener('update', (event) => this.update(JSON.parse(event.data)));
        es.addEventListener('remove', (event) => this.remove(JSON.parse(event.data)));
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
        resetListener({ type: 'route', data: this.#cache.routes });
        resetListener({ type: 'vehicle', data: this.#cache.vehicles });
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
        const routeFilter = ROUTES_IDS.join(',')
        const routes = this.client.streamRoutes({ 'filter[id]': routeFilter, include: 'route_patterns.representative_trip.shape' });
        this.#cache.bind(routes);
        const vehicles = this.client.streamVehicles({ 'filter[route]': routeFilter });
        this.#cache.bind(vehicles);
    }
}

const client = new Client(process.env.MBTA_API_KEY);
const tracker = new Tracker(client);

export {
    Tracker,
    tracker
};

