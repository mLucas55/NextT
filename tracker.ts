import { EventSource } from 'eventsource';
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { Client, Document, Resource, ResourceIdentifier, ResourceMap, ResourceType, RouteResource, RouteType, StopResource, VehicleResource } from "./api/mbta";

/**
 * -------------
 * | Constants |
 * -------------
 */

/**
 * Types of routes which should be tracked.
 */
const ROUTES_TYPES = [RouteType.LIGHT_RAIL, RouteType.HEAVY_RAIL];

const MAPPERS = (<T extends { [P in APIResourceType]: (resource: ResourceMap[P], state: Partial<ResourceCache>) => APIIdentifier }>(value: T) => value)({
    route: mapRoute,
    vehicle: mapVehicle,
    stop: mapStop
});

/*
 * ---------
 * | Types |
 * ---------
 */

type APIResourceType = Extract<ResourceType, 'route' | 'vehicle' | 'stop'>;
interface APIIdentifier {
    id: string;
}
type IAPIResourceMap = {
    [P in APIResourceType]: APIIdentifier;
};
interface APIResourceMap extends IAPIResourceMap {
    route: ReturnType<typeof mapRoute>;
    vehicle: ReturnType<typeof mapVehicle>;
    stop: ReturnType<typeof mapStop>;
}
type APIResource = APIResourceMap[APIResourceType];
type ResourceCache = {
    [P in ResourceType]: Map<string, ResourceMap[P]>;
};
type AssociateFunction<T extends APIResourceType = APIResourceType> = (state: Partial<ResourceCache>, id?: string) => APIResourceMap[T][]
/**
 * A function which requests a document of resources.
 */
type RequestFunction = () => Promise<Document>;
type EventType = 'reset' | 'add' | 'update' | 'remove';
interface StreamEventMap<T extends APIResourceType = APIResourceType> extends Record<EventType, APIIdentifier[] | APIIdentifier> {
    reset: APIResourceMap[T][];
    add: APIResourceMap[T];
    update: APIResourceMap[T];
    remove: APIIdentifier;
}
type PayloadMap<T extends APIResourceType = APIResourceType> = {
    [P in EventType]: {
        type: T;
        data: StreamEventMap<T>[P];
    };
};
type EventMap<T extends APIResourceType = APIResourceType> = {
    [P in EventType]: [PayloadMap<T>[P]];
};

/*
 * -------------
 * | Functions |
 * -------------
 */

function mapRoute({ id, attributes }: RouteResource, state: Partial<ResourceCache>) {
    // get related shapes
    const shapes = [];
    for (const { relationships } of state.trip?.values() || []) {
        if (relationships?.route?.data?.id === id && state.shape && relationships.shape?.data) {
            const shape = state.shape.get(relationships.shape.data.id);
            if (shape) {
                shapes.push({ id: shape.id, polyline: shape.attributes!.polyline });
            }
        }
    }
    return {
        id,
        shapes: shapes,
        type: attributes!.type!,
        textColor: attributes!.text_color,
        sortOrder: attributes!.sort_order,
        shortName: attributes!.short_name,
        longName: attributes!.long_name,
        fareClass: attributes!.fare_class,
        directionNames: attributes!.direction_names,
        directionDestinations: attributes!.direction_destinations,
        description: attributes!.description,
        color: attributes!.color
    };
}

function mapVehicle({ id, attributes, relationships }: VehicleResource) {
    return {
        id,
        routeId: relationships!.route!.data!.id,
        updatedAt: attributes!.updated_at!,
        latitude: attributes!.latitude!,
        longitude: attributes!.longitude!,
        bearing: attributes!.bearing!,
        speed: attributes!.speed,
        revenueStatus: attributes!.revenue_status,
        occupancyStatus: attributes!.occupancy_status,
        label: attributes!.label,
        directionId: attributes!.direction_id,
        currentStopSequence: attributes!.current_stop_sequence,
        currentStatus: attributes!.current_status,
        carriages: attributes!.carriages?.map(carriage => ({
            occupancyStatus: carriage.occupancy_status,
            occupancyPercentage: carriage.occupancy_percentage,
            label: carriage.label
        }))
    };
}

function mapStop({ id, attributes }: StopResource, state: Partial<ResourceCache>) {
    const routeIds = new Set<string>();
    for (const trip of state?.trip?.values() || []) {
        const routeId = trip.relationships?.route?.data?.id;
        if (routeId && trip.relationships?.stops?.data?.some(({ id: stopId }) => stopId === id)) {
            routeIds.add(routeId);
        }
    }
    return {
        id,
        routeIds: Array.from(routeIds),
        name: attributes!.name!,
        latitude: attributes!.latitude!,
        longitude: attributes!.longitude!,
        wheelchairBoarding: attributes!.wheelchair_boarding,
        vehicleType: attributes!.vehicle_type,
        platformName: attributes!.platform_name,
        platformCode: attributes!.platform_code,
        onStreet: attributes!.on_street,
        municipality: attributes!.municipality,
        locationType: attributes!.location_type,
        description: attributes!.description,
        atStreet: attributes!.at_street,
        address: attributes!.address
    }
}

/**
 * Returns whether two objects are exactly equal.
 * 
 * If both objects are objects then each entry's equality will be checked recursively.
 */
function areEqual(obj: any, other: any) {
    if (obj === other) {
        return true;
    }
    if (typeof obj !== typeof other) {
        return false;
    }
    if (typeof obj === 'object') {
        const keys = new Set<string>();
        for (const key in obj) {
            keys.add(key);
            if (!areEqual(obj[key], other[key])) {
                return false;
            }
        }
        for (const key in other) {
            if (!keys.has(key) || !areEqual(obj[key], other[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
}

/*
 * -----------
 * | Classes |
 * -----------
 */

class TrackerCache extends EventEmitter<EventMap> {
    #state: Partial<ResourceCache>;
    #associations: Partial<Record<APIResourceType, AssociateFunction>>;
    #requesters: RequestFunction[];

    get routes() {
        return (this.#getPayload('route')?.data || []) as APIResourceMap['route'][];
    }
    get vehicles() {
        return (this.#getPayload('vehicle')?.data || []) as APIResourceMap['vehicle'][];
    }

    constructor() {
        super();
        this.#state = {};
        this.#associations = {};
        this.#requesters = [];
        this.setMaxListeners(Infinity);
        // call requesters every 5 minutes
        setTimeout(this.#sendRequests.bind(this), 300000);
    }

    async #sendRequests() {
        for (const fn of this.#requesters) {
            const document = await fn();
            if ('data' in document) {
                const data = Array.isArray(document.data) ? document.data : [document.data];
                const included = document.included || [];
                const resources = [...data, ...included];
                for (const resource of resources) {
                    if (!areEqual(this.#state[resource.type]?.get(resource.id), resource)) {
                        this.update(resource);
                    }
                }
            }
        }
    }

    #isTracked(type: ResourceType): type is APIResourceType {
        return type in this.#associations;
    }

    #cacheOf<T extends ResourceType>(type: T) {
        if (!this.#state[type]) {
            this.#state[type] = new Map();
        }
        return this.#state[type] as Map<string, ResourceMap[T]>;
    }

    #getPayload(type: ResourceType, id?: string): { type: APIResourceType, data: APIResource[] } | undefined {
        if (this.#isTracked(type)) {
            const fn = this.#associations[type]!;
            return { type, data: fn(this.#state, id) }
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

    track<T extends APIResourceType>(type: T) {
        this.associate(type, (state, id) => {
            const fn = MAPPERS[type] as (resource: ResourceMap[T], state: Partial<ResourceCache>) => any;
            const resources = id ? state[type]?.get(id) || [] : Array.from(state[type]?.values() || []);
            return (Array.isArray(resources) ? resources : [resources]).map(resource => fn(resource, state));
        });
    }

    associate<T extends APIResourceType>(type: T, fn: AssociateFunction<T>) {
        this.#associations[type] = fn;
    }

    bind(es: EventSource) {
        es.addEventListener('reset', (event) => this.reset(JSON.parse(event.data)));
        es.addEventListener('add', (event) => this.add(JSON.parse(event.data)));
        es.addEventListener('update', (event) => this.update(JSON.parse(event.data)));
        es.addEventListener('remove', (event) => this.remove(JSON.parse(event.data)));
    }

    addRequester(fn: RequestFunction) {
        this.#requesters.push(fn);
        // send initial reset event
        fn().then((document) => {
            if ('data' in document) {
                const data = Array.isArray(document.data) ? document.data : [document.data];
                const included = document.included || [];
                const resources = [...data, ...included];
                this.reset(resources);
            }
        })
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
        this.#cache.track('route');
        this.#cache.track('vehicle');
        this.#cache.track('stop');
        const routeTypeFilter = ROUTES_TYPES.join(',');
        const routesfn = this.client.getRoutes.bind(this.client, { 'filter[type]': routeTypeFilter, include: 'route_patterns.representative_trip.shape,route_patterns.representative_trip.stops' });
        this.#cache.addRequester(routesfn);
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
