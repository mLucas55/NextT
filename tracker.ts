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
} as const satisfies { [P in APIResourceType]: (resource: ResourceMap[P], state: Partial<ResourceCache>) => EventResource<APIResourceMap[P]> };

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
    const routes: RouteResource[] = [];
    forEachRouteIdInStop(id, state, (routeId) => {
        if (!routeIds.has(routeId)) {
            routeIds.add(routeId);
            routes.push(state.route!.get(routeId)!);
        }
    });
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

function matchesFilters(type: APIResourceType, { routes, stopId }: EventResource, filter: EventFilter) {
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

    #getPayload(type: ResourceType, id?: string): { type: APIResourceType, data: EventResource<APIResource>[] } | undefined {
        if (this.#isTracked(type)) {
            const fn = this.#associations[type]!;
            return { type, data: fn(this.#state, id) }
        }
    }

    getEventResources<T extends APIResourceType>(type: T) {
        return (this.#getPayload(type)?.data || []) as EventResource<APIResourceMap[T]>[];
    }

    reset(resources: Resource[]) {
        const cleared = new Set<ResourceType>();
        for (const resource of resources) {
            // lazy solution to identical stops
            if (resource.type === 'stop' && resource.attributes?.name && this.#state.stop && Array.from(this.#state.stop.values()).some(stop => stop.attributes?.name === resource.attributes?.name)) {
                continue;
            }
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
        // lazy solution to identical stops
        if (resource.type === 'stop' && resource.attributes?.name && this.#state.stop && Array.from(this.#state.stop.values()).some(stop => stop.attributes?.name === resource.attributes?.name)) {
            return;
        }
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

    remove({ type, id }: ResourceIdentifier) {
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
            const result = [];
            for (const resource of Array.isArray(resources) ? resources : [resources]) {
                try {
                    result.push(fn(resource, state))
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

    #sendFilterEvents(oldFilter: EventFilter, newFilter: EventFilter, events: { [T in keyof EventPayloadMap]: (payload: EventPayloadMap[T]) => void }) {
        const state = this.#cache.state;
        // conbine types
        const types = new Set<APIResourceType>();
        for (const type of oldFilter.types) {
            types.add(type);
        }
        for (const type of newFilter.types) {
            types.add(type);
        }
        // for each type
        for (const type of types) {
            // get the cache for that type
            const map = state[type];
            if (map) {
                // remove resources that matched old filters but do not match new filters
                for (const resource of map.values()) {
                    const fn = MAPPERS[type] as (resource: ResourceMap[APIResourceType], state: Partial<ResourceCache>) => EventResource<APIResource> | null;
                    const mapped = fn(resource, state);
                    if (mapped && matchesFilters(resource.type, mapped, oldFilter) && !matchesFilters(resource.type, mapped, newFilter)) {
                        events.remove({ type, data: mapped });
                    } else if (mapped && !matchesFilters(resource.type, mapped, oldFilter)) {
                        events.add({ type, data: mapped });
                    }
                }
            }
        }
    }

    attach(ws: WebSocket) {
        let initialized = false;
        const filter: EventFilter = {
            types: new Set(),
            routeIds: null,
            routeTypes: null,
            stopIds: new Set()
        };
        function forward<T extends EventType>(event: T, { type, data }: PayloadMap[T]) {
            ws.send(JSON.stringify({ event, type, data }));
        }
        function reset({ type, data }: EventPayloadMap['reset']) {
            data = data.filter(resource => matchesFilters(type, resource, filter));
            if (data.length > 0) {
                forward('reset', { type, data: data.map(er => er.resource) });
            }
        }
        function add({ type, data }: EventPayloadMap['add']) {
            if (matchesFilters(type, data, filter)) {
                forward('add', { type, data: data.resource });
            }
        }
        function update({ type, data }: EventPayloadMap['update']) {
            if (matchesFilters(type, data, filter)) {
                forward('update', { type, data: data.resource });
            }
        }
        function remove({ type, data }: EventPayloadMap['remove']) {
            forward('remove', { type, data: { id: data.resource.id } });
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
            const oldFilter = {} as EventFilter;
            Object.assign(oldFilter, filter);
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
                    this.#sendFilterEvents(oldFilter, filter, { reset, add, update, remove });
                } else {
                    // sent initial reset events to sync data
                    for (const type of filter.types) {
                        reset({ type, data: this.#cache.getEventResources(type) });
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
        const routesfn = this.client.getRoutes.bind(this.client, { 'filter[id]': routeIdFilter, include: 'route_patterns.representative_trip.shape,route_patterns.representative_trip.stops' });
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
