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

const MAPPERS = (<T extends { [P in APIResourceType]: (resource: ResourceMap[P], state: Partial<ResourceCache>) => EventResource<APIResource> }>(value: T) => value)({
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
    route: ReturnType<typeof mapRoute>['resource'];
    vehicle: ReturnType<typeof mapVehicle>['resource'];
    stop: ReturnType<typeof mapStop>['resource'];
}
type APIResource = APIResourceMap[APIResourceType];
type ResourceCache = {
    [P in ResourceType]: Map<string, ResourceMap[P]>;
};
type AssociateFunction<T extends APIResourceType = APIResourceType> = (state: Partial<ResourceCache>, id?: string) => EventResource<APIResourceMap[T]>[]
/**
 * A function which requests a document of resources.
 */
type RequestFunction = () => Promise<Document>;
type EventType = 'reset' | 'add' | 'update' | 'remove';
interface EventResource<T extends APIIdentifier = APIIdentifier> {
    resource: T;
    routes: RouteResource[];
}
interface StreamEventMap<T extends APIResourceType = APIResourceType> extends Record<EventType, EventResource[] | EventResource> {
    reset: EventResource<APIResourceMap[T]>[];
    add: EventResource<APIResourceMap[T]>;
    update: EventResource<APIResourceMap[T]>;
    remove: EventResource;
}
type EventPayloadMap<T extends APIResourceType = APIResourceType> = {
    [P in EventType]: {
        type: T;
        data: StreamEventMap<T>[P];
    };
};
type PayloadMap<T extends APIResourceType = APIResourceType> = {
    [P in keyof EventPayloadMap]: {
        type: T;
        data: P extends 'reset' ? APIResourceMap[T][] : StreamEventMap<T>[Exclude<P, 'reset'>]['resource'];
    };
}
type EventMap<T extends APIResourceType = APIResourceType> = {
    [P in EventType]: [EventPayloadMap<T>[P]];
};
interface EventFilter {
    types: Set<APIResourceType>;
    routeIds: Set<string> | null;
    routeTypes: Set<RouteType> | null;
}
interface WebsocketPayload {
    types: APIResourceType[]
    routeIds?: string[];
    routeTypes?: RouteType[];
}

/*
 * -------------
 * | Functions |
 * -------------
 */

function mapRoute(route: RouteResource, state: Partial<ResourceCache>) {
    const { id, attributes } = route;
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
        resource: {
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
        },
        routes: [route]
    };
}

function mapVehicle({ id, attributes, relationships }: VehicleResource, state: Partial<ResourceCache>) {
    return {
        resource: {
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
        },
        routes: [state.route!.get(relationships!.route!.data!.id)!]
    };
}

function mapStop({ id, attributes }: StopResource, state: Partial<ResourceCache>) {
    const routeIds = new Set<string>();
    const routes = [];
    for (const trip of state?.trip?.values() || []) {
        const routeId = trip.relationships?.route?.data?.id;
        if (routeId && trip.relationships?.stops?.data?.some(({ id: stopId }) => stopId === id) && !routeIds.has(routeId)) {
            routeIds.add(routeId);
            routes.push(state.route!.get(routeId)!);
        }
    }
    return {
        resource: {
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
        },
        routes: routes
    }
}

function matchesFilters(type: APIResourceType, routes: RouteResource[], filter: EventFilter) {
    if (filter.types && !filter.types.has(type)) {
        return false;
    }
    if (routes.some(route => filter.routeIds && !filter.routeIds.has(route.id) || route.attributes?.type == null || filter.routeTypes && !filter.routeTypes.has(route.attributes.type))) {
        return false;
    }
    return true;
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
        return (this.#getPayload('route')?.data || []) as EventResource<APIResourceMap['route']>[];
    }
    get vehicles() {
        return (this.#getPayload('vehicle')?.data || []) as EventResource<APIResourceMap['vehicle']>[];
    }
    get stops() {
        return (this.#getPayload('stop')?.data || []) as EventResource<APIResourceMap['stop']>[];
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

    #getPayload(type: ResourceType, id?: string): { type: APIResourceType, data: EventResource<APIResource>[] } | undefined {
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
                this.emit('remove', { type: payload.type, data: { resource: { id: data.resource.id }, routes: data.routes } });
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

    async addRequester(fn: RequestFunction) {
        this.#requesters.push(fn);
        // send initial reset event
        const document = await fn();
        if ('data' in document) {
            const data = Array.isArray(document.data) ? document.data : [document.data];
            const included = document.included || [];
            const resources = [...data, ...included];
            this.reset(resources);
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
        const filters: EventFilter = {
            types: new Set(),
            routeIds: new Set(),
            routeTypes: new Set()
        };
        function forward<T extends EventType>(event: T, { type, data }: PayloadMap[T]) {
            const payload = {
                type: `${type.toUpperCase()}_${event.toUpperCase()}`,
                data: data
            };
            ws.send(JSON.stringify(payload));
        }
        function reset({ type, data }: EventPayloadMap['reset']) {
            data = data.filter(resource => matchesFilters(type, resource.routes, filters));
            if (data.length > 0) {
                forward('reset', { type, data: data.map(er => er.resource) });
            }
        }
        function add({ type, data }: EventPayloadMap['add']) {
            if (matchesFilters(type, data.routes, filters)) {
                forward('add', { type, data: data.resource });
            }
        }
        function update({ type, data }: EventPayloadMap['update']) {
            if (matchesFilters(type, data.routes, filters)) {
                forward('update', { type, data: data.resource });
            }
        }
        function remove({ type, data }: EventPayloadMap['remove']) {
            if (matchesFilters(type, data.routes, filters)) {
                forward('remove', { type, data: data.resource });
            }
        }
        ws.once("close", () => {
            this.#cache.removeListener('reset', reset);
            this.#cache.removeListener('add', add);
            this.#cache.removeListener('update', update);
            this.#cache.removeListener('remove', remove);
        });
        this.#cache.on('reset', reset);
        this.#cache.on('add', add);
        this.#cache.on('update', update);
        this.#cache.on('remove', remove);
        ws.addEventListener('message', (event) => {
            const json = event.data.toString();
            try {
                const data: WebsocketPayload = JSON.parse(json);
                filters.types = new Set(data.types);
                filters.routeIds = data.routeIds ? new Set(data.routeIds) : null;
                filters.routeTypes = data.routeTypes ? new Set(data.routeTypes) : null;
                // sent initial reset events to sync data
                reset({ type: 'route', data: this.#cache.routes });
                reset({ type: 'vehicle', data: this.#cache.vehicles });
                reset({ type: 'stop', data: this.#cache.stops });
            } catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * Initializes tracking.
     */
    async track() {
        /*
         * Collect the following data:
         * - Vehicles - For position/speed/direction & any other data we might want to show
         * - Schedules - For schedules times
         * - Predictions - For predicted times
         * - Alerts - For alerts
         * Maybe also the following data at significantly less frequent intervals:
         * - Routes, Shapes, Stops, Lines
         */
        this.#cache.track('route');
        this.#cache.track('vehicle');
        this.#cache.track('stop');
        const routeTypeFilter = ROUTES_TYPES.join(',');
        const routesfn = this.client.getRoutes.bind(this.client, { 'filter[type]': routeTypeFilter, include: 'route_patterns.representative_trip.shape,route_patterns.representative_trip.stops' });
        await this.#cache.addRequester(routesfn);
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
