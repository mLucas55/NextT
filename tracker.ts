import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { Client, Resource, ResourceIdentifier, ResourceMap, ResourceType, RouteResource, RouteType, VehicleResource } from "./api/mbta";

/**
 * Types of routes which should be tracked.
 */
const ROUTES_TYPES = [RouteType.LIGHT_RAIL, RouteType.HEAVY_RAIL];

type Unionable<T> = T extends {} ? T : {};
type APIResource<T extends Resource = Resource, U extends Record<string, any> = Unionable<T['attributes']>> = Pick<T, 'id'> & U;
type APIIdentifier<T extends APIResource = APIResource> = Pick<T, 'id'>;
type APIRoute = APIResource<RouteResource, RouteResource['attributes'] & { shapes: APIResourceMap['shape'][] }>;
type APIVehicle = APIResource<VehicleResource, VehicleResource['attributes'] & { route_id?: string }>;
interface APICustomResourceMap {
    route: APIRoute;
    vehicle: APIVehicle;
}
type APIResourceMap = {
    [P in ResourceType]: P extends keyof APICustomResourceMap ? APICustomResourceMap[P] : APIResource<ResourceMap[P]>;
};
type Association<T extends ResourceType = ResourceType> = {
    type: T;
    get: (cache: Partial<ResourceCache>, id?: string) => APIResourceMap[T][];
}
type ResourceCache = {
    [P in ResourceType]: Map<string, ResourceMap[P]>;
};
// Event Stream
interface StreamEventMap<T extends APIResource = APIResource> {
    reset: T[];
    add: T;
    update: T;
    remove: APIIdentifier;
}
type EventType = keyof StreamEventMap;
type PayloadMap<T extends ResourceType = ResourceType> = {
    [P in EventType]: {
        type: T;
        data: StreamEventMap<APIResourceMap[T]>[P];
    };
};
type EventMap<T extends ResourceType = ResourceType> = {
    [P in EventType]: [PayloadMap<T>[P]];
};
class TrackerCache extends EventEmitter<EventMap> {
    #cache: Partial<ResourceCache>;
    #associations: Partial<Record<ResourceType, Association>>;
    get routes() {
        return (this.#getPayload('route')?.data || []) as APIResourceMap['route'][];
    }
    get vehicles() {
        return (this.#getPayload('vehicle')?.data || []) as APIResourceMap['vehicle'][];
    }

    constructor() {
        super();
        this.#cache = {};
        this.#associations = {};
        this.setMaxListeners(Infinity);
    }

    #isTracked(type: ResourceType) {
        return type in this.#associations;
    }

    #cacheOf<T extends ResourceType>(type: T) {
        if (!this.#cache[type]) {
            this.#cache[type] = new Map();
        }
        return this.#cache[type] as Map<string, ResourceMap[T]>;
    }

    #getPayload(type: ResourceType, id?: string): { type: ResourceType, data: APIResource[] } | undefined {
        if (this.#isTracked(type)) {
            const association = this.#associations[type] as Association;
            return { type, data: association.get(this.#cache, id) }
        }
    }

    reset(resources: Resource[]) {
        const cleared = new Set<ResourceType>();
        for (const resource of resources) {
            const { type } = resource;
            const cache = this.#cacheOf(type);
            if (!cleared.has(type)) {
                cache.clear();
                cleared.add(type);
            }
            cache.set(resource.id, resource);
        }
        // send reset events if applicable
        for (const type of cleared) {
            const payload = this.#getPayload(type);
            if (payload) {
                this.emit('reset', payload);
            }
        }
    }

    add(resource: Resource) {
        const { type } = resource;
        const cache = this.#cacheOf(type);
        cache.set(resource.id, resource);
        // send add event if applicable
        const payload = this.#getPayload(type, resource.id);
        if (payload) {
            for (const data of payload.data) {
                this.emit('add', { type: payload.type, data });
            }
        }
    }

    update(resource: Resource) {
        const { type } = resource;
        const cache = this.#cacheOf(type);
        cache.set(resource.id, resource);
        // send update event if applicable
        const payload = this.#getPayload(type, resource.id);
        if (payload) {
            for (const data of payload.data) {
                this.emit('update', { type: payload.type, data });
            }
        }
    }

    remove({ id, type }: ResourceIdentifier) {
        const cache = this.#cacheOf(type);
        cache.delete(id);
        // send remove event if applicable
        const payload = this.#getPayload(type, id);
        if (payload) {
            for (const data of payload.data) {
                this.emit('remove', { type: payload.type, data: { id: data.id } });
            }
        }
    }

    setAssociation<T extends ResourceType, U extends ResourceType>(sourceType: T, resultType: U, get: Association<U>['get'] = (cache, id) => {
        const resources = id ? cache[sourceType]?.get(id) || [] : Array.from(cache[sourceType]?.values() || []);
        return (Array.isArray(resources) ? resources : [resources]).map(resource => ({ ...resource.attributes, id: resource.id } as APIResourceMap[U]));
    }) {
        this.#associations[sourceType] = { type: resultType, get };
    }

    setRelationship(sourceType: ResourceType, resultType: ResourceType, through: string) {
        if (resultType in this.#associations) {
            const association = this.#associations[resultType] as Association;
            const parts = through.split('.');
            this.setAssociation(sourceType, resultType, (cache, id) => {
                const resources: Resource | Resource[] = (id ? cache[sourceType]?.get(id) || [] : Array.from<ResourceMap[keyof ResourceMap]>(cache[sourceType]?.values() || []));
                return (Array.isArray(resources) ? resources : [resources]).flatMap(resource => {
                    // loop through each relationship to create the list of resources
                    let resources = [resource];
                    for (const part of parts) {
                        resources = resources.flatMap(resource => {
                            const relationships = resource.relationships;
                            resources = [];
                            if (relationships && part in relationships) {
                                const { data } = relationships[part as keyof typeof relationships];
                                if (data) {
                                    // map each resources to it's cached resource
                                    return (Array.isArray(data) ? data : [data]).map(({ type, id }) => cache[type]?.get(id) as Resource);
                                }
                            }
                            return [];
                        });
                    }
                    // return mapped resources
                    return resources.flatMap(({ id }) => association.get(cache, id))
                });
            }
            );
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
         * - Routes, Shapes, Stops, Alerts, Lines
         */
        this.#cache.setAssociation('route', 'route', (cache, id) => {
            const resources = id ? cache.route?.get(id) || [] : Array.from(cache.route?.values() || []);
            return (Array.isArray(resources) ? resources : [resources]).map(resource => {
                // get included shapes assocated with the route
                const trips = Array.from(cache.trip?.values() || []).filter(value => value.relationships?.route?.data?.id === resource.id);
                const shapes = [];
                for (const resource of cache.shape?.values() || []) {
                    if (trips?.some(trip => trip.relationships?.shape?.data?.id === resource.id)) {
                        shapes.push({ id: resource.id, ...resource.attributes });
                    }
                }
                return { ...resource.attributes, id: resource.id, shapes };
            })
        });
        this.#cache.setAssociation('vehicle', 'vehicle', (cache, id) => {
            const resources = id ? cache.vehicle?.get(id) || [] : Array.from(cache.vehicle?.values() || []);
            return (Array.isArray(resources) ? resources : [resources]).map(resource => ({ ...resource.attributes, id: resource.id, route_id: resource.relationships?.route?.data?.id }));
        });
        this.#cache.setRelationship('route_pattern', 'route', 'route');
        this.#cache.setRelationship('trip', 'route', 'route_pattern.route');
        const routeTypeFilter = ROUTES_TYPES.join(',')
        const routes = this.client.streamRoutes({ 'filter[type]': routeTypeFilter, include: 'route_patterns.representative_trip.shape' });
        this.#cache.bind(routes);
        const vehicles = this.client.streamVehicles({ 'filter[route_type]': routeTypeFilter });
        this.#cache.bind(vehicles);
    }
}

const client = new Client(process.env.MBTA_API_KEY);
const tracker = new Tracker(client);

export {
    Tracker,
    tracker
};

