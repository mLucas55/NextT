import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { Client, Resource, ResourceIdentifier, ResourceMap, ResourceType, RouteResource, RouteType, ShapeResource, VehicleResource } from "./api/mbta";

/**
 * Types of routes which should be tracked.
 */
const ROUTES_TYPES = [RouteType.LIGHT_RAIL, RouteType.HEAVY_RAIL];

const MAPPINGS = (<T extends { [P in ResourceType]?: (resource: ResourceMap[P], state: Partial<ResourceCache>) => any }>(value: T) => value)({
    route: ({ id, attributes }, state) => {
        // get related shapes
        const shapes = [];
        for (const { relationships } of state.trip?.values() || []) {
            if (relationships?.route?.data?.id === id && state.shape && relationships.shape?.data) {
                const shape = state.shape.get(relationships.shape.data.id);
                if (shape) {
                    const { id, attributes } = shape
                    shapes.push({ id: id, polyline: attributes!.polyline });
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
    },
    vehicle: ({ id, attributes, relationships }) => ({
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
    }),
    stop: ({ id, attributes }, state) => ({
        id,
        routeIds: state.route, // TODO
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
    })
});
type Mappings = typeof MAPPINGS;
interface APIIdentifier {
    id: string;
}
type APIResourceMap = {
    [P in keyof Mappings]: ReturnType<Mappings[P]>;
};
type APIResourceType = keyof APIResourceMap;
type APIResource = APIResourceMap[APIResourceType];
type Association<T extends APIResourceType = APIResourceType> = {
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
type PayloadMap<T extends APIResourceType = APIResourceType> = {
    [P in EventType]: {
        type: T;
        data: StreamEventMap<APIResourceMap[T]>[P];
    };
};
type EventMap<T extends APIResourceType = APIResourceType> = {
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

    #getPayload(type: ResourceType, id?: string): { type: APIResourceType, data: APIResource[] } | undefined {
        if (this.#isTracked(type)) {
            const association = this.#associations[type]!;
            return { type: association.type, data: association.get(this.#cache, id) }
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
        this.associate(type, type, (cache, id) => {
            const fn = MAPPINGS[type] as (resource: ResourceMap[T], state: Partial<ResourceCache>) => any;
            const resources = id ? cache[type]?.get(id) || [] : Array.from(cache[type]?.values() || []);
            return (Array.isArray(resources) ? resources : [resources]).map(resource => fn(resource, cache));
        });
    }

    associate<T extends ResourceType, U extends APIResourceType>(sourceType: T, resultType: U, get: Association<U>['get']) {
        this.#associations[sourceType] = { type: resultType, get };
    }

    relate(sourceType: ResourceType, resultType: APIResourceType, through: string) {
        if (resultType in this.#associations) {
            const association = this.#associations[resultType] as Association;
            const parts = through.split('.');
            this.associate(sourceType, resultType, (cache, id) => {
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
        this.#cache.track('route');
        this.#cache.track('vehicle');
        this.#cache.track('stop');
        this.#cache.relate('route_pattern', 'route', 'route');
        this.#cache.relate('trip', 'route', 'route_pattern.route');
        const routeTypeFilter = ROUTES_TYPES.join(',');
        const routes = this.client.streamRoutes({ 'filter[type]': routeTypeFilter, include: 'route_patterns.representative_trip.shape,route_patterns.representative_trip.stops' });
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

