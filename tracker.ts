import { EventSource } from 'eventsource';
import { EventEmitter } from 'node:events';
import { isDeepStrictEqual } from 'node:util';
import { WebSocket } from 'ws';
import { AlertResource, Client, Document, PredictionResource, Resource, ResourceIdentifier, ResourceMap, ResourceType, RouteResource, RouteType, ScheduleResource, StopResource, VehicleResource } from "./api/mbta";

/**
 * -------------
 * | Constants |
 * -------------
 */

/**
 * Types of routes which should be tracked.
 */
const ROUTES_TYPES = [RouteType.LIGHT_RAIL, RouteType.HEAVY_RAIL, RouteType.COMMUTER_RAIL];

const MAPPERS = {
    route: mapRoute,
    vehicle: mapVehicle,
    stop: mapStop,
    schedule: mapSchedule,
    prediction: mapPrediction,
    alert: mapAlert
} as const satisfies { [P in APIResourceType]: (resource: ResourceMap[P], state: Partial<ResourceCache>) => EventResource<APIResourceMap[P]> | null };

/*
 * ---------
 * | Types |
 * ---------
 */

type APIResourceType = Extract<ResourceType, 'route' | 'vehicle' | 'stop' | 'alert' | 'schedule' | 'prediction'>;
interface APIIdentifier {
    id: string;
}
type IAPIResourceMap = {
    [P in APIResourceType]: APIIdentifier;
};
interface APIResourceMap extends IAPIResourceMap {
    route: ReturnType<typeof mapRoute>['resource'];
    vehicle: ReturnType<typeof mapVehicle>['resource'];
    stop: NonNullable<ReturnType<typeof mapStop>>['resource'];
    schedule: ReturnType<typeof mapSchedule>['resource'];
    prediction: ReturnType<typeof mapPrediction>['resource'];
    alert: ReturnType<typeof mapAlert>['resource'];
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
    routes?: RouteResource[];
    stopId?: string;
}
interface StreamEventMap<T extends APIResourceType = APIResourceType> extends Record<EventType, EventResource[] | EventResource> {
    reset: EventResource<APIResourceMap[T]>[];
    add: EventResource<APIResourceMap[T]>[];
    update: EventResource<APIResourceMap[T]>[];
    remove: EventResource[];
}
type EventPayloadMap<T extends APIResourceType = APIResourceType> = {
    [P in EventType]: {
        type: T;
        data: StreamEventMap<T>[P];
        filtered?: boolean;
    };
};
type PayloadMap<T extends APIResourceType = APIResourceType> = {
    [P in keyof EventPayloadMap]: {
        type: T;
        data: StreamEventMap[P][number]['resource'][];
    };
}
type EventMap<T extends APIResourceType = APIResourceType> = {
    [P in EventType]: [EventPayloadMap<T>[P]];
};
interface ResourceFilter {
    types: Set<APIResourceType>;
    routeIds: Set<string> | null;
    routeTypes: Set<RouteType> | null;
    stopIds: Set<string>;
}
interface WebsocketPayload {
    types: APIResourceType[]
    routeIds?: string[];
    routeTypes?: RouteType[];
    stopIds?: string[];
}

/*
 * -------------
 * | Functions |
 * -------------
 */

function resolveRouteIdsFromFilter(type: APIResourceType, filter: ResourceFilter, routeTypeAssociations: TrackerCache['routeTypeAssociations'], routeAssociations: TrackerCache['routeAssociations']) {
    let routeIds: Set<string>;
    if (filter.routeTypes && filter.routeIds) {
        routeIds = new Set<string>();
        for (const routeType of filter.routeTypes) {
            for (const routeId of routeTypeAssociations.get(routeType) ?? []) {
                if (filter.routeIds.has(routeId)) {
                    routeIds.add(routeId);
                }
            }
        }
    } else if (filter.routeTypes) {
        routeIds = new Set<string>();
        for (const routeType of filter.routeTypes) {
            for (const routeId of routeTypeAssociations.get(routeType) ?? []) {
                routeIds.add(routeId);
            }
        }
    } else if (filter.routeIds) {
        routeIds = filter.routeIds;
    } else {
        routeIds = new Set<string>();
        for (const routeId of routeAssociations.get(type)?.keys() ?? []) {
            routeIds.add(routeId);
        }
    }
    return routeIds;
}

function forEachRouteIdInStop(stopId: string, state: Partial<ResourceCache>, callbackfn: (routeId: string) => void) {
    for (const trip of state?.trip?.values() || []) {
        const routeId = trip.relationships?.route?.data?.id;
        if (routeId && trip.relationships?.stops?.data?.some(({ id }) => id === stopId)) {
            callbackfn(routeId);
        }
    }
}

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
        }
    };
}

function mapVehicle({ id, attributes, relationships }: VehicleResource, state: Partial<ResourceCache>) {
    const route = state.route?.get(relationships!.route!.data!.id);
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
        routes: route ? [route] : undefined
    };
}

function mapStop({ id, attributes, relationships }: StopResource, state: Partial<ResourceCache>, child = false): EventResource<any> | null {
    if (!child && relationships?.parent_station?.data) {
        return null;
    }
    const childIds = new Set<string>();
    const children = [];
    const routeIds = new Set<string>();
    const routes: RouteResource[] = [];
    if (child) {
        forEachRouteIdInStop(id, state, (routeId) => {
            if (!routeIds.has(routeId)) {
                const route = state.route?.get(routeId);
                if (route) {
                    routeIds.add(routeId);
                    routes.push(route);
                }
            }
        });
    } else {
        for (const stop of state.stop?.values() || []) {
            if (stop.relationships?.parent_station?.data?.id === id) {
                if (!childIds.has(stop.id)) {
                    childIds.add(stop.id);
                    const obj = mapStop(stop, state, true);
                    if (obj) {
                        children.push(obj.resource);
                        for (const { id: routeId } of obj.routes || []) {
                            if (!routeIds.has(routeId)) {
                                const route = state.route?.get(routeId);
                                if (route) {
                                    routeIds.add(routeId);
                                    routes.push(route);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return {
        resource: {
            id,
            routeIds: Array.from(routeIds),
            children,
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
        routes
    };
}

function mapSchedule({ id, attributes, relationships }: ScheduleResource, state: Partial<ResourceCache>) {
    return {
        resource: {
            id,
            stopId: relationships!.stop!.data!.id,
            timepoint: attributes!.timepoint,
            stopSequence: attributes!.stop_sequence,
            stopHeadsign: attributes!.stop_headsign,
            pickupType: attributes!.pickup_type,
            dropOffType: attributes!.drop_off_type,
            directionId: attributes!.direction_id,
            departureTime: attributes!.departure_time,
            arrivalTime: attributes!.arrival_time
        },
        stopId: relationships!.stop!.data!.id
    }
}

function mapPrediction({ id, attributes, relationships }: PredictionResource, state: Partial<ResourceCache>) {
    return {
        resource: {
            id,
            vehicleId: relationships!.vehicle?.data?.id,
            stopId: relationships!.stop?.data?.id,
            routeId: relationships!.route?.data?.id,
            scheduleId: relationships!.schedule?.data?.id,
            arrivalTime: attributes!.arrival_time!,
            departureTime: attributes!.departure_time!,
            updateType: attributes!.update_type,
            stopSequence: attributes!.stop_sequence,
            status: attributes!.status,
            scheduleRelationship: attributes!.schedule_relationship,
            revenueStatus: attributes!.revenue_status,
            directionId: attributes!.direction_id,
            arrivalUncertainty: attributes!.arrival_uncertainty,
            departureUncertainty: attributes!.departure_uncertainty
        },
        stopId: relationships!.stop?.data?.id
    }
}

function mapAlert({ id, attributes }: AlertResource, state: Partial<ResourceCache>) {
    const informedEntity = [];
    const routeIds = new Set<string>();
    const routes: RouteResource[] = [];
    function addRouteId(routeId: string) {
        if (!routeIds.has(routeId)) {
            routeIds.add(routeId);
            const route = state.route?.get(routeId);
            if (route) {
                routes.push(route);
            }
        }
    }
    // find related routes from informed entity
    for (const { trip: tripId, stop: stopId, route_type: routeType, route: routeId, facility: facilityId, direction_id: directionId, activities } of attributes!.informed_entity!) {
        if (tripId) {
            // the trip's related route
            const trip = state.trip?.get(tripId);
            const routeId = trip?.relationships?.route?.data?.id;
            if (routeId && !routeIds.has(routeId)) {
                addRouteId(routeId);
            }
        } else if (facilityId) {
            // all routes related to the facility's related stop
            const facility = state.facility?.get(facilityId);
            if (facility) {
                const stopId = facility.relationships?.stop?.data?.id;
                if (stopId) {
                    forEachRouteIdInStop(stopId, state, addRouteId);
                }
            }
        } else if (stopId) {
            // add all routes related to the stop
            forEachRouteIdInStop(stopId, state, addRouteId);
        } else if (routeType) {
            // add all routes of the matching type
            for (const route of state?.route?.values() || []) {
                if (route.attributes!.type === routeType) {
                    addRouteId(route.id);
                }
            }
        } else if (routeId) {
            // add the route
            addRouteId(routeId);
        }
        informedEntity.push({
            trip: tripId,
            stop: stopId,
            routeType: routeType,
            route: routeId,
            facility: facilityId,
            directionId,
            activities: activities!,
        });
    }
    return {
        resource: {
            id,
            url: attributes!.url,
            createdAt: attributes!.created_at!,
            updatedAt: attributes!.updated_at!,
            activePeriod: attributes!.active_period!.map(period => ({
                start: period.start!,
                end: period.end!
            })),
            effect: attributes!.effect!,
            effectName: attributes!.effect_name,
            header: attributes!.header!,
            shortHeader: attributes!.short_header,
            severity: attributes!.severity!,
            cause: attributes!.cause!,
            serviceEffect: attributes!.service_effect!,
            lifecycle: attributes!.lifecycle!,
            informedEntity,
            timeframe: attributes!.timeframe,
            image: attributes!.image,
            imageAlternativeText: attributes!.image_alternative_text,
            durationCertainty: attributes!.duration_certainty,
            description: attributes!.description,
            banner: attributes!.banner
        },
        routes
    }
}

function matchesFilters(type: APIResourceType, { routes, stopId }: EventResource, filter: ResourceFilter) {
    // if the filter does not contain the object's type
    if (!filter.types.has(type)) {
        return false;
    }
    // if the filter does not allow a related route
    // is there not a related route which is related to the resource?
    if (routes && routes.every(route => route
        && (filter.routeIds
            && !filter.routeIds.has(route.id)
            || route.attributes?.type == null
            || filter.routeTypes
            && !filter.routeTypes.has(route.attributes.type))
    )) {
        return false;
    }
    if (stopId && !filter.stopIds.has(stopId)) {
        return false;
    }
    return true;
}

/*
 * -----------
 * | Classes |
 * -----------
 */

class TrackerCache extends EventEmitter<EventMap> {
    #routeTypeAssociations = new Map<RouteType, Set<string>>();
    get routeTypeAssociations() {
        return this.#routeTypeAssociations;
    }
    #routeAssociations = new Map<APIResourceType, Map<string, Set<string>>>();
    get routeAssociations() {
        return this.#routeAssociations;
    }
    #stopAssociations = new Map<APIResourceType, Map<String, Set<string>>>();
    get stopAssociations() {
        return this.#stopAssociations;
    }
    #state: Partial<ResourceCache>;
    get state() {
        return this.#state;
    }
    #associations: Partial<Record<APIResourceType, AssociateFunction>>;
    #requesters: RequestFunction[];

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
                // keep track of which resources are updated
                const updatedIds: { [P in ResourceType]?: Set<string> } = {};
                for (const resource of resources) {
                    const { type, id } = resource;
                    const old = this.#state[type]?.get(id);
                    if (!old) {
                        this.add(resource);
                    } else if (!isDeepStrictEqual(old, resource)) {
                        if (type in updatedIds) {
                            updatedIds[type] = new Set();
                        }
                        updatedIds[type]!.add(id);
                        this.update(resource);
                    }
                }
                // remove old resources
                for (const updatedType in updatedIds) {
                    for (const { type, id } of this.#state[updatedType as ResourceType]?.values() || []) {
                        if (!updatedIds[type]!.has(id)) {
                            this.remove({ type: type, id: id });
                        }
                    }
                }
            } else if ('errors' in document) {
                console.error(document.errors);
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

    #updateAssociations(event: EventType, { type, data }: { type: APIResourceType, data: EventResource<APIResource>[] }) {
        const isReset = event === 'reset';
        const isUpdate = event === 'update';
        const isAdd = event === 'add' || isReset || isUpdate;
        const isRemove = event === 'remove' || isUpdate;
        if (isAdd) {
            if (!this.#routeAssociations.has(type)) {
                this.#routeAssociations.set(type, new Map());
            }
            if (!this.#stopAssociations.has(type)) {
                this.#stopAssociations.set(type, new Map());
            }
        }
        if (isReset) {
            this.#routeAssociations.get(type)?.clear();
            this.#stopAssociations.get(type)?.clear();
        }
        // update individual resource associations
        for (const obj of data) {
            // update route associations
            for (const route of obj.routes ?? []) {
                const map = this.#routeAssociations.get(type)!;
                if (isRemove) {
                    map.get(route.id)?.delete(obj.resource.id);
                }
                if (isAdd) {
                    if (!map.has(route.id)) {
                        map.set(route.id, new Set());
                    }
                    map.get(route.id)!.add(obj.resource.id);
                }
            }
            if (obj.stopId) {
                const map = this.#stopAssociations.get(type)!;
                if (isRemove) {
                    map.get(obj.stopId)?.delete(obj.resource.id);
                }
                if (isAdd) {
                    if (!map.has(obj.stopId)) {
                        map.set(obj.stopId, new Set());
                    }
                    map.get(obj.stopId)!.add(obj.resource.id);
                }
            }
        }
        // update route type associations if applicable
        if (type === 'route') {
            if (isReset) {
                this.#routeTypeAssociations.clear();
            }
            for (const obj of data) {
                const route = obj.resource as APIResourceMap['route'];
                if (isRemove) {
                    this.#routeTypeAssociations.get(route.type)?.delete(route.id);
                }
                if (isAdd) {
                    if (!this.#routeTypeAssociations.has(route.type)) {
                        this.#routeTypeAssociations.set(route.type, new Set());
                    }
                    this.#routeTypeAssociations.get(route.type)!.add(route.id);
                }
            }
        }
    }

    getPayload(type: ResourceType, id?: string): { type: APIResourceType, data: EventResource<APIResource>[] } | undefined {
        if (this.#isTracked(type)) {
            const fn = this.#associations[type]!;
            return { type, data: fn(this.#state, id) };
        }
    }

    getEventResources<T extends APIResourceType>(type: T) {
        return (this.getPayload(type)?.data || []) as EventResource<APIResourceMap[T]>[];
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
            const payload = this.getPayload(type);
            if (payload) {
                this.#updateAssociations('reset', payload);
                this.emit('reset', { ...payload, filtered: true });
            }
        }
    }

    add(resource: Resource) {
        const { type } = resource;
        const cache = this.#cacheOf(type);
        cache.set(resource.id, resource);
        // send add event if applicable
        const payload = this.getPayload(type, resource.id);
        if (payload) {
            this.#updateAssociations('add', payload);
            this.emit('add', { type: payload.type, data: payload.data, filtered: true });
        }
    }

    update(resource: Resource) {
        const { type } = resource;
        const cache = this.#cacheOf(type);
        cache.set(resource.id, resource);
        // send update event if applicable
        const payload = this.getPayload(type, resource.id);
        if (payload) {
            this.#updateAssociations('update', payload);
            this.emit('update', { type: payload.type, data: payload.data, filtered: true });
        }
    }

    remove({ type, id }: ResourceIdentifier) {
        const cache = this.#cacheOf(type);
        cache.delete(id);
        // send remove event if applicable
        const payload = this.getPayload(type, id);
        if (payload) {
            this.#updateAssociations('remove', payload);
            this.emit('remove', { type: payload.type, data: payload.data, filtered: true });
        }
    }

    track<T extends APIResourceType>(type: T) {
        this.associate(type, (state, id) => {
            const fn = MAPPERS[type] as (resource: ResourceMap[T], state: Partial<ResourceCache>) => EventResource<APIResourceMap[T]> | null;
            const resources = id ? state[type]?.get(id) || [] : Array.from(state[type]?.values() || []);
            const result = [];
            for (const resource of Array.isArray(resources) ? resources : [resources]) {
                try {
                    const obj = fn(resource, state);
                    if (obj) {
                        result.push(obj)
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            return result;
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

    async #sendFilterEvents(oldFilter: ResourceFilter, newFilter: ResourceFilter, events: { [T in keyof EventPayloadMap]: (payload: EventPayloadMap[T]) => void }) {
        const start = Date.now();
        const routeTypeAssociations = this.#cache.routeTypeAssociations;
        const routeAssociations = this.#cache.routeAssociations;
        const stopAssociations = this.#cache.stopAssociations;
        const removed: Partial<Record<APIResourceType, EventResource[]>> = {};
        const added: { [P in APIResourceType]?: EventResource<APIResourceMap[P]>[] } = {};
        // combine types
        const types = new Set<APIResourceType>();
        for (const type of oldFilter.types) {
            types.add(type);
        }
        for (const type of newFilter.types) {
            types.add(type);
        }
        for (const type of types) {
            // find which routeIds matched the old filters
            const oldRouteIds = oldFilter.types.has(type) ? resolveRouteIdsFromFilter(type, oldFilter, routeTypeAssociations, routeAssociations) : new Set<string>();
            const newRouteIds = newFilter.types.has(type) ? resolveRouteIdsFromFilter(type, newFilter, routeTypeAssociations, routeAssociations) : new Set<string>();
            const removedResources = removed[type] ??= [];
            const removedResourceIds = new Set();
            const addedResources = added[type] ??= [];
            const addedResourceIds = new Set();
            const routes = routeAssociations.get(type);
            // remove route IDs which are no longer present
            for (const routeId of oldRouteIds) {
                if (!newRouteIds.has(routeId)) {
                    const associated = routes?.get(routeId) ?? [];
                    for (const resourceId of associated) {
                        if (!removedResourceIds.has(resourceId)) {
                            const payload = this.#cache.getPayload(type, resourceId);
                            if (payload) {
                                for (const resource of payload.data) {
                                    if (!matchesFilters(type, resource, newFilter)) {
                                        removedResources.push(resource);
                                        removedResourceIds.add(resourceId);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // add route IDs which were not previously present
            for (const routeId of newRouteIds) {
                if (!oldRouteIds.has(routeId)) {
                    const associated = routes?.get(routeId) ?? [];
                    for (const resourceId of associated) {
                        if (!addedResourceIds.has(resourceId)) {
                            const payload = this.#cache.getPayload(type, resourceId);
                            if (payload) {
                                addedResources.push(...payload.data);
                                addedResourceIds.add(resourceId);
                            }
                        }
                    }
                }
            }
            const stops = stopAssociations.get(type);
            // remove stop IDs which are no longer present
            for (const stopId of oldFilter.stopIds) {
                if (!newFilter.stopIds.has(stopId)) {
                    const associated = stops?.get(stopId) ?? [];
                    for (const resourceId of associated) {
                        if (!removedResourceIds.has(resourceId)) {
                            const payload = this.#cache.getPayload(type, resourceId);
                            if (payload) {
                                removedResources.push(...payload.data);
                                removedResourceIds.add(resourceId);
                            }
                        }
                    }
                }
            }
            // add stop IDs which were not previously present
            for (const stopId of newFilter.stopIds) {
                if (!oldFilter.stopIds.has(stopId)) {
                    const associated = stops?.get(stopId) ?? [];
                    for (const resourceId of associated) {
                        if (!addedResourceIds.has(resourceId)) {
                            const payload = this.#cache.getPayload(type, resourceId);
                            if (payload) {
                                addedResources.push(...payload.data);
                                addedResourceIds.add(resourceId);
                            }
                        }
                    }
                }
            }
        }
        const end = Date.now();
        console.log(`Took ${end - start}ms to resolve filter events.`);
        // send eventss
        for (const type in removed) {
            const data = removed[type as APIResourceType]!;
            if (data.length > 0) {
                events.remove({ type: type as APIResourceType, data });
            }
        }
        for (const type in added) {
            const data = added[type as APIResourceType]!;
            if (data.length > 0) {
                events.add({ type: type as APIResourceType, data });
            }
        }
    }

    attach(ws: WebSocket) {
        let initialized = false;
        const filter: ResourceFilter = {
            types: new Set(),
            routeIds: null,
            routeTypes: null,
            stopIds: new Set()
        };
        function forward<T extends EventType>(event: T, { type, data }: PayloadMap[T]) {
            ws.send(JSON.stringify({ event, type, data }));
        }
        function reset({ type, data, filtered }: EventPayloadMap['reset']) {
            if (filtered) {
                data = data.filter(resource => matchesFilters(type, resource, filter));
            }
            if (data.length > 0) {
                forward('reset', { type, data: data.map(er => er.resource) });
            }
        }
        function add({ type, data, filtered }: EventPayloadMap['add']) {
            if (filtered) {
                data = data.filter(resource => matchesFilters(type, resource, filter));
            }
            if (data.length > 0) {
                forward('add', { type, data: data.map(er => er.resource) });
            }
        }
        function update({ type, data, filtered }: EventPayloadMap['update']) {
            if (filtered) {
                data = data.filter(resource => matchesFilters(type, resource, filter));
            }
            if (data.length > 0) {
                forward('update', { type, data: data.map(er => er.resource) });
            }
        }
        function remove({ type, data, filtered }: EventPayloadMap['remove']) {
            if (filtered) {
                data = data.filter(resource => matchesFilters(type, resource, filter));
            }
            if (data.length > 0) {
                forward('remove', { type, data: data.map(data => ({ id: data.resource.id })) });
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
        // filter is changed
        ws.addEventListener('message', (event) => {
            const oldFilter = { ...filter };
            const json = event.data.toString();
            try {
                const data: WebsocketPayload = JSON.parse(json);
                filter.types = new Set(data.types);
                filter.routeIds = data.routeIds ? new Set(data.routeIds) : null;
                filter.routeTypes = data.routeTypes ? new Set(data.routeTypes) : null;
                if (data.stopIds) {
                    filter.stopIds = new Set(data.stopIds);
                }
                // sync resources
                if (initialized) {
                    // ensure order
                    this.#sendFilterEvents(oldFilter, { ...filter }, { reset, add, update, remove });
                } else {
                    // sent initial reset events to sync data
                    for (const type of filter.types) {
                        reset({ type, data: this.#cache.getEventResources(type), filtered: true });
                    }
                    initialized = true;
                }
            } catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * Initializes tracking.
     */
    async track() {
        const routes = await this.client.getRoutes({ 'filter[type]': ROUTES_TYPES.join(','), 'fields[route]': '' });
        const routeIdFilter = routes.data.map(route => route.id).join(',');
        this.#cache.track('route');
        this.#cache.track('vehicle');
        this.#cache.track('stop');
        this.#cache.track('schedule');
        this.#cache.track('prediction');
        this.#cache.track('alert');
        const routesfn = this.client.getRoutes.bind(this.client, { 'filter[id]': routeIdFilter, include: 'route_patterns.representative_trip.shape,route_patterns.representative_trip.stops.parent_station' });
        await this.#cache.addRequester(routesfn);
        const scheduleStream = this.client.streamSchedules({ 'filter[route]': routeIdFilter });
        this.#cache.bind(scheduleStream);
        const predictionStream = this.client.streamPredictions({ 'filter[route]': routeIdFilter });
        this.#cache.bind(predictionStream);
        const vehicleStream = this.client.streamVehicles({ 'filter[route]': routeIdFilter });
        this.#cache.bind(vehicleStream);
        const alertStream = this.client.streamAlerts({ 'filter[route]': routeIdFilter });
        this.#cache.bind(alertStream);
    }
}

const client = new Client(process.env.MBTA_API_KEY);
const tracker = new Tracker(client);

export {
    Tracker,
    tracker
};

