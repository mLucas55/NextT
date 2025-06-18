import { EventSource } from "eventsource";
type ResourceType = 'alert' | 'facility' | 'line' | 'live_facility' | 'occupancy' | 'prediction' | 'route' | 'route_pattern' | 'schedule' | 'service' | 'shape' | 'stop' | 'trip' | 'vehicle';
interface IDocument {
    jsonapi?: Record<string, any>;
    links?: Partial<Links<'self' | 'related' | 'describedby' | 'first' | 'last' | 'prev' | 'next'>>;
    /**
     * Included resources
     */
    included?: Resource[];
    meta?: Meta;
}
interface DataDocument extends IDocument {
    data: Resource | Resource[];
}
interface ErrorDocument extends IDocument {
    errors: any[];
}
interface MetaDocument extends IDocument {
    meta: Meta;
}
type Document = DataDocument | ErrorDocument | MetaDocument;
type Meta = Record<string, any>;
interface ILink {
    href: string;
    rel?: string;
    describedby?: Link;
    title?: string;
    type?: string;
    hreflang?: string | string[];
    meta?: Meta;

}
type Link = string | ILink | null;
type Links<T extends string = string> = Record<T, Link>;
interface IRelationship<T extends ResourceType = ResourceType> {
    links?: Links;
    data?: ResourceLinkage<T>;
    meta?: Meta;
}
interface LinksRelationship<T extends ResourceType = ResourceType> extends IRelationship<T> {
    links: Links;
}
interface DataRelationship<T extends ResourceType = ResourceType> extends IRelationship<T> {
    data: ResourceLinkage<T>;
}
interface MetaRelationship<T extends ResourceType = ResourceType> extends IRelationship<T> {
    meta: Meta;
}
type Relationship<T extends ResourceType = ResourceType> = IRelationship<T> | LinksRelationship<T> | DataRelationship<T> | MetaRelationship<T>;
type Relationships = Record<string, Relationship>;
interface Resource<T extends ResourceType = ResourceType> {
    /**
     * The JSON-API resource type
     */
    type: T;
    /**
     * The JSON-API resource ID
     */
    id: string;
    attributes?: Record<string, any>;
    relationships?: Relationships;
    links?: Links;
    meta?: Meta;
}
type ResourceIdentifier<T extends ResourceType = ResourceType> = Pick<Resource<T>, 'id' | 'type'>;
type ResourceLinkage<T extends ResourceType = ResourceType> = ResourceIdentifier<T> | ResourceIdentifier<T>[] | null;
type IResourceMap = {
    [P in ResourceType]: Resource<P>;
}
interface ResourceMap extends IResourceMap {
    alert: AlertResource;
    facility: FacilityResource;
    line: LineResource;
    live_facility: LiveFacilityResource;
    occupancy: OccupancyResource;
    prediction: PredictionResource;
    route: RouteResource;
    route_pattern: RoutePatternResource;
    schedule: ScheduleResource;
    service: ServiceResource;
    shape: ShapeResource;
    stop: StopResource;
    trip: TripResource;
    vehicle: VehicleResource;
}
/**
 * A schedule is the arrival drop off (`*\/attributes/drop_off_type`) time (`*\/attributes/arrival_time`) and departure pick up (`*\/attributes/pickup_type`) time (`*\/attributes/departure_time`) to/from a stop (`*\/relationships/stop/data/id`) at a given sequence (`*\/attributes/stop_sequence`) along a trip (`*\/relationships/trip/data/id`) going in a direction (`*\/attributes/direction_id`) on a route (`*\/relationships/route/data/id`) when the trip is following a service (`*\/relationships/service/data/id`) to determine when it is active.
 *
 * See [GTFS `stop_times.txt`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt) for base specification.
 */
interface ScheduleResource extends Resource<'schedule'> {
    relationships?: {
        trip?: {
            links?: {
                /**
                 * Relationship link for trip
                 */
                self?: string;
                /**
                 * Related trip link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related trip resource
                 */
                type: ResourceType;
                /**
                 * Related trip resource id
                 */
                id: string;
            };
        };
        stop?: {
            links?: {
                /**
                 * Relationship link for stop
                 */
                self?: string;
                /**
                 * Related stop link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related stop resource
                 */
                type: ResourceType;
                /**
                 * Related stop resource id
                 */
                id: string;
            };
        };
        route?: {
            links?: {
                /**
                 * Relationship link for route
                 */
                self?: string;
                /**
                 * Related route link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related route resource
                 */
                type: ResourceType;
                /**
                 * Related route resource id
                 */
                id: string;
            };
        };
        prediction?: {
            links?: {
                /**
                 * Relationship link for prediction
                 */
                self?: string;
                /**
                 * Related prediction link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related prediction resource
                 */
                type: ResourceType;
                /**
                 * Related prediction resource id
                 */
                id: string;
            };
        };
    };
    links?: {};
    attributes?: {
        /**
         * | Value   | `*\/attributes/arrival_time` and `*\/attributes/departure_time` |
         * |---------|---------------------------------------------------------------|
         * | `true`  | Exact                                                         |
         * | `false` | Estimates                                                     |
         *
         * See [GTFS `stop_times.txt` `timepoint`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt)
         */
        timepoint?: boolean;
        /**
         * The sequence the `stop_id` is arrived at during the `trip_id`.  The stop sequence is monotonically increasing along the trip, but the `stop_sequence` along the `trip_id` are not necessarily consecutive.  See [GTFS `stop_times.txt` `stop_sequence`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt)
         */
        stop_sequence?: number;
        /**
         * Text identifying destination of the trip, overriding trip-level headsign if present.See [GTFS `stop_times.txt` `stop_headsign`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt)
         */
        stop_headsign?: string;
        /**
         * How the vehicle departs from `stop_id`.
         *
         * | Value | Description                                   |
         * |-------|-----------------------------------------------|
         * | `0`   | Regularly scheduled pickup                    |
         * | `1`   | No pickup available                           |
         * | `2`   | Must phone agency to arrange pickup           |
         * | `3`   | Must coordinate with driver to arrange pickup |
         *
         * See [GTFS `stop_times.txt` `pickup_type`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt)
         */
        pickup_type?: number;
        /**
         * How the vehicle arrives at `stop_id`.
         *
         * | Value | Description                                   |
         * |-------|-----------------------------------------------|
         * | `0`   | Regularly scheduled drop off                  |
         * | `1`   | No drop off available                         |
         * | `2`   | Must phone agency to arrange pickup           |
         * | `3`   | Must coordinate with driver to arrange pickup |
         *
         * See [GTFS `stop_times.txt` `drop_off_type`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt)
         */
        drop_off_type?: number;
        /**
         * Direction in which trip is traveling: `0` or `1`.
         *
         * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
         */
        direction_id?: number;
        /**
         * Time when the trip departs the given stop. See [GTFS `stop_times.txt` `departure_time`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt)
         * Format is ISO8601.
         */
        departure_time?: string;
        /**
         * Time when the trip arrives at the given stop. See [GTFS `stop_times.txt` `arrival_time`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt)
         * Format is ISO8601.
         */
        arrival_time?: string;
    };
}
/**
 * Representation of the journey of a particular vehicle through a given set of stops. See [GTFS `trips.txt`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt)
 */
interface TripResource extends Resource<'trip'> {
    relationships?: {
        shape?: {
            links?: {
                /**
                 * Relationship link for shape
                 */
                self?: string;
                /**
                 * Related shape link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related shape resource
                 */
                type: ResourceType;
                /**
                 * Related shape resource id
                 */
                id: string;
            };
        };
        service?: {
            links?: {
                /**
                 * Relationship link for service
                 */
                self?: string;
                /**
                 * Related service link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related service resource
                 */
                type: ResourceType;
                /**
                 * Related service resource id
                 */
                id: string;
            };
        };
        route_pattern?: {
            links?: {
                /**
                 * Relationship link for route_pattern
                 */
                self?: string;
                /**
                 * Related route_pattern link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related route_pattern resource
                 */
                type: ResourceType;
                /**
                 * Related route_pattern resource id
                 */
                id: string;
            };
        };
        route?: {
            links?: {
                /**
                 * Relationship link for route
                 */
                self?: string;
                /**
                 * Related route link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related route resource
                 */
                type: ResourceType;
                /**
                 * Related route resource id
                 */
                id: string;
            };
        };
        occupancy?: {
            links?: {
                /**
                 * Relationship link for occupancy
                 */
                self?: string;
                /**
                 * Related occupancy link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related occupancy resource
                 */
                type: ResourceType;
                /**
                 * Related occupancy resource id
                 */
                id: string;
            };
        };
        /**
         * **NOTE**: This relationship is omitted from the offical MBTA API spec. This is likely an error as it can be included in the response.
         */
        stops?: {
            links?: {
                /**
                 * Relationship link for stops
                 */
                self?: string;
                /**
                 * Related stops link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related stops resource
                 */
                type: ResourceType;
                /**
                 * Related stops resource id
                 */
                id: string;
            }[];
        };
    };
    links?: {};
    attributes?: {
        /**
         * Indicator of wheelchair accessibility: `0`, `1`, `2`
         *
         * Wheelchair accessibility (`*\/attributes/wheelchair_accessible`) [as defined in GTFS](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt):
         *
         * | Value | Meaning                                            |
         * |-------|----------------------------------------------------|
         * | `0`   | No information                                     |
         * | `1`   | Accessible (at stops allowing wheelchair_boarding) |
         * | `2`   | Inaccessible                                       |
         */
        wheelchair_accessible?: number;
        /**
         * | Value           | Description |
         * |-----------------|-------------|
         * | `"REVENUE"`     | Indicates that the associated trip is accepting passengers. |
         * | `"NON_REVENUE"` | Indicates that the associated trip is not accepting passengers. |
         */
        revenue_status?: string;
        /**
         * The text that appears in schedules and sign boards to identify the trip to passengers, for example, to identify train numbers for commuter rail trips. See [GTFS `trips.txt` `trip_short_name`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt)
         */
        name?: string;
        /**
         * The text that appears on a sign that identifies the trip's destination to passengers. See [GTFS `trips.txt` `trip_headsign`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt).
         */
        headsign?: string;
        /**
         * Direction in which trip is traveling: `0` or `1`.
         *
         * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
         */
        direction_id?: number;
        /**
         * ID used to group sequential trips with the same vehicle for a given service_id. See [GTFS `trips.txt` `block_id`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt)
         */
        block_id?: string;
        /**
         * Indicator of whether or not bikes are allowed on this trip: `0`, `1`, `2`
         *
         * Bikes allowed (`*\/attributes/bikes_allowed`) [as defined in GTFS](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt):
         *
         * | Value | Meaning                                                                         |
         * |-------|---------------------------------------------------------------------------------|
         * | `0`   | No information                                                                  |
         * | `1`   | Vehicle being used on this particular trip can accommodate at least one bicycle |
         * | `2`   | No bicycles are allowed on this trip                                            |
         */
        bikes_allowed?: number;
    };
}
/**
 * A JSON-API document with a single {@link FacilityResource} resource
 */
interface Facility extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: FacilityResource;
}
/**
 * A JSON-API document with a single {@link StopResource} resource
 */
interface Stop extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: StopResource;
}
/**
 * A page of {@link FacilityResource} results
 */
interface Facilities extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link FacilityResource} objects
     */
    data: FacilityResource[];
}
/**
 * Sequence of geographic points representing a path vehicles will travel on a trip. See [GTFS `shapes.txt`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#shapestxt).
 */
interface ShapeResource extends Resource<'shape'> {
    relationships?: {};
    links?: {};
    attributes?: {
        /**
         * The sequence of points in [Encoded Polyline Algorithm Format](https://developers.google.com/maps/documentation/utilities/polylinealgorithm).
         * Libraries for decoding polylines are available in many languages, for example:
         *
         * * [Elixir](https://hex.pm/packages/polyline)
         * * [JavaScript](https://www.npmjs.com/package/polyline)
         * * [Python](https://pypi.org/project/polyline/)
         */
        polyline?: string;
    };
}
enum RouteType {
    LIGHT_RAIL = 0,
    HEAVY_RAIL = 1,
    COMMUTER_RAIL = 2,
    BUS = 3,
    FERRY = 4
}
/**
 * Path a vehicle travels during service. See [GTFS `routes.txt`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt) for the base specification.
 */
interface RouteResource extends Resource<'route'> {
    relationships?: {
        route_patterns?: {
            links?: {
                /**
                 * Relationship link for route_patterns
                 */
                self?: string;
                /**
                 * Related route_patterns link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related route_patterns resource
                 */
                type: ResourceType;
                /**
                 * Related route_patterns resource id
                 */
                id: string;
            }[];
        };
        line?: {
            links?: {
                /**
                 * Relationship link for line
                 */
                self?: string;
                /**
                 * Related line link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related line resource
                 */
                type: ResourceType;
                /**
                 * Related line resource id
                 */
                id: string;
            };
        };
        agency?: {
            links?: {
                /**
                 * Relationship link for agency
                 */
                self?: string;
                /**
                 * Related agency link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related agency resource
                 */
                type: ResourceType;
                /**
                 * Related agency resource id
                 */
                id: string;
            };
        };
    };
    links?: {};
    attributes?: {
        /**
         * | Value | Name          | Example    |
         * |-------|---------------|------------|
         * | `0`   | Light Rail    | Green Line |
         * | `1`   | Heavy Rail    | Red Line   |
         * | `2`   | Commuter Rail |            |
         * | `3`   | Bus           |            |
         * | `4`   | Ferry         |            |
         */
        type?: RouteType;
        /**
         * A legible color to use for text drawn against a background of the route's `color` attribute. See [GTFS `routes.txt` `route_text_color`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt).
         */
        text_color?: string;
        /**
         * Routes sort in ascending order
         */
        sort_order?: number;
        /**
         * This will often be a short, abstract identifier like "32", "100X", or "Green" that riders use to identify a route, but which doesn't give any indication of what places the route serves. See [GTFS `routes.txt` `route_short_name`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt).
         */
        short_name?: string;
        /**
         * The full name of a route. This name is generally more descriptive than the `short_name` and will often include the route's destination or stop. See [GTFS `routes.txt` `route_long_name`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt).
         */
        long_name?: string;
        /**
         * Specifies the fare type of the route, which can differ from the service category.
         */
        fare_class?: string;
        direction_names?: string[];
        direction_destinations?: string[];
        /**
         * Details about stops, schedule, and/or service.  See
         * [GTFS `routes.txt` `route_desc`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt).
         */
        description?: string;
        /**
         * A color that corresponds to the route, such as the line color on a map." See [GTFS `routes.txt` `route_color`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt).
         */
        color?: string;
    };
}
/**
 * A page of {@link RoutePatternResource} results
 */
interface RoutePatterns extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link RoutePatternResource} objects
     */
    data: RoutePatternResource[];
}
/**
 * A page of {@link VehicleResource} results
 */
interface Vehicles extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link VehicleResource} objects
     */
    data: VehicleResource[];
}
/**
 * Amenities at a station stop (`*\/relationships/stop`) such as elevators, escalators, parking lots, and bike storage.
 *
 * An [MBTA extension](https://groups.google.com/forum/#!topic/gtfs-changes/EzC5m9k45pA).  This spec is not yet finalized.
 *
 * ## Accessibility
 *
 * Riders with limited mobility can search any facility, either `ELEVATOR` or `ESCALATOR`, while riders that need wheelchair access can search for `ELEVATOR` only.
 *
 * The lack of an `ELEVATOR` MAY NOT make a stop wheelchair inaccessible.  Riders should check `/stops/{id}` `/data/attributes/wheelchair_boarding` is `1` to guarantee a path is available from the station entrance to the stop or `0` if it MAY be accessible.  Completely avoid `2` as that is guaranteed to be INACCESSIBLE.
 */
interface FacilityResource extends Resource<'facility'> {
    relationships?: {
        stop?: {
            links?: {
                /**
                 * Relationship link for stop
                 */
                self?: string;
                /**
                 * Related stop link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related stop resource
                 */
                type: ResourceType;
                /**
                 * Related stop resource id
                 */
                id: string;
            };
        };
    };
    links?: {};
    attributes?: {
        /**
         * The type of the facility.
         */
        type?: string;
        /**
         * Short name of the facility
         */
        short_name?: string;
        /**
         * A list of name/value pairs that apply to the facility. See [MBTA's facility documentation](https://www.mbta.com/developers/gtfs/f#facilities_properties_definitions) for more information on the possible names and values.
         */
        properties?: FacilityProperty[];
        /**
         * Longitude of the facility. Degrees East, in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#Longitudes_on_WGS.C2.A084) coordinate system. See
         * [GTFS `facilities.txt` `facility_lon`]
         */
        longitude?: number;
        /**
         * Name of the facility
         */
        long_name?: string;
        /**
         * Latitude of the facility.  Degrees North, in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#A_new_World_Geodetic_System:_WGS.C2.A084) coordinate system. See [GTFS `facilities.txt` `facility_lat`]
         */
        latitude?: number;
    };
}
/**
 * An effect (enumerated in `*\/attributes/effect` and human-readable in `*\/attributes/service_effect`) on a provided service (facility, route, route type, stop and/or trip in `/*\/attributes/informed_entity`) described by a banner (`*\/attributes/banner`), short header (`*\/attributes/short_header`), header `*\/attributes/header`, description (`*\/attributes/description`), image (`*\/attributes/image`), and image alternative text (`*\/attributes/image_alternative_text`) that is active for one or more periods(`*\/attributes/active_period`) caused by a cause (`*\/attribute/cause`) that somewhere in its lifecycle (enumerated in `*\/attributes/lifecycle` and human-readable in `*\/attributes/timeframe`).
 *
 * See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-alert)
 *
 * ## Descriptions
 *
 * There are 7 descriptive attributes.
 *
 * | JSON pointer                                | Usage                                                            |
 * |---------------------------------------------|------------------------------------------------------------------|
 * | `*\/attributes/banner`                      | Display as alert across application/website                      |
 * | `*\/attributes/short_header`                | When `*\/attributes/header` is too long to display               |
 * | `*\/attributes/header`                      | Used before showing and prepended to `*\/attributes/description` |
 * | `*\/attributes/description`                 | Used when user asks to expand alert.                             |
 * | `*\/attributes/image`                       | URL to descriptive image.                                        |
 * | `*\/attributes/image_alternative_text`      | Text that describes image linked in url                          |
 *
 * ## Effect
 *
 * | JSON pointer                                  |                |
 * |-----------------------------------------------|----------------|
 * | `*\/attributes/effect`                        | Enumerated     |
 * | `*\/attributes/service_effect`                | Human-readable |
 *
 * ## Timeline
 *
 * There are 3 timeline related attributes
 *
 * | JSON pointer                                 | Description                                                               |
 * |----------------------------------------------|---------------------------------------------------------------------------|
 * | `*\/attributes/active_period`                | Exact Date/Time ranges alert is active                                    |
 * | `*\/attributes/lifecycle`                    | Enumerated, machine-readable description of `*\/attributes/active_period` |
 * | `*\/attributes/timeframe`                    | Human-readable description of `*\/attributes/active_period`               |
 */
interface AlertResource extends Resource<'alert'> {
    relationships?: {
        facility?: {
            links?: {
                /**
                 * Relationship link for facility
                 */
                self?: string;
                /**
                 * Related facility link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related facility resource
                 */
                type: ResourceType;
                /**
                 * Related facility resource id
                 */
                id: string;
            };
        };
    };
    links?: {};
    attributes?: {
        /**
         * A URL for extra details, such as outline construction or maintenance plans.
         */
        url?: string;
        /**
         * Date/Time alert last updated. Format is ISO8601.
         */
        updated_at?: string;
        /**
         * Summarizes when an alert is in effect.
         */
        timeframe?: string;
        /**
         * A shortened version of `*\/attributes/header`.
         */
        short_header?: string;
        /**
         * How severe the alert is from least (`0`) to most (`10`) severe.
         */
        severity?: number;
        /**
         * Summarizes the service and the impact to that service.
         */
        service_effect?: string;
        /**
         * Identifies whether alert is a new or old, in effect or upcoming.
         *
         * | Value                |
         * |----------------------|
         * | `"NEW"`              |
         * | `"ONGOING"`          |
         * | `"ONGOING_UPCOMING"` |
         * | `"UPCOMING"`         |
         */
        lifecycle?: string;
        /**
         * Entities affected by this alert.
         */
        informed_entity?: InformedEntity[];
        /**
         * Text describing the appearance of the linked image in the image field.
         */
        image_alternative_text?: string;
        /**
         * URL of an image to be displayed alongside alert.
         */
        image?: string;
        /**
         * This plain-text string will be highlighted, for example in boldface. See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert` `header_text`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-alert)
         */
        header?: string;
        /**
         * Name of the alert
         */
        effect_name?: string;
        /**
         * The effect of this problem on the affected entity.
         *
         * | Value                  |
         * |------------------------|
         * | `"ACCESS_ISSUE"`       |
         * | `"ADDITIONAL_SERVICE"` |
         * | `"AMBER_ALERT"`        |
         * | `"BIKE_ISSUE"`         |
         * | `"CANCELLATION"`       |
         * | `"DELAY"`              |
         * | `"DETOUR"`             |
         * | `"DOCK_CLOSURE"`       |
         * | `"DOCK_ISSUE"`         |
         * | `"ELEVATOR_CLOSURE"`   |
         * | `"ESCALATOR_CLOSURE"`  |
         * | `"EXTRA_SERVICE"`      |
         * | `"FACILITY_ISSUE"`     |
         * | `"MODIFIED_SERVICE"`   |
         * | `"NO_SERVICE"`         |
         * | `"OTHER_EFFECT"`       |
         * | `"PARKING_CLOSURE"`    |
         * | `"PARKING_ISSUE"`      |
         * | `"POLICY_CHANGE"`      |
         * | `"SCHEDULE_CHANGE"`    |
         * | `"SERVICE_CHANGE"`     |
         * | `"SHUTTLE"`            |
         * | `"SNOW_ROUTE"`         |
         * | `"STATION_CLOSURE"`    |
         * | `"STATION_ISSUE"`      |
         * | `"STOP_CLOSURE"`       |
         * | `"STOP_MOVE"`          |
         * | `"STOP_MOVED"`         |
         * | `"SUMMARY"`            |
         * | `"SUSPENSION"`         |
         * | `"TRACK_CHANGE"`       |
         * | `"UNKNOWN_EFFECT"`     |
         *
         * See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert` `effect`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-alert)
         */
        effect?: string;
        /**
         * | Value         |
         * |---------------|
         * | `"UNKNOWN"`   |
         * | `"KNOWN"`     |
         * | `"ESTIMATED"` |
         * Indicates whether an alert has a KNOWN, ESTIMATED, or UNKNOWN duration. KNOWN duration_certainty alerts are expected to end at the specified end time, ESTIMATED duration_certainty alerts have an estimated end time, and UNKNOWN duration_certainty alerts do not have a known or estimated end time.
         */
        duration_certainty?: string;
        /**
         * This plain-text string will be formatted as the body of the alert (or shown on an explicit "expand" request by the user). The information in the description should add to the information of the header. See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert` `description_text`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-alert)
         */
        description?: string;
        /**
         * Date/Time alert created. Format is ISO8601.
         */
        created_at?: string;
        /**
         * What is causing the alert.
         *
         * | Value                          |
         * |--------------------------------|
         * | `"ACCIDENT"`                   |
         * | `"AMTRAK_TRAIN_TRAFFIC"`       |
         * | `"COAST_GUARD_RESTRICTION"`    |
         * | `"CONSTRUCTION"`               |
         * | `"CROSSING_ISSUE"`             |
         * | `"DEMONSTRATION"`              |
         * | `"DISABLED_BUS"`               |
         * | `"DISABLED_TRAIN"`             |
         * | `"DRAWBRIDGE_BEING_RAISED"`    |
         * | `"ELECTRICAL_WORK"`            |
         * | `"FIRE"`                       |
         * | `"FIRE_DEPARTMENT_ACTIVITY"`   |
         * | `"FLOODING"`                   |
         * | `"FOG"`                        |
         * | `"FREIGHT_TRAIN_INTERFERENCE"` |
         * | `"HAZMAT_CONDITION"`           |
         * | `"HEAVY_RIDERSHIP"`            |
         * | `"HIGH_WINDS"`                 |
         * | `"HOLIDAY"`                    |
         * | `"HURRICANE"`                  |
         * | `"ICE_IN_HARBOR"`              |
         * | `"MAINTENANCE"`                |
         * | `"MECHANICAL_ISSUE"`           |
         * | `"MECHANICAL_PROBLEM"`         |
         * | `"MEDICAL_EMERGENCY"`          |
         * | `"PARADE"`                     |
         * | `"POLICE_ACTION"`              |
         * | `"POLICE_ACTIVITY"`            |
         * | `"POWER_PROBLEM"`              |
         * | `"RAIL_DEFECT"`                |
         * | `"SEVERE_WEATHER"`             |
         * | `"SIGNAL_ISSUE"`               |
         * | `"SIGNAL_PROBLEM"`             |
         * | `"SINGLE_TRACKING"`            |
         * | `"SLIPPERY_RAIL"`              |
         * | `"SNOW"`                       |
         * | `"SPECIAL_EVENT"`              |
         * | `"SPEED_RESTRICTION"`          |
         * | `"SWITCH_ISSUE"`               |
         * | `"SWITCH_PROBLEM"`             |
         * | `"TIE_REPLACEMENT"`            |
         * | `"TRACK_PROBLEM"`              |
         * | `"TRACK_WORK"`                 |
         * | `"TRAFFIC"`                    |
         * | `"TRAIN_TRAFFIC"`              |
         * | `"UNRULY_PASSENGER"`           |
         * | `"WEATHER"`                    |
         *
         * See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert` `Cause`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-cause)
         */
        cause?: string;
        /**
         * Set if alert is meant to be displayed prominently, such as the top of every page.
         */
        banner?: string;
        /**
         * Date/Time ranges when alert is active. See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert` `active_period`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-alert).
         */
        active_period?: ActivePeriod[];
    };
}
/**
 * A page of {@link LineResource} results
 */
interface Lines extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link LineResource} objects
     */
    data: LineResource[];
}
/**
 * A JSON-API error document when the server cannot or will not process the request due to something that is perceived to be a client error.
 */
interface BadRequest extends ErrorDocument {
    errors: {
        /**
         * A short, human-readable summary of the problem
         */
        detail?: string;
        /**
         * A JSON-API error source
         */
        source?: {
            /**
             * The name of parameter that caused the error
             */
            parameter?: string;
        };
        /**
         * The HTTP status code applicable to the problem
         */
        status?: string;
        /**
         * An application-specific error code
         */
        code?: string;
    }[];
}
/**
 * An entity affected by an alert. At least one of the fields other than `activities` will be non-null. The affected entity is the intersection of these fields, not the union: if `stop` and `route` both have values, the alert does not affect the entire route.
 *
 * See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert` `EntitySelector`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-entityselector).
 *
 * * `activities` - The activities affected.
 * * `direction_id` - The direction of the affected `trip`. See     [GTFS `trips.txt` `direction_id`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt).
 * * `facility` - The facility affected.
 * * `route` - The route affected. See     [GTFS `routes.txt` `route_id`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt)
 * * `route_type` - The type of route affected. If present alone, indicates the entire mode of transit is affected. See     [GTFS `routes.txt` `route_type`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt)
 * * `stop` - The stop affected. See     [GTFS `stops.txt` `stop_id`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt)
 * * `trip` - The trip affected. See     [GTFS `trips.txt` `trip_id`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt)
 */
interface InformedEntity {
    /**
     * `id` of the affected Trip.
     */
    trip?: string;
    /**
     * `id` of the affected Stop.
     */
    stop?: string;
    /**
     * `type` of the affected Route.
     *
     * | Value | Name          | Example    |
     * |-------|---------------|------------|
     * | `0`   | Light Rail    | Green Line |
     * | `1`   | Heavy Rail    | Red Line   |
     * | `2`   | Commuter Rail |            |
     * | `3`   | Bus           |            |
     * | `4`   | Ferry         |            |
     */
    route_type?: RouteType;
    /**
     * `id` of the affected Route.
     */
    route?: string;
    /**
     * `id` of the affected Facility.
     */
    facility?: string;
    /**
     * `direction_id` of the affected Trip.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     */
    direction_id?: number;
    /**
     * Activities affected by this alert.
     *
     * If an entity is a station platform, and the alert only impacts those boarding at that platform and no one else, and the activity `"BOARD"` represents customers boarding at the informed entity, then the entity includes `activities` `["BOARD"]`. If the alert affected customers exiting at the platform too, then `activities` is `["BOARD", "EXIT"]`.
     *
     * It should be noted that the `activities` array includes activities that are specifically affected. Thus if there were activities `"BOARD"`, `"EXIT"`, and `"USING_WHEELCHAIR"` [to board or exit], and a station were closed, then the `activities` array would include `"BOARD"` and `"EXIT"` but it would not be necessary to include the activity `"USING_WHEELCHAIR"`. Any rider entering the station who is `"USING_WHEELCHAIR"` is also a rider who `"BOARD"`s. Using a wheelchair to board is not specifically affected.
     */
    activities?: Activity[];
}
/**
 * The predicted arrival time (`/*\/attributes/arrival_time`) and departure time (`*\/attributes/departure_time`) to/from a stop (`*\/relationships/stop/data/id`) at a given sequence (`*\/attriutes/stop_sequence`) along a trip (`*\/relationships/trip/data/id`) going a direction (`*\/attributes/direction_id`) along a route (`*\/relationships/route/data/id`).
 *
 * See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `TripDescriptor`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-tripdescriptor)
 * See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `StopTimeUpdate`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-stoptimeupdate)
 */
interface PredictionResource extends Resource<'prediction'> {
    relationships?: {
        vehicle?: {
            links?: {
                /**
                 * Relationship link for vehicle
                 */
                self?: string;
                /**
                 * Related vehicle link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related vehicle resource
                 */
                type: ResourceType;
                /**
                 * Related vehicle resource id
                 */
                id: string;
            };
        };
        trip?: {
            links?: {
                /**
                 * Relationship link for trip
                 */
                self?: string;
                /**
                 * Related trip link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related trip resource
                 */
                type: ResourceType;
                /**
                 * Related trip resource id
                 */
                id: string;
            };
        };
        stop?: {
            links?: {
                /**
                 * Relationship link for stop
                 */
                self?: string;
                /**
                 * Related stop link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related stop resource
                 */
                type: ResourceType;
                /**
                 * Related stop resource id
                 */
                id: string;
            };
        };
        schedule?: {
            links?: {
                /**
                 * Relationship link for schedule
                 */
                self?: string;
                /**
                 * Related schedule link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related schedule resource
                 */
                type: ResourceType;
                /**
                 * Related schedule resource id
                 */
                id: string;
            };
        };
        route?: {
            links?: {
                /**
                 * Relationship link for route
                 */
                self?: string;
                /**
                 * Related route link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related route resource
                 */
                type: ResourceType;
                /**
                 * Related route resource id
                 */
                id: string;
            };
        };
        alerts?: {
            links?: {
                /**
                 * Relationship link for alerts
                 */
                self?: string;
                /**
                 * Related alerts link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related alerts resource
                 */
                type: ResourceType;
                /**
                 * Related alerts resource id
                 */
                id: string;
            }[];
        };
    };
    links?: {};
    attributes?: {
        /**
         * | Value            | Description |
         * |------------------|-------------|
         * | `"MID_TRIP"`     | Prediction is for the trip the vehicle is currently on. |
         * | `"AT_TERMINAL"`  | Prediction is for a terminal trip that hasn't started yet. |
         * | `"REVERSE_TRIP"` | Prediction is for a trip that hasn't started and the train that will be servicing this trip is currently in the middle of a previous trip. |
         */
        update_type?: string;
        /**
         * The sequence the stop (`*\/relationships/stop/data/id`) is arrived at during the trip (`*\/relationships/trip/data/id`).  The stop sequence is monotonically increasing along the trip, but the `stop_sequence` along the trip are not necessarily consecutive.
         *
         * See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `stop_sequence`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-stoptimeupdate).
         */
        stop_sequence?: number;
        /**
         * Status of the schedule
         */
        status?: string;
        /**
         * How the predicted stop relates to the `Model.Schedule.t` stops.
         *
         * | Value           | Description |
         * |-----------------|-------------|
         * | `"ADDED"`       | An extra trip that was added in addition to a running schedule, for example, to replace a broken vehicle or to respond to sudden passenger load. See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `TripDescriptor` `ScheduleRelationship` `ADDED`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship-1) |
         * | `"CANCELLED"`   | A trip that existed in the schedule but was removed. See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `TripDescriptor` `ScheduleRelationship` `CANCELED`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship-1) |
         * | `"NO_DATA"`     | No data is given for this stop. It indicates that there is no realtime information available. See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `ScheduleRelationship` `NO_DATA`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship) |
         * | `"SKIPPED"`     | The stop was originally scheduled, but was skipped. See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `ScheduleRelationship`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship) |
         * | `"UNSCHEDULED"` | A trip that is running with no schedule associated to it. See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `TripDescriptor` `ScheduleRelationship` `UNSCHEDULED`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship-1) |
         * | `null`          | Stop was scheduled.  See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `TripDescriptor` `ScheduleRelationship` `SCHEDULED`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship-1) |
         *
         * See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `TripDescriptor` `ScheduleRelationship`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship-1)
         * See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `ScheduleRelationship`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-schedulerelationship)
         */
        schedule_relationship?: string;
        /**
         * | Value           | Description |
         * |-----------------|-------------|
         * | `"REVENUE"`     | Indicates that the associated trip is accepting passengers. |
         * | `"NON_REVENUE"` | Indicates that the associated trip is not accepting passengers. |
         */
        revenue_status?: string;
        /**
         * Direction in which trip is traveling: `0` or `1`.
         *
         * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
         */
        direction_id?: number;
        /**
         * Uncertainty value for the departure time prediction.
         *
         * Bus and Commuter Rail
         * See [entities tripUpdate stop_time_updates departure uncertainty](https://swiftly-inc.stoplight.io/docs/realtime-standalone/613d1d7f1eae3-gtfs-rt-trip-updates)
         *
         * | Value            | Description |
         * |------------------|-------------|
         * | < 300 or omitted |	Valid real-time prediction |
         * | 300              | Real-time prediction not available. This code is primarily used when a vehicle has not yet been assigned to the trip, (i.e. because the block has not started yet). It is a schedule-based prediction, but Swiftly adjusts the schedule-based prediction time using observed historical travel times to make predictions more accurate than the schedule |
         * | 301              |	Valid real-time prediction, though the bus appears to be stalled or significantly delayed and predictions are not as accurate |
         * | > 301            |	Likely invalid prediction, recommend not showing anything (and not showing scheduled time), very rare situation |
         *
         * Subway/Light Rail
         * See [GTFS `Realtime` `FeedMessage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `departure`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-stoptimeupdate).
         *
         * | Value | Description |
         * |-------|-------------|
         * | 60    | A trip that has already started |
         * | 120   | A terminal/reverse trip departure for a trip that has NOT started and a train is awaiting departure at the origin |
         * | 360   | A terminal/reverse trip for a trip that has NOT started and a train is completing a previous trip |
         */
        departureUncertainty?: number | null;
        /**
         * When the vehicle is now predicted to depart.  `null` if the last stop (`*\/relationships/stop/data/id`) on the trip (`*\/relationships/trip/data/id`). See [GTFS `Realtime` `FeedMessage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `departure`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-stoptimeupdate).
         * Format is ISO8601.
         */
        departure_time?: string;
        /**
         * Uncertainty value for the arrival time prediction.
         *
         * Bus and Commuter Rail
         * See [entities tripUpdate stop_time_updates arrival uncertainty](https://swiftly-inc.stoplight.io/docs/realtime-standalone/613d1d7f1eae3-gtfs-rt-trip-updates)
         *
         * | Value            | Description |
         * |------------------|-------------|
         * | < 300 or omitted |	Valid real-time prediction |
         * | 300              |  Real-time prediction not available. This code is primarily used when a vehicle has not yet been assigned to the trip, (i.e. because the block has not started yet). It is a schedule-based prediction, but Swiftly adjusts the schedule-based prediction time using observed historical travel times to make predictions more accurate than the schedule |
         * | 301              |	Valid real-time prediction, though the bus appears to be stalled or significantly delayed and predictions are not as accurate |
         * | > 301            |	Likely invalid prediction, recommend not showing anything (and not showing scheduled time), very rare situation |
         *
         *
         * Subway/Light Rail
         * See [GTFS `Realtime` `FeedMessage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `arrival`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-stoptimeupdate).
         *
         * | Value  | Description |
         * |--------|-------------|
         * | 60   | A trip that has already started |
         * | 120  | A terminal/reverse trip departure for a trip that has NOT started and a train is awaiting departure at the origin |
         * | 360  | A terminal/reverse trip for a trip that has NOT started and a train is completing a previous trip |
         */
        arrivalUncertainty?: number | null;
        /**
         * When the vehicle is now predicted to arrive.  `null` if the first stop (`*\/relationships/stop/data/id`) on the trip (`*\/relationships/trip/data/id`). See [GTFS `Realtime` `FeedMessage` `FeedEntity` `TripUpdate` `StopTimeUpdate` `arrival`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-stoptimeupdate).
         * Format is ISO8601.
         */
        arrival_time?: string;
    };
}
/**
 * Physical location where transit can pick-up or drop-off passengers. See https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt for more details and https://github.com/mbta/gtfs-documentation/blob/master/reference/gtfs.md#stopstxt for specific extensions.
 */
interface StopResource extends Resource<'stop'> {
    relationships?: {
        parent_station?: {
            links?: {
                /**
                 * Relationship link for parent_station
                 */
                self?: string;
                /**
                 * Related parent_station link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related parent_station resource
                 */
                type: ResourceType;
                /**
                 * Related parent_station resource id
                 */
                id: string;
            };
        };
    };
    links?: {};
    attributes?: {
        /**
         * Whether there are any vehicles with wheelchair boarding or paths to stops that are wheelchair acessible: 0, 1, 2.
         *
         * Wheelchair boarding (`*\/attributes/wheelchair_boarding`) corresponds to [GTFS wheelchair_boarding](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt). The MBTA handles parent station inheritance itself, so value can be treated simply:
         *
         * | Value | Meaning                                       |
         * |-------|-----------------------------------------------|
         * | `0`   | No Information                                |
         * | `1`   | Accessible (if trip is wheelchair accessible) |
         * | `2`   | Inaccessible                                  |
         */
        wheelchair_boarding?: number;
        /**
         * The type of transportation used at the stop. `vehicle_type` will be a valid routes.txt `route_type` value:
         *
         * | Value | Name          | Example    |
         * |-------|---------------|------------|
         * | `0`   | Light Rail    | Green Line |
         * | `1`   | Heavy Rail    | Red Line   |
         * | `2`   | Commuter Rail |            |
         * | `3`   | Bus           |            |
         * | `4`   | Ferry         |            |
         */
        vehicle_type?: number;
        /**
         * A textual description of the platform or track. See [MBTA extensions to GTFS](https://docs.google.com/document/d/1RoQQj3_-7FkUlzFP4RcK1GzqyHp4An2lTFtcmW0wrqw/view).
         */
        platform_name?: string;
        /**
         * A short code representing the platform/track (like a number or letter). See [GTFS `stops.txt` `platform_code`](https://developers.google.com/transit/gtfs/reference/gtfs-extensions#stopstxt_1).
         */
        platform_code?: string;
        /**
         * The street on which the stop is located.
         */
        on_street?: string;
        /**
         * Name of a stop or station in the local and tourist vernacular.  See [GTFS `stops.txt` `stop_name](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt)
         */
        name?: string;
        /**
         * The municipality in which the stop is located.
         */
        municipality?: string;
        /**
         * Longitude of the stop or station. Degrees East, in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#Longitudes_on_WGS.C2.A084) coordinate system. See
         * [GTFS `stops.txt` `stop_lon`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt).
         */
        longitude?: number;
        /**
         * The type of the stop.
         *
         * | Value | Type | Description |
         * | - | - | - |
         * | `0` | Stop | A location where passengers board or disembark from a transit vehicle. |
         * | `1` | Station | A physical structure or area that contains one or more stops. |
         * | `2` | Station Entrance/Exit | A location where passengers can enter or exit a station from the street. The stop entry must also specify a parent_station value referencing the stop ID of the parent station for the entrance. |
         * | `3` | Generic Node | A location within a station, not matching any other location_type, which can be used to link together pathways defined in pathways.txt. |
         *
         * See also [GTFS `stops.txt` `location_type`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt).
         */
        location_type?: number;
        /**
         * Latitude of the stop or station.  Degrees North, in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#A_new_World_Geodetic_System:_WGS.C2.A084) coordinate system. See [GTFS `stops.txt` `stop_lat`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt).
         */
        latitude?: number;
        /**
         * Description of the stop. See [GTFS `stops.txt` `stop_desc`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt).
         */
        description?: string;
        /**
         * The cross street at which the stop is located.
         */
        at_street?: string;
        /**
         * A street address for the station. See [MBTA extensions to GTFS](https://docs.google.com/document/d/1RoQQj3_-7FkUlzFP4RcK1GzqyHp4An2lTFtcmW0wrqw/view).
         */
        address?: string;
    };
}
/**
 * A page of {@link ScheduleResource} results
 */
interface Schedules extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link ScheduleResource} objects
     */
    data: ScheduleResource[];
}
/**
 * Live data about a given facility.
 */
interface LiveFacilityResource extends Resource<'live_facility'> {
    relationships?: {};
    links?: {};
    attributes?: {
        /**
         * Time of last update
         */
        updated_at?: string;
        /**
         * A list of name/value pairs that apply to the facility. See [MBTA's facility documentation](https://www.mbta.com/developers/gtfs/f#facilities_properties_definitions) for more information on the possible names and values.
         */
        properties?: FacilityProperty[];
    };
}
/**
 * A page of {@link StopResource} results
 */
interface Stops extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link StopResource} objects
     */
    data: StopResource[];
}
/**
 * A JSON-API document with a single {@link TripResource} resource
 */
interface Trip extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: TripResource;
}
/**
 * A JSON-API error document when a resource is not found
 */
interface NotFound extends ErrorDocument {
    errors: {
        /**
         * A JSON-API error source
         */
        source?: {
            /**
             * The name of parameter that was used to lookup up the resource that was not found
             */
            parameter?: string;
        };
        /**
         * A short, human-readable summary of the problem
         */
        title?: string;
        /**
         * The HTTP status code applicable to the problem
         */
        status?: string;
        /**
         * An application-specific error code
         */
        code?: string;
    }[];
}
/**
 * A JSON-API document with a single {@link LiveFacilityResource} resource
 */
interface LiveFacility extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: LiveFacilityResource;
}
/**
 * A JSON-API document with a single {@link AlertResource} resource
 */
interface Alert extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: AlertResource;
}
/**
 * A page of {@link AlertResource} results
 */
interface Alerts extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link AlertResource} objects
     */
    data: AlertResource[];
}
/**
 * A page of {@link ServiceResource} results
 */
interface Services {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link ServiceResource} objects
     */
    data: ServiceResource[];
}
/**
 * Name/value pair for additional facility information
 */
interface FacilityProperty {
    /**
     * The value of the property
     */
    value?: string | number;
    /**
     * The name of the property
     */
    name?: string;
}
/**
 * A page of {@link ShapeResource} results
 */
interface Shapes extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link ShapeResource} objects
     */
    data: ShapeResource[];
}
/**
 * An expected or predicted level of occupancy for a given trip.
 */
interface OccupancyResource extends Resource<'occupancy'> {
    relationships?: {};
    links?: {};
    attributes?: {
        /**
         * The degree of passenger occupancy for the vehicle. See [GTFS-realtime OccupancyStatus](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-vehiclestopstatus).
         *
         * | _**Value**_                    | _**Description**_                                                                                   |
         * |--------------------------------|-----------------------------------------------------------------------------------------------------|
         * | **MANY_SEATS_AVAILABLE**       | Not crowded: the vehicle has a large percentage of seats available. |
         * | **FEW_SEATS_AVAILABLE**        | Some crowding: the vehicle has a small percentage of seats available. |
         * | **STANDING_ROOM_ONLY**         | Standing room only: the vehicle can currently accommodate only standing passengers. |
         * | **CRUSHED_STANDING_ROOM_ONLY** | Crushed standing room: the vehicle can currently accommodate only standing passengers and has limited space for them. |
         * | **FULL**                       | Crowded: the vehicle is considered full by most measures, but may still be allowing passengers to board. |
         * | **NOT_ACCEPTING_PASSENGERS**   | Not accepting passengers: the vehicle is not accepting passengers, the vehicle or carriage usually accepts passengers for boarding. |
         * | **NO_DATA_AVAILABLE**          | No data available: the vehicle doesn't have any occupancy data available at that time. |
         */
        status?: string;
        /**
         * Percentage of seats occupied.
         */
        percentage?: number;
    };
}
/**
 * A JSON-API document with a single {@link RouteResource} resource
 */
interface Route extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: RouteResource;
}
/**
 * A JSON-API document with a single {@link ShapeResource} resource
 */
interface Shape extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: ShapeResource;
}
/**
 * Current state of a vehicle on a trip.
 */
interface VehicleResource extends Resource<'vehicle'> {
    relationships?: {
        trip?: {
            links?: {
                /**
                 * Relationship link for trip
                 */
                self?: string;
                /**
                 * Related trip link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related trip resource
                 */
                type: ResourceType;
                /**
                 * Related trip resource id
                 */
                id: string;
            };
        };
        stop?: {
            links?: {
                /**
                 * Relationship link for stop
                 */
                self?: string;
                /**
                 * Related stop link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related stop resource
                 */
                type: ResourceType;
                /**
                 * Related stop resource id
                 */
                id: string;
            };
        };
        route?: {
            links?: {
                /**
                 * Relationship link for route
                 */
                self?: string;
                /**
                 * Related route link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related route resource
                 */
                type: ResourceType;
                /**
                 * Related route resource id
                 */
                id: string;
            };
        };
    };
    links?: {};
    attributes?: {
        /**
         * Time at which vehicle information was last updated. Format is ISO8601.
         */
        updated_at?: string;
        /**
         * Speed that the vehicle is traveling in meters per second. See [GTFS-realtime Position speed](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-position).
         */
        speed?: number;
        /**
         * | Value           | Description |
         * |-----------------|-------------|
         * | `"REVENUE"`     | Indicates that the associated trip is accepting passengers. |
         * | `"NON_REVENUE"` | Indicates that the associated trip is not accepting passengers. |
         */
        revenue_status?: string;
        /**
         * The degree of passenger occupancy for the vehicle. See [GTFS-realtime OccupancyStatus](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-vehiclestopstatus).
         *
         * | _**Value**_                    | _**Description**_                                                                                   |
         * |--------------------------------|-----------------------------------------------------------------------------------------------------|
         * | **MANY_SEATS_AVAILABLE**       | Not crowded: the vehicle has a large percentage of seats available. |
         * | **FEW_SEATS_AVAILABLE**        | Some crowding: the vehicle has a small percentage of seats available. |
         * | **STANDING_ROOM_ONLY**         | Standing room only: the vehicle can currently accommodate only standing passengers. |
         * | **CRUSHED_STANDING_ROOM_ONLY** | Crushed standing room: the vehicle can currently accommodate only standing passengers and has limited space for them. |
         * | **FULL**                       | Crowded: the vehicle is considered full by most measures, but may still be allowing passengers to board. |
         * | **NOT_ACCEPTING_PASSENGERS**   | Not accepting passengers: the vehicle is not accepting passengers, the vehicle or carriage usually accepts passengers for boarding. |
         * | **NO_DATA_AVAILABLE**          | No data available: the vehicle doesn't have any occupancy data available at that time. |
         */
        occupancy_status?: string;
        /**
         * Longitude of the vehicle's current position.  Degrees East, in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#Longitudes_on_WGS.C2.A084) coordinate system. See [GTFS-realtime Position longitude](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-position).
         */
        longitude?: number;
        /**
         * Latitude of the vehicle's current position. Degrees North, in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#A_new_World_Geodetic_System:_WGS.C2.A084) coordinate system. See [GTFS-realtime Position latitude](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-position).
         */
        latitude?: number;
        /**
         * User visible label, such as the one of on the signage on the vehicle.  See [GTFS-realtime VehicleDescriptor label](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-vehicledescriptor).
         */
        label?: string;
        /**
         * Direction in which trip is traveling: `0` or `1`.
         *
         * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
         */
        direction_id?: number;
        /**
         * Index of current stop along trip. See [GTFS-realtime VehiclePosition current_stop_sequence](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-vehicleposition)
         */
        current_stop_sequence?: number;
        /**
         * Status of vehicle relative to the stops. See [GTFS-realtime VehicleStopStatus](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-vehiclestopstatus).
         *
         * | _**Value**_       | _**Description**_                                                                                          |
         * |-------------------|------------------------------------------------------------------------------------------------------------|
         * | **INCOMING_AT**   | The vehicle is just about to arrive at the stop (on a stop display, the vehicle symbol typically flashes). |
         * | **STOPPED_AT**    | The vehicle is standing at the stop.                                                                       |
         * | **IN_TRANSIT_TO** | The vehicle has departed the previous stop and is in transit.                                              |
         */
        current_status?: string;
        /**
         * Carriage-level crowding details. See [GTFS-realtime multi_carriage_details](https://gtfs.org/documentation/realtime/reference/#message-carriagedetails).
         */
        carriages?: {
            /**
             * The degree of passenger occupancy for the vehicle. See [GTFS-realtime OccupancyStatus](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#enum-vehiclestopstatus).
             *
             * | _**Value**_                    | _**Description**_                                                                                   |
             * |--------------------------------|-----------------------------------------------------------------------------------------------------|
             * | **MANY_SEATS_AVAILABLE**       | Not crowded: the vehicle has a large percentage of seats available. |
             * | **FEW_SEATS_AVAILABLE**        | Some crowding: the vehicle has a small percentage of seats available. |
             * | **STANDING_ROOM_ONLY**         | Standing room only: the vehicle can currently accommodate only standing passengers. |
             * | **CRUSHED_STANDING_ROOM_ONLY** | Crushed standing room: the vehicle can currently accommodate only standing passengers and has limited space for them. |
             * | **FULL**                       | Crowded: the vehicle is considered full by most measures, but may still be allowing passengers to board. |
             * | **NOT_ACCEPTING_PASSENGERS**   | Not accepting passengers: the vehicle is not accepting passengers, the vehicle or carriage usually accepts passengers for boarding. |
             * | **NO_DATA_AVAILABLE**          | No data available: the vehicle doesn't have any occupancy data available at that time. |
             */
            occupancy_status?: string;
            /**
             * Percentage of vehicle occupied, calculated via weight average
             */
            occupancy_percentage?: number;
            /**
             * Carriage-specific label, used as an identifier
             */
            label?: string;
        }[];
        /**
         * Bearing, in degrees, clockwise from True North, i.e., 0 is North and 90 is East. This can be the compass bearing, or the direction towards the next stop or intermediate location. See [GTFS-realtime Position bearing](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-position).
         */
        bearing?: number;
    };
}
/**
 * A JSON-API error document when the API key is invalid
 */
interface Forbidden extends ErrorDocument {
    errors: {
        /**
         * The HTTP status code applicable to the problem
         */
        status?: string;
        /**
         * An application-specific error code
         */
        code?: string;
    }[];
}
/**
 * A page of {@link PredictionResource} results
 */
interface Predictions extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link PredictionResource} objects
     */
    data: PredictionResource[];
}
/**
 * Service represents a set of dates on which trips run.
 */
interface ServiceResource extends Resource<'service'> {
    relationships?: {};
    links?: {};
    attributes?: {
        valid_days?: number[];
        /**
         * Earliest date which is valid for this service. Format is ISO8601.
         */
        start_date?: string;
        /**
         * Describes how well this schedule represents typical service for the listed `schedule_type`
         *
         * | Value | Description                                                                 |
         * |-------|-----------------------------------------------------------------------------|
         * | `0`   | Not defined.                                                                |
         * | `1`   | Typical service with perhaps minor modifications                            |
         * | `2`   | Extra service supplements typical schedules                                 |
         * | `3`   | Reduced holiday service is provided by typical Saturday or Sunday schedule  |
         * | `4`   | Major changes in service due to a planned disruption, such as construction  |
         * | `5`   | Major reductions in service for weather events or other atypical situations |
         * | `6`   | Canonical service contains default stopping patterns for selected routes, including temporarily closed stops; not active on any dates |
         */
        schedule_typicality?: number;
        /**
         * Description of the schedule type the service_id can be applied.
         * For example, on a holiday, the schedule_type value may be "Saturday" or "Sunday".
         * Current valid values are "Weekday", "Saturday", "Sunday", or "Other"
         */
        schedule_type?: string;
        /**
         * Description of when the `service_id` is in effect.
         */
        schedule_name?: string;
        removed_dates_notes?: string[];
        removed_dates?: string[];
        /**
         * Earliest date which is a part of the rating (season) which contains this service. Format is ISO8601.
         */
        rating_start_date?: string;
        /**
         * Latest date which is a part of the rating (season) which contains this service. Format is ISO8601.
         */
        rating_end_date?: string;
        /**
         * Human-readable description of the rating (season), as it should appear on public-facing websites and applications.
         */
        rating_description?: string;
        /**
         * Latest date which is valid for this service. Format is ISO8601.
         */
        end_date?: string;
        /**
         * Human-readable description of the service, as it should appear on public-facing websites and applications.
         */
        description?: string;
        added_dates_notes?: string[];
        added_dates?: string[];
    };
}
/**
 * A JSON-API error document when rate limited
 */
interface TooManyRequests extends ErrorDocument {
    errors: {
        /**
         * Human-readable summary of the problem
         */
        detail?: string;
        /**
         * The HTTP status code applicable to the problem
         */
        status?: string;
        /**
         * An application-specific error code
         */
        code?: string;
    }[];
}
/**
 * A page of {@link TripResource} results
 */
interface Trips extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link TripResource} objects
     */
    data: TripResource[];
}
/**
 * A page of {@link RouteResource} results
 */
interface Routes extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link RouteResource} objects
     */
    data: RouteResource[];
}
/**
 * A JSON-API document with a single {@link ServiceResource} resource
 */
interface Service extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: ServiceResource;
}
/**
 * A JSON-API document with a single {@link VehicleResource} resource
 */
interface Vehicle extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: VehicleResource;
}
/**
 * Information about the different variations of service that may be run within a single route_id, including when and how often they are operated.
 * See [GTFS `route_patterns.txt`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#route_patternstxt) for the base specification.
 */
interface RoutePatternResource extends Resource<'route_pattern'> {
    relationships?: {
        route?: {
            links?: {
                /**
                 * Relationship link for route
                 */
                self?: string;
                /**
                 * Related route link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related route resource
                 */
                type: ResourceType;
                /**
                 * Related route resource id
                 */
                id: string;
            };
        };
        representative_trip?: {
            links?: {
                /**
                 * Relationship link for representative_trip
                 */
                self?: string;
                /**
                 * Related representative_trip link
                 */
                related?: string;
            };
            data?: {
                /**
                 * Type of related representative_trip resource
                 */
                type: ResourceType;
                /**
                 * Related representative_trip resource id
                 */
                id: string;
            };
        };
    };
    links?: {};
    attributes?: {
        /**
         * Explains how common the route pattern is. For the MBTA, this is within the context of the entire route. Current valid values are:
         * | Value | Description |
         * |-|-|
         * | `0` | Not defined |
         * | `1` | Typical. Pattern is common for the route. Most routes will have only one such pattern per direction. A few routes may have more than 1, such as the Red Line (with one branch to Ashmont and another to Braintree); routes with more than 2 are rare. |
         * | `2` | Pattern is a deviation from the regular route. |
         * | `3` | Pattern represents a highly atypical pattern for the route, such as a special routing which only runs a handful of times per day. |
         * | `4` | Diversions from normal service, such as planned detours, bus shuttles, or snow routes. |
         * | `5` | Canonical trip patterns. |
         */
        typicality?: number;
        /**
         * User-facing description of when the route pattern operate. Not all route patterns will include a time description
         */
        time_desc?: string;
        /**
         * Can be used to order the route patterns in a way which is ideal for presentation to customers.
         * Route patterns with smaller sort_order values should be displayed before those with larger values.
         */
        sort_order?: number;
        /**
         * User-facing description of where trips on the route pattern serve.
         * These names are published in the form
         * Destination,
         * Destination via Street or Landmark,
         * Origin - Destination,
         * or Origin - Destination via Street or Landmark.
         * Note that names for bus and subway route patterns currently do not include the origin location,
         * but will in the future.
         */
        name?: string;
        /**
         * Direction in which trip is traveling: `0` or `1`.
         *
         * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
         */
        direction_id?: number;
        /**
         * Indicates whether or not the route pattern can be considered canonical and the default set of stops
         * for the given route and direction.
         *
         * | Value | Description |
         * |-|-|
         * | `true` | Route pattern should be considered canonical for this route in this direction. If branching regularly occurs, this route-direction may have more than one canonical pattern. |
         * | `false` | Route pattern should be not considered canonical for this route in this direction. |
         */
        canonical?: boolean;
    };
}
/**
 * A JSON-API document with a single {@link RoutePatternResource} resource
 */
interface RoutePattern extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: RoutePatternResource;
}
/**
 * A JSON-API error document when a request uses an invalid 'accept' header
 */
interface NotAcceptable extends ErrorDocument {
    errors: {
        /**
         * Human-readable summary of the problem
         */
        detail?: string;
        /**
         * The HTTP status code applicable to the problem
         */
        status?: string;
        /**
         * An application-specific error code
         */
        code?: string;
    }[];
}
/**
 * A page of {@link LiveFacilityResource} results
 */
interface LiveFacilities extends DataDocument {
    links?: {
        /**
         * Link to this page of results
         */
        self?: string;
        /**
         * Link to the previous page of results
         */
        prev?: string;
        /**
         * Link to the next page of results
         */
        next?: string;
        /**
         * Link to the last page of results
         */
        last?: string;
        /**
         * Link to the first page of results
         */
        first?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    /**
     * Content with {@link LiveFacilityResource} objects
     */
    data: LiveFacilityResource[];
}
/**
 * Start and End dates for active alert
 */
interface ActivePeriod {
    /**
     * Start Date. Format is ISO8601.
     */
    start?: string;
    /**
     * End Date. Format is ISO8601.
     */
    end?: string;
}
/**
 * An activity affected by an alert.
 *
 * | Value                | Description                                                                                                                                                                                                                                                                       |
 * |----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
 * | `"BOARD"`            | Boarding a vehicle. Any passenger trip includes boarding a vehicle and exiting from a vehicle.                                                                                                                                                                                    |
 * | `"BRINGING_BIKE"`    | Bringing a bicycle while boarding or exiting.                                                                                                                                                                                                                                     |
 * | `"EXIT"`             | Exiting from a vehicle (disembarking). Any passenger trip includes boarding a vehicle and exiting a vehicle.                                                                                                                                                                      |
 * | `"PARK_CAR"`         | Parking a car at a garage or lot in a station.                                                                                                                                                                                                                                    |
 * | `"RIDE"`             | Riding through a stop without boarding or exiting.. Not every passenger trip will include this -- a passenger may board at one stop and exit at the next stop.                                                                                                                    |
 * | `"STORE_BIKE"`       | Storing a bicycle at a station.                                                                                                                                                                                                                                                   |
 * | `"USING_ESCALATOR"`  | Using an escalator while boarding or exiting (should only be used for customers who specifically want to avoid stairs.)                                                                                                                                                           |
 * | `"USING_WHEELCHAIR"` | Using a wheelchair while boarding or exiting. Note that this applies to something that specifically affects customers who use a wheelchair to board or exit; a delay should not include this as an affected activity unless it specifically affects customers using wheelchairs.  |
 */
enum Activity {
    /**
     * Boarding a vehicle. Any passenger trip includes boarding a vehicle and exiting from a vehicle.
     */
    BOARD = 'BOARD',
    /**
     * Bringing a bicycle while boarding or exiting.
     */
    BRINGING_BIKE = 'BRINGING_BIKE',
    /**
     * Exiting from a vehicle (disembarking). Any passenger trip includes boarding a vehicle and exiting a vehicle.
     */
    EXIT = 'EXIT',
    /**
     * Parking a car at a garage or lot in a station.
     */
    PARK_CAR = 'PARK_CAR',
    /**
     * Riding through a stop without boarding or exiting. Not every passenger trip will include this -- a passenger may board at one stop and exit at the next stop.
     */
    RIDE = 'RIDE',
    /**
     * Storing a bicycle at a station.
     */
    STORE_BIKE = 'STORE_BIKE',
    /**
     * Using an escalator while boarding or exiting (should only be used for customers who specifically want to avoid stairs.)
     */
    USING_ESCALATOR = 'USING_ESCALATOR',
    /**
     * Using a wheelchair while boarding or exiting. Note that this applies to something that specifically affects customers who use a wheelchair to board or exit; a delay should not include this as an affected activity unless it specifically affects customers using wheelchairs.
     */
    USING_WHEELCHAIR = 'USING_WHEELCHAIR'
}
/**
 * Line represents a combination of routes
 */
interface LineResource extends Resource<'line'> {
    relationships?: {};
    links?: {};
    attributes?: {
        /**
         * This field can be used to specify a legible color to use for text drawn against a background of line_color. The color must be provided as a six-character hexadecimal number, for example, `FFD700`.
         */
        text_color?: string;
        /**
         * Lines sort in ascending order
         */
        sort_order?: number;
        /**
         * Short, public-facing name for the group of routes represented in this line
         */
        short_name?: string;
        /**
         * Lengthier, public-facing name for the group of routes represented in this line
         */
        long_name?: string;
        /**
         * In systems that have colors assigned to lines, the route_color field defines a color that corresponds to a line. The color must be provided as a six-character hexadecimal number, for example, `00FFFF`.
         */
        color?: string;
    };
}
/**
 * A JSON-API document with a single {@link LineResource} resource
 */
interface Line extends DataDocument {
    links?: {
        /**
         * the link that generated the current response document.
         */
        self?: string;
    };
    /**
     * Included resources
     */
    included?: Resource[];
    data: LineResource;
}
const BASE_URL = "https://api-v3.mbta.com";
interface RequestOptions {
    query?: Record<string, any>;
    headers?: Record<string, string>;
}
interface getVehicleOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[vehicle]"?: string;
    /**
     * Relationships to include.
     *
     * * `trip`
     * * `stop`
     * * `route`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * | include | Description                                                                                                                                                                                                                                                                                                                                                  |
     * |---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
     * | `trip`  | The trip which the vehicle is currently operating.                                                                                                                                                                                                                                                                                                           |
     * | `stop`  | The vehicle's current (when `current_status` is **STOPPED_AT**) or *next* stop.                                                                                                                                                                                                                                                                              |
     * | `route` | The one route that is designated for that trip, as in GTFS `trips.txt`.  A trip might also provide service on other routes, identified by the MBTA's `multi_route_trips.txt` GTFS extension. `filter[route]` does consider the multi_route_trips GTFS extension, so it is possible to filter for one route and get a different route included in the response. |
     */
    include?: string;
}
interface getVehiclesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/bearing` | ascending | `bearing` |
     * | `/data/{index}/attributes/bearing` | descending | `-bearing` |
     * | `/data/{index}/attributes/carriages` | ascending | `carriages` |
     * | `/data/{index}/attributes/carriages` | descending | `-carriages` |
     * | `/data/{index}/attributes/current_status` | ascending | `current_status` |
     * | `/data/{index}/attributes/current_status` | descending | `-current_status` |
     * | `/data/{index}/attributes/current_stop_sequence` | ascending | `current_stop_sequence` |
     * | `/data/{index}/attributes/current_stop_sequence` | descending | `-current_stop_sequence` |
     * | `/data/{index}/attributes/direction_id` | ascending | `direction_id` |
     * | `/data/{index}/attributes/direction_id` | descending | `-direction_id` |
     * | `/data/{index}/attributes/label` | ascending | `label` |
     * | `/data/{index}/attributes/label` | descending | `-label` |
     * | `/data/{index}/attributes/latitude` | ascending | `latitude` |
     * | `/data/{index}/attributes/latitude` | descending | `-latitude` |
     * | `/data/{index}/attributes/longitude` | ascending | `longitude` |
     * | `/data/{index}/attributes/longitude` | descending | `-longitude` |
     * | `/data/{index}/attributes/occupancy_status` | ascending | `occupancy_status` |
     * | `/data/{index}/attributes/occupancy_status` | descending | `-occupancy_status` |
     * | `/data/{index}/attributes/revenue_status` | ascending | `revenue_status` |
     * | `/data/{index}/attributes/revenue_status` | descending | `-revenue_status` |
     * | `/data/{index}/attributes/speed` | ascending | `speed` |
     * | `/data/{index}/attributes/speed` | descending | `-speed` |
     * | `/data/{index}/attributes/updated_at` | ascending | `updated_at` |
     * | `/data/{index}/attributes/updated_at` | descending | `-updated_at` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[vehicle]"?: string;
    /**
     * Relationships to include.
     *
     * * `trip`
     * * `stop`
     * * `route`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * | include | Description                                                                                                                                                                                                                                                                                                                                                  |
     * |---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
     * | `trip`  | The trip which the vehicle is currently operating.                                                                                                                                                                                                                                                                                                           |
     * | `stop`  | The vehicle's current (when `current_status` is **STOPPED_AT**) or *next* stop.                                                                                                                                                                                                                                                                              |
     * | `route` | The one route that is designated for that trip, as in GTFS `trips.txt`.  A trip might also provide service on other routes, identified by the MBTA's `multi_route_trips.txt` GTFS extension. `filter[route]` does consider the multi_route_trips GTFS extension, so it is possible to filter for one route and get a different route included in the response. |
     */
    include?: string;
    /**
     * Filter by multiple IDs. Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list. Cannot be combined with any other filter.
     */
    "filter[id]"?: string;
    /**
     * Filter by `/data/{index}/relationships/trip/data/id`. Multiple `/data/{index}/relationships/trip/data/id` **MUST** be a comma-separated (U+002C COMMA, ",") list. Cannot be combined with any other filter.
     */
    "filter[trip]"?: string;
    /**
     * Filter by label. Multiple `label` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[label]"?: string;
    /**
     * Filter by route. If the vehicle is on a [multi-route trip](https://groups.google.com/forum/#!msg/massdotdevelopers/1egrhNjT9eA/iy6NFymcCgAJ), it will be returned for any of the routes. Multiple `route_id` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[route]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     * Only used if `filter[route]` is also present.
     */
    "filter[direction_id]"?: string;
    /**
     * Filter by route_type: https://gtfs.org/documentation/schedule/reference/#routestxt.
     *
     * Multiple `route_type` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route_type]"?: string;
    /**
     * Filter vehicles by revenue status.
     * Revenue status indicates whether or not the vehicle is accepting passengers.
     * When filter is not included, the default behavior is to filter by `revenue=REVENUE`.
     *
     * Multiple `revenue` types **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[revenue]"?: string;
}
interface getTripOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[trip]"?: string;
    /**
     * Relationships to include.
     *
     * * `route`
     * * `vehicle`
     * * `service`
     * * `shape`
     * * `predictions`
     * * `route_pattern`
     * * `stops`
     * * `occupancies`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * | include         | Description |
     * |-----------------|-------------|
     * | `route`         | The *primary* route for the trip. |
     * | `vehicle`       | The vehicle on this trip. |
     * | `service`       | The service controlling when this trip is active. |
     * | `shape`         | The shape of the trip. |
     * | `route_pattern` | The route pattern for the trip. |
     * | `predictions`   | Predictions of when the `vehicle` on this `trip` will arrive at or depart from each stop on the route(s) on the `trip`. |
     * | `stops`         | The stops this trip goes through. |
     * | `occupancies`   | **EXPERIMENTAL:** The trip's static occupancy data. For information on experimental features, see: https://www.mbta.com/developers/v3-api/versioning.|
     */
    include?: string;
}
interface getTripsOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/bikes_allowed` | ascending | `bikes_allowed` |
     * | `/data/{index}/attributes/bikes_allowed` | descending | `-bikes_allowed` |
     * | `/data/{index}/attributes/block_id` | ascending | `block_id` |
     * | `/data/{index}/attributes/block_id` | descending | `-block_id` |
     * | `/data/{index}/attributes/direction_id` | ascending | `direction_id` |
     * | `/data/{index}/attributes/direction_id` | descending | `-direction_id` |
     * | `/data/{index}/attributes/headsign` | ascending | `headsign` |
     * | `/data/{index}/attributes/headsign` | descending | `-headsign` |
     * | `/data/{index}/attributes/name` | ascending | `name` |
     * | `/data/{index}/attributes/name` | descending | `-name` |
     * | `/data/{index}/attributes/revenue_status` | ascending | `revenue_status` |
     * | `/data/{index}/attributes/revenue_status` | descending | `-revenue_status` |
     * | `/data/{index}/attributes/wheelchair_accessible` | ascending | `wheelchair_accessible` |
     * | `/data/{index}/attributes/wheelchair_accessible` | descending | `-wheelchair_accessible` |
     * | `/data/{index}/attributes/percentage` | ascending | `percentage` |
     * | `/data/{index}/attributes/percentage` | descending | `-percentage` |
     * | `/data/{index}/attributes/status` | ascending | `status` |
     * | `/data/{index}/attributes/status` | descending | `-status` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[trip]"?: string;
    /**
     * Relationships to include.
     *
     * * `route`
     * * `vehicle`
     * * `service`
     * * `shape`
     * * `predictions`
     * * `route_pattern`
     * * `stops`
     * * `occupancies`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * | include         | Description |
     * |-----------------|-------------|
     * | `route`         | The *primary* route for the trip. |
     * | `vehicle`       | The vehicle on this trip. |
     * | `service`       | The service controlling when this trip is active. |
     * | `shape`         | The shape of the trip. |
     * | `route_pattern` | The route pattern for the trip. |
     * | `predictions`   | Predictions of when the `vehicle` on this `trip` will arrive at or depart from each stop on the route(s) on the `trip`. |
     * | `stops`         | The stops this trip goes through. |
     * | `occupancies`   | **EXPERIMENTAL:** The trip's static occupancy data. For information on experimental features, see: https://www.mbta.com/developers/v3-api/versioning.|
     */
    include?: string;
    /**
     * Filter by trips on a particular date The active date is the service date. Trips that begin between midnight and 3am are considered part of the previous service day. The format is ISO8601 with the template of YYYY-MM-DD.
     */
    "filter[date]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     */
    "filter[direction_id]"?: string;
    /**
     * Filter by `/data/{index}/relationships/route/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route]"?: string;
    /**
     * Filter trips by revenue status.
     * Revenue status indicates whether or not the vehicle is accepting passengers.
     * When filter is not included, the default behavior is to filter by `revenue=REVENUE`.
     *
     * Multiple `revenue` types **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[revenue]"?: string;
    /**
     * Filter by route pattern IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[route_pattern]"?: string;
    /**
     * Filter by multiple IDs. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
    /**
     * Filter by multiple names. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[name]"?: string;
}
interface getStopOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[stop]"?: string;
    /**
     * Relationships to include.
     *
     * * `child_stops`
     * * `connecting_stops`
     * * `facilities`
     * * `parent_station`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
}
interface getStopsOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Sorting by distance requires `filter[latitude]` and `filter[longitude]` to be set. Assumes ascending; may be prefixed with '-' for descending.
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/address` | ascending | `address` |
     * | `/data/{index}/attributes/address` | descending | `-address` |
     * | `/data/{index}/attributes/at_street` | ascending | `at_street` |
     * | `/data/{index}/attributes/at_street` | descending | `-at_street` |
     * | `/data/{index}/attributes/description` | ascending | `description` |
     * | `/data/{index}/attributes/description` | descending | `-description` |
     * | `/data/{index}/attributes/latitude` | ascending | `latitude` |
     * | `/data/{index}/attributes/latitude` | descending | `-latitude` |
     * | `/data/{index}/attributes/location_type` | ascending | `location_type` |
     * | `/data/{index}/attributes/location_type` | descending | `-location_type` |
     * | `/data/{index}/attributes/longitude` | ascending | `longitude` |
     * | `/data/{index}/attributes/longitude` | descending | `-longitude` |
     * | `/data/{index}/attributes/municipality` | ascending | `municipality` |
     * | `/data/{index}/attributes/municipality` | descending | `-municipality` |
     * | `/data/{index}/attributes/name` | ascending | `name` |
     * | `/data/{index}/attributes/name` | descending | `-name` |
     * | `/data/{index}/attributes/on_street` | ascending | `on_street` |
     * | `/data/{index}/attributes/on_street` | descending | `-on_street` |
     * | `/data/{index}/attributes/platform_code` | ascending | `platform_code` |
     * | `/data/{index}/attributes/platform_code` | descending | `-platform_code` |
     * | `/data/{index}/attributes/platform_name` | ascending | `platform_name` |
     * | `/data/{index}/attributes/platform_name` | descending | `-platform_name` |
     * | `/data/{index}/attributes/vehicle_type` | ascending | `vehicle_type` |
     * | `/data/{index}/attributes/vehicle_type` | descending | `-vehicle_type` |
     * | `/data/{index}/attributes/wheelchair_boarding` | ascending | `wheelchair_boarding` |
     * | `/data/{index}/attributes/wheelchair_boarding` | descending | `-wheelchair_boarding` |
     *  | Distance to (`/data/{index}/attributes/latitude`, `/data/{index}/attributes/longitude`) | ascending | `distance` |
     * | Distance to (`/data/{index}/attributes/latitude`, `/data/{index}/attributes/longitude`) | descending | `-distance` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[stop]"?: string;
    /**
     * Relationships to include.
     *
     * * `child_stops`
     * * `connecting_stops`
     * * `facilities`
     * * `parent_station`
     * * `route`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * Note that `route` can only be included if `filter[route]` is present and has exactly one `/data/{index}/relationships/route/data/id`.
     */
    include?: string;
    /**
     * Filter by date when stop is in use. Will be ignored unless filter[route] is present. If filter[service] is present, this filter will be ignored. The active date is the service date. Trips that begin between midnight and 3am are considered part of the previous service day. The format is ISO8601 with the template of YYYY-MM-DD.
     */
    "filter[date]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     */
    "filter[direction_id]"?: string;
    /**
     * Latitude in degrees North in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#A_new_World_Geodetic_System:_WGS.C2.A084) coordinate system to search `filter[radius]` degrees around with `filter[longitude]`.
     */
    "filter[latitude]"?: string;
    /**
     * Longitude in degrees East in the [WGS-84](https://en.wikipedia.org/wiki/World_Geodetic_System#Longitudes_on_WGS.C2.A084) coordinate system to search `filter[radius]` degrees around with `filter[latitude]`.
     */
    "filter[longitude]"?: string;
    /**
     * The distance is in degrees as if latitude and longitude were on a flat 2D plane and normal Pythagorean distance was calculated.  Over the region MBTA serves, `0.02` degrees is approximately `1` mile. Defaults to `0.01` degrees (approximately a half mile).
     */
    "filter[radius]"?: number;
    /**
     * Filter by `/data/{index}/id` (the stop ID). Multiple `/data/{index}/id` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
    /**
     * Filter by route_type: https://gtfs.org/documentation/schedule/reference/#routestxt.
     *
     * Multiple `route_type` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route_type]"?: string;
    /**
     * Filter by `/data/{index}/relationships/route/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route]"?: string;
    /**
     * Filter by service_id for which stop is in use. Multiple service_ids **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[service]"?: string;
    /**
     * Filter by location_type https://github.com/mbta/gtfs-documentation/blob/master/reference/gtfs.md#stopstxt. Multiple location_type **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[location_type]"?: string;
}
interface getShapeOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[shape]"?: string;
}
interface getShapesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/polyline` | ascending | `polyline` |
     * | `/data/{index}/attributes/polyline` | descending | `-polyline` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[shape]"?: string;
    /**
     * Filter by `/data/{index}/relationships/route/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route]"?: string;
}
interface getServiceOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[service]"?: string;
}
interface getServicesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/added_dates` | ascending | `added_dates` |
     * | `/data/{index}/attributes/added_dates` | descending | `-added_dates` |
     * | `/data/{index}/attributes/added_dates_notes` | ascending | `added_dates_notes` |
     * | `/data/{index}/attributes/added_dates_notes` | descending | `-added_dates_notes` |
     * | `/data/{index}/attributes/description` | ascending | `description` |
     * | `/data/{index}/attributes/description` | descending | `-description` |
     * | `/data/{index}/attributes/end_date` | ascending | `end_date` |
     * | `/data/{index}/attributes/end_date` | descending | `-end_date` |
     * | `/data/{index}/attributes/rating_description` | ascending | `rating_description` |
     * | `/data/{index}/attributes/rating_description` | descending | `-rating_description` |
     * | `/data/{index}/attributes/rating_end_date` | ascending | `rating_end_date` |
     * | `/data/{index}/attributes/rating_end_date` | descending | `-rating_end_date` |
     * | `/data/{index}/attributes/rating_start_date` | ascending | `rating_start_date` |
     * | `/data/{index}/attributes/rating_start_date` | descending | `-rating_start_date` |
     * | `/data/{index}/attributes/removed_dates` | ascending | `removed_dates` |
     * | `/data/{index}/attributes/removed_dates` | descending | `-removed_dates` |
     * | `/data/{index}/attributes/removed_dates_notes` | ascending | `removed_dates_notes` |
     * | `/data/{index}/attributes/removed_dates_notes` | descending | `-removed_dates_notes` |
     * | `/data/{index}/attributes/schedule_name` | ascending | `schedule_name` |
     * | `/data/{index}/attributes/schedule_name` | descending | `-schedule_name` |
     * | `/data/{index}/attributes/schedule_type` | ascending | `schedule_type` |
     * | `/data/{index}/attributes/schedule_type` | descending | `-schedule_type` |
     * | `/data/{index}/attributes/schedule_typicality` | ascending | `schedule_typicality` |
     * | `/data/{index}/attributes/schedule_typicality` | descending | `-schedule_typicality` |
     * | `/data/{index}/attributes/start_date` | ascending | `start_date` |
     * | `/data/{index}/attributes/start_date` | descending | `-start_date` |
     * | `/data/{index}/attributes/valid_days` | ascending | `valid_days` |
     * | `/data/{index}/attributes/valid_days` | descending | `-valid_days` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[service]"?: string;
    /**
     * Filter by multiple IDs. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
    /**
     * Filter by route. Multiple `route` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[route]"?: string;
}
interface getSchedulesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key.
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/arrival_time` | ascending | `arrival_time` |
     * | `/data/{index}/attributes/arrival_time` | descending | `-arrival_time` |
     * | `/data/{index}/attributes/departure_time` | ascending | `departure_time` |
     * | `/data/{index}/attributes/departure_time` | descending | `-departure_time` |
     * | `/data/{index}/attributes/direction_id` | ascending | `direction_id` |
     * | `/data/{index}/attributes/direction_id` | descending | `-direction_id` |
     * | `/data/{index}/attributes/drop_off_type` | ascending | `drop_off_type` |
     * | `/data/{index}/attributes/drop_off_type` | descending | `-drop_off_type` |
     * | `/data/{index}/attributes/pickup_type` | ascending | `pickup_type` |
     * | `/data/{index}/attributes/pickup_type` | descending | `-pickup_type` |
     * | `/data/{index}/attributes/stop_headsign` | ascending | `stop_headsign` |
     * | `/data/{index}/attributes/stop_headsign` | descending | `-stop_headsign` |
     * | `/data/{index}/attributes/stop_sequence` | ascending | `stop_sequence` |
     * | `/data/{index}/attributes/stop_sequence` | descending | `-stop_sequence` |
     * | `/data/{index}/attributes/timepoint` | ascending | `timepoint` |
     * | `/data/{index}/attributes/timepoint` | descending | `-timepoint` |
     *  | `/data/{index}/attributes/arrival_time` if present, otherwise `/data/{index}/attributes/departure_time` | ascending | `time` |
     * | `/data/{index}/attributes/arrival_time` if present, otherwise `/data/{index}/attributes/departure_time` | descending | `-time` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[schedule]"?: string;
    /**
     * Relationships to include.
     *
     * * `stop`
     * * `trip`
     * * `prediction`
     * * `route`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
    /**
     * Filter schedule by date that they are active. The active date is the service date. Trips that begin between midnight and 3am are considered part of the previous service day. The format is ISO8601 with the template of YYYY-MM-DD.
     */
    "filter[date]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     */
    "filter[direction_id]"?: string;
    /**
     * Filter by route_type: https://gtfs.org/documentation/schedule/reference/#routestxt.
     *
     * Multiple `route_type` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Must be used in conjunction with another filter.
     */
    "filter[route_type]"?: string;
    /**
     * Time before which schedule should not be returned. To filter times after midnight use more than 24 hours. For example, min_time=24:00 will return schedule information for the next calendar day, since that service is considered part of the current service day. Additionally, min_time=00:00&max_time=02:00 will not return anything. The time format is HH:MM.
     */
    "filter[min_time]"?: string;
    /**
     * Time after which schedule should not be returned. To filter times after midnight use more than 24 hours. For example, min_time=24:00 will return schedule information for the next calendar day, since that service is considered part of the current service day. Additionally, min_time=00:00&max_time=02:00 will not return anything. The time format is HH:MM.
     */
    "filter[max_time]"?: string;
    /**
     * Filter by `/data/{index}/relationships/route/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route]"?: string;
    /**
     * Filter by `/data/{index}/relationships/stop/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Parent station IDs are treated as though their child stops were also included. 
     */
    "filter[stop]"?: string;
    /**
     * Filter by `/data/{index}/relationships/trip/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[trip]"?: string;
    /**
     * Filter by the index of the stop in the trip.  Symbolic values `first` and `last` can be used instead of numeric sequence number too.
     */
    "filter[stop_sequence]"?: string;
}
interface getRouteOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[route]"?: string;
    /**
     * Relationships to include.
     *
     * * `line`
     * * `route_patterns`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
}
interface getRoutesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/color` | ascending | `color` |
     * | `/data/{index}/attributes/color` | descending | `-color` |
     * | `/data/{index}/attributes/description` | ascending | `description` |
     * | `/data/{index}/attributes/description` | descending | `-description` |
     * | `/data/{index}/attributes/direction_destinations` | ascending | `direction_destinations` |
     * | `/data/{index}/attributes/direction_destinations` | descending | `-direction_destinations` |
     * | `/data/{index}/attributes/direction_names` | ascending | `direction_names` |
     * | `/data/{index}/attributes/direction_names` | descending | `-direction_names` |
     * | `/data/{index}/attributes/fare_class` | ascending | `fare_class` |
     * | `/data/{index}/attributes/fare_class` | descending | `-fare_class` |
     * | `/data/{index}/attributes/long_name` | ascending | `long_name` |
     * | `/data/{index}/attributes/long_name` | descending | `-long_name` |
     * | `/data/{index}/attributes/short_name` | ascending | `short_name` |
     * | `/data/{index}/attributes/short_name` | descending | `-short_name` |
     * | `/data/{index}/attributes/sort_order` | ascending | `sort_order` |
     * | `/data/{index}/attributes/sort_order` | descending | `-sort_order` |
     * | `/data/{index}/attributes/text_color` | ascending | `text_color` |
     * | `/data/{index}/attributes/text_color` | descending | `-text_color` |
     * | `/data/{index}/attributes/type` | ascending | `type` |
     * | `/data/{index}/attributes/type` | descending | `-type` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[route]"?: string;
    /**
     * Relationships to include.
     *
     * * `stop`
     * * `line`
     * * `route_patterns`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * `stop` can only be included when `filter[stop]` is also specified.
     */
    include?: string;
    /**
     * Filter by `/data/{index}/relationships/stop/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[stop]"?: string;
    /**
     * | Value | Name          | Example    |
     * |-------|---------------|------------|
     * | `0`   | Light Rail    | Green Line |
     * | `1`   | Heavy Rail    | Red Line   |
     * | `2`   | Commuter Rail |            |
     * | `3`   | Bus           |            |
     * | `4`   | Ferry         |            |
     *
     *
     * Multiple `route_type` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[type]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     * When combined with stop_id, filters by routes which stop at that stop when traveling in a particular direction
     */
    "filter[direction_id]"?: string;
    /**
     * Filter by date that route is active The active date is the service date. Trips that begin between midnight and 3am are considered part of the previous service day. The format is ISO8601 with the template of YYYY-MM-DD.
     */
    "filter[date]"?: string;
    /**
     * Filter by multiple IDs. Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
}
interface getRoutePatternOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[route_pattern]"?: string;
    /**
     * Relationships to include.
     *
     * * `route`
     * * `representative_trip`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * | include | Description |
     * |-|-|
     * | `route` | The route that this pattern belongs to. |
     * | `representative_trip` | A trip that can be considered a canonical trip for the route pattern. This trip can be used to deduce a pattern's canonical set of stops and shape. |
     */
    include?: string;
}
interface getRoutePatternsOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/canonical` | ascending | `canonical` |
     * | `/data/{index}/attributes/canonical` | descending | `-canonical` |
     * | `/data/{index}/attributes/direction_id` | ascending | `direction_id` |
     * | `/data/{index}/attributes/direction_id` | descending | `-direction_id` |
     * | `/data/{index}/attributes/name` | ascending | `name` |
     * | `/data/{index}/attributes/name` | descending | `-name` |
     * | `/data/{index}/attributes/sort_order` | ascending | `sort_order` |
     * | `/data/{index}/attributes/sort_order` | descending | `-sort_order` |
     * | `/data/{index}/attributes/time_desc` | ascending | `time_desc` |
     * | `/data/{index}/attributes/time_desc` | descending | `-time_desc` |
     * | `/data/{index}/attributes/typicality` | ascending | `typicality` |
     * | `/data/{index}/attributes/typicality` | descending | `-typicality` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[route_pattern]"?: string;
    /**
     * Relationships to include.
     *
     * * `route`
     * * `representative_trip`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * | include | Description |
     * |-|-|
     * | `route` | The route that this pattern belongs to. |
     * | `representative_trip` | A trip that can be considered a canonical trip for the route pattern. This trip can be used to deduce a pattern's canonical set of stops and shape. |
     */
    include?: string;
    /**
     * Filter by multiple IDs. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
    /**
     * Filter by `/data/{index}/relationships/route/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     */
    "filter[direction_id]"?: string;
    /**
     * Filter by `/data/{index}/relationships/stop/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Parent station IDs are treated as though their child stops were also included. 
     */
    "filter[stop]"?: string;
    /**
     * Filter by canonical
     *
     * true: Route pattern should be considered canonical for this route in this direction. If branching regularly occurs, this route-direction may have more than one canonical pattern.
     * false: Route pattern should be not considered canonical for this route in this direction.
     *
     */
    "filter[canonical]"?: boolean;
    /**
     * Filter by date that route pattern is active The active date is the service date. Trips that begin between midnight and 3am are considered part of the previous service day. The format is ISO8601 with the template of YYYY-MM-DD.
     */
    "filter[date]"?: string;
}
interface getPredictionsOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key.
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/arrival_time` | ascending | `arrival_time` |
     * | `/data/{index}/attributes/arrival_time` | descending | `-arrival_time` |
     * | `/data/{index}/attributes/arrival_uncertainty` | ascending | `arrival_uncertainty` |
     * | `/data/{index}/attributes/arrival_uncertainty` | descending | `-arrival_uncertainty` |
     * | `/data/{index}/attributes/departure_time` | ascending | `departure_time` |
     * | `/data/{index}/attributes/departure_time` | descending | `-departure_time` |
     * | `/data/{index}/attributes/departure_uncertainty` | ascending | `departure_uncertainty` |
     * | `/data/{index}/attributes/departure_uncertainty` | descending | `-departure_uncertainty` |
     * | `/data/{index}/attributes/direction_id` | ascending | `direction_id` |
     * | `/data/{index}/attributes/direction_id` | descending | `-direction_id` |
     * | `/data/{index}/attributes/revenue_status` | ascending | `revenue_status` |
     * | `/data/{index}/attributes/revenue_status` | descending | `-revenue_status` |
     * | `/data/{index}/attributes/schedule_relationship` | ascending | `schedule_relationship` |
     * | `/data/{index}/attributes/schedule_relationship` | descending | `-schedule_relationship` |
     * | `/data/{index}/attributes/status` | ascending | `status` |
     * | `/data/{index}/attributes/status` | descending | `-status` |
     * | `/data/{index}/attributes/stop_sequence` | ascending | `stop_sequence` |
     * | `/data/{index}/attributes/stop_sequence` | descending | `-stop_sequence` |
     * | `/data/{index}/attributes/update_type` | ascending | `update_type` |
     * | `/data/{index}/attributes/update_type` | descending | `-update_type` |
     *  | `/data/{index}/attributes/arrival_time` if present, otherwise `/data/{index}/attributes/departure_time` | ascending | `time` |
     * | `/data/{index}/attributes/arrival_time` if present, otherwise `/data/{index}/attributes/departure_time` | descending | `-time` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[prediction]"?: string;
    /**
     * Relationships to include.
     *
     * * `schedule`
     * * `stop`
     * * `route`
     * * `trip`
     * * `vehicle`
     * * `alerts`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     * ## Example
     *
     * `https://api-v3.mbta.com/predictions?filter%5Bstop%5D=place-sstat&filter%5Bdirection_id%5D=0&include=stop`
     * returns predictions from South Station with direction_id=0, below is a truncated response with only relevant fields displayed:
     * ```
     *   {
     *     "data": [
     *       {
     *         "id": "prediction-CR-Weekday-Fall-18-743-South Station-02-1",
     *         "relationships": {
     *           "stop": {
     *             "data": {
     *               "id": "South Station-02",
     *               "type": "stop"
     *             }
     *           },
     *         },
     *         "type": "prediction"
     *       }
     *     ],
     *     "included": [
     *       {
     *         "attributes": {
     *           "platform_code": "2",
     *         },
     *         "id": "South Station-02",
     *         "type": "stop"
     *       }
     *     ],
     *   }
     * ```
     * Note the stop relationship; use it to cross-reference  stop-id with the included stops to retrieve the platform_code for the given prediction.
     *
     * ## Note on trips
     * A Vehicle's `trip` is what is currently being served.
     *
     * A Prediction also has a `vehicle`: this is the vehicle we predict will serve this trip/stop.
     *
     * Since we know vehicles make future trips, the trip the vehicle is currently servicing can be different from the trips we're making predictions for.
     *
     * For example:
     * * Vehicle 1234 is currently serving trip A
     * * The block is Trip A → Trip B → Trip C
     *
     * We'll be making predictions for the rest of trip A, as well as all the stops of trip B and trip C. The `trip` for the Vehicle is always `A`, and all of the Predictions will reference Vehicle 1234.
     */
    include?: string;
    /**
     *  Latitude/Longitude must be both present or both absent.
     */
    "filter[latitude]"?: string;
    /**
     *  Latitude/Longitude must be both present or both absent.
     */
    "filter[longitude]"?: string;
    /**
     *  Radius accepts a floating point number, and the default is 0.01.  For example, if you query for: latitude: 42,  longitude: -71,  radius: 0.05 then you will filter between latitudes 41.95 and 42.05, and longitudes -70.95 and -71.05.
     */
    "filter[radius]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     */
    "filter[direction_id]"?: string;
    /**
     * Filter by route_type: https://gtfs.org/documentation/schedule/reference/#routestxt.
     *
     * Multiple `route_type` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Must be used in conjunction with another filter.
     */
    "filter[route_type]"?: string;
    /**
     * Filter by `/data/{index}/relationships/stop/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Parent station IDs are treated as though their child stops were also included. 
     */
    "filter[stop]"?: string;
    /**
     * Filter by `/data/{index}/relationships/route/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route]"?: string;
    /**
     * Filter by `/data/{index}/relationships/trip/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[trip]"?: string;
    /**
     * Filter predictions by revenue status.
     * Revenue status indicates whether or not the vehicle is accepting passengers.
     * When filter is not included, the default behavior is to filter by `revenue=REVENUE`.
     *
     * Multiple `revenue` types **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[revenue]"?: string;
    /**
     * Filter by `/included/{index}/relationships/route_pattern/data/id` of a trip. Multiple `route_pattern_id` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[route_pattern]"?: string;
}
interface getLiveFacilityOptions {
    /**
     * Relationships to include.
     *
     * * `facility`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
}
interface getLiveFacilitiesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/properties` | ascending | `properties` |
     * | `/data/{index}/attributes/properties` | descending | `-properties` |
     * | `/data/{index}/attributes/updated_at` | ascending | `updated_at` |
     * | `/data/{index}/attributes/updated_at` | descending | `-updated_at` |
     */
    sort?: string;
    /**
     * Relationships to include.
     *
     * * `facility`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
    /**
     * Filter by multiple parking facility ids. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
}
interface getLineOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[line]"?: string;
    /**
     * Relationships to include.
     *
     * * `routes`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
}
interface getLinesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/color` | ascending | `color` |
     * | `/data/{index}/attributes/color` | descending | `-color` |
     * | `/data/{index}/attributes/long_name` | ascending | `long_name` |
     * | `/data/{index}/attributes/long_name` | descending | `-long_name` |
     * | `/data/{index}/attributes/short_name` | ascending | `short_name` |
     * | `/data/{index}/attributes/short_name` | descending | `-short_name` |
     * | `/data/{index}/attributes/sort_order` | ascending | `sort_order` |
     * | `/data/{index}/attributes/sort_order` | descending | `-sort_order` |
     * | `/data/{index}/attributes/text_color` | ascending | `text_color` |
     * | `/data/{index}/attributes/text_color` | descending | `-text_color` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[line]"?: string;
    /**
     * Relationships to include.
     *
     * * `routes`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
    /**
     * Filter by multiple IDs. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
}
interface getFacilityOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[facility]"?: string;
    /**
     * Relationships to include.
     *
     * * `stop`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
}
interface getFacilitiesOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/latitude` | ascending | `latitude` |
     * | `/data/{index}/attributes/latitude` | descending | `-latitude` |
     * | `/data/{index}/attributes/long_name` | ascending | `long_name` |
     * | `/data/{index}/attributes/long_name` | descending | `-long_name` |
     * | `/data/{index}/attributes/longitude` | ascending | `longitude` |
     * | `/data/{index}/attributes/longitude` | descending | `-longitude` |
     * | `/data/{index}/attributes/properties` | ascending | `properties` |
     * | `/data/{index}/attributes/properties` | descending | `-properties` |
     * | `/data/{index}/attributes/short_name` | ascending | `short_name` |
     * | `/data/{index}/attributes/short_name` | descending | `-short_name` |
     * | `/data/{index}/attributes/type` | ascending | `type` |
     * | `/data/{index}/attributes/type` | descending | `-type` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[facility]"?: string;
    /**
     * Relationships to include.
     *
     * * `stop`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
    /**
     * Filter by `/data/{index}/relationships/stop/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[stop]"?: string;
    /**
     * Filter by type. Multiple types **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[type]"?: string;
}
interface getAlertOptions {
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[alert]"?: string;
    /**
     * Relationships to include.
     *
     * * `stops`
     * * `routes`
     * * `trips`
     * * `facilities`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
}
interface getAlertsOptions {
    /**
     * Offset (0-based) of first element in the page
     */
    "page[offset]"?: number;
    /**
     * Max number of elements to return
     */
    "page[limit]"?: number;
    /**
     * Results can be [sorted](http://jsonapi.org/format/#fetching-sorting) by the id or any `/data/{index}/attributes` key. Assumes ascending; may be prefixed with '-' for descending
     *
     * | JSON pointer | Direction | `sort`     |
     * |--------------|-----------|------------|
     * | `/data/{index}/attributes/active_period` | ascending | `active_period` |
     * | `/data/{index}/attributes/active_period` | descending | `-active_period` |
     * | `/data/{index}/attributes/banner` | ascending | `banner` |
     * | `/data/{index}/attributes/banner` | descending | `-banner` |
     * | `/data/{index}/attributes/cause` | ascending | `cause` |
     * | `/data/{index}/attributes/cause` | descending | `-cause` |
     * | `/data/{index}/attributes/created_at` | ascending | `created_at` |
     * | `/data/{index}/attributes/created_at` | descending | `-created_at` |
     * | `/data/{index}/attributes/description` | ascending | `description` |
     * | `/data/{index}/attributes/description` | descending | `-description` |
     * | `/data/{index}/attributes/duration_certainty` | ascending | `duration_certainty` |
     * | `/data/{index}/attributes/duration_certainty` | descending | `-duration_certainty` |
     * | `/data/{index}/attributes/effect` | ascending | `effect` |
     * | `/data/{index}/attributes/effect` | descending | `-effect` |
     * | `/data/{index}/attributes/effect_name` | ascending | `effect_name` |
     * | `/data/{index}/attributes/effect_name` | descending | `-effect_name` |
     * | `/data/{index}/attributes/header` | ascending | `header` |
     * | `/data/{index}/attributes/header` | descending | `-header` |
     * | `/data/{index}/attributes/image` | ascending | `image` |
     * | `/data/{index}/attributes/image` | descending | `-image` |
     * | `/data/{index}/attributes/image_alternative_text` | ascending | `image_alternative_text` |
     * | `/data/{index}/attributes/image_alternative_text` | descending | `-image_alternative_text` |
     * | `/data/{index}/attributes/informed_entity` | ascending | `informed_entity` |
     * | `/data/{index}/attributes/informed_entity` | descending | `-informed_entity` |
     * | `/data/{index}/attributes/lifecycle` | ascending | `lifecycle` |
     * | `/data/{index}/attributes/lifecycle` | descending | `-lifecycle` |
     * | `/data/{index}/attributes/service_effect` | ascending | `service_effect` |
     * | `/data/{index}/attributes/service_effect` | descending | `-service_effect` |
     * | `/data/{index}/attributes/severity` | ascending | `severity` |
     * | `/data/{index}/attributes/severity` | descending | `-severity` |
     * | `/data/{index}/attributes/short_header` | ascending | `short_header` |
     * | `/data/{index}/attributes/short_header` | descending | `-short_header` |
     * | `/data/{index}/attributes/timeframe` | ascending | `timeframe` |
     * | `/data/{index}/attributes/timeframe` | descending | `-timeframe` |
     * | `/data/{index}/attributes/updated_at` | ascending | `updated_at` |
     * | `/data/{index}/attributes/updated_at` | descending | `-updated_at` |
     * | `/data/{index}/attributes/url` | ascending | `url` |
     * | `/data/{index}/attributes/url` | descending | `-url` |
     */
    sort?: string;
    /**
     * Fields to include with the response. Multiple fields **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Note that fields can also be selected for included data types: see the [V3 API Best Practices](https://www.mbta.com/developers/v3-api/best-practices) for an example.
     */
    "fields[alert]"?: string;
    /**
     * Relationships to include.
     *
     * * `stops`
     * * `routes`
     * * `trips`
     * * `facilities`
     *
     * The value of the include parameter **MUST** be a comma-separated (U+002C COMMA, ",") list of relationship paths. A relationship path is a dot-separated (U+002E FULL-STOP, ".") list of relationship names. [JSONAPI "include" behavior](http://jsonapi.org/format/#fetching-includes)
     *
     */
    include?: string;
    /**
     * Filter to alerts for only those activities (`/data/{index}/attributes/informed_entity/activities/{activity_index}`) matching.  Multiple activities
     * **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * An activity affected by an alert.
     *
     * | Value                | Description                                                                                                                                                                                                                                                                       |
     * |----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
     * | `"BOARD"`            | Boarding a vehicle. Any passenger trip includes boarding a vehicle and exiting from a vehicle.                                                                                                                                                                                    |
     * | `"BRINGING_BIKE"`    | Bringing a bicycle while boarding or exiting.                                                                                                                                                                                                                                     |
     * | `"EXIT"`             | Exiting from a vehicle (disembarking). Any passenger trip includes boarding a vehicle and exiting a vehicle.                                                                                                                                                                      |
     * | `"PARK_CAR"`         | Parking a car at a garage or lot in a station.                                                                                                                                                                                                                                    |
     * | `"RIDE"`             | Riding through a stop without boarding or exiting.. Not every passenger trip will include this -- a passenger may board at one stop and exit at the next stop.                                                                                                                    |
     * | `"STORE_BIKE"`       | Storing a bicycle at a station.                                                                                                                                                                                                                                                   |
     * | `"USING_ESCALATOR"`  | Using an escalator while boarding or exiting (should only be used for customers who specifically want to avoid stairs.)                                                                                                                                                           |
     * | `"USING_WHEELCHAIR"` | Using a wheelchair while boarding or exiting. Note that this applies to something that specifically affects customers who use a wheelchair to board or exit; a delay should not include this as an affected activity unless it specifically affects customers using wheelchairs.  |
     *
     *
     * ## Special Values
     *
     * * If the filter is not given OR it is empty, then defaults to ["BOARD", "EXIT", "RIDE"].
     * * If the value `"ALL"` is used then all alerts will be returned, not just those with the default activities.
     *
     * ## Accessibility
     *
     * The default activities cover if boarding, exiting, or riding is generally affected for all riders by the alert. If ONLY wheelchair using riders are affected, such as if a ramp, lift, or safety system for wheelchairs is affected, only the `"USING_WHEELCHAIR"` activity will be set. To cover wheelchair using rider, filter on the defaults and `"USING_WHEELCHAIR"`: `filter[activity]=USING_WHEELCHAIR,BOARD,EXIT,RIDE`.
     *
     * Similarly for riders with limited mobility that need escalators, `"USING_ESCALATOR"` should be added to the defaults: `filter[activity]=USING_ESCALATOR,BOARD,EXIT,RIDE`.
     */
    "filter[activity]"?: string;
    /**
     * Filter by route_type: https://gtfs.org/documentation/schedule/reference/#routestxt.
     *
     * Multiple `route_type` **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route_type]"?: string;
    /**
     * Filter by direction of travel along the route. Must be used in conjuction with `filter[route]` to apply.
     *
     * The meaning of `direction_id` varies based on the route. You can programmatically get the direction names from `/routes` `/data/{index}/attributes/direction_names` or `/routes/{id}` `/data/attributes/direction_names`.
     *
     *
     */
    "filter[direction_id]"?: string;
    /**
     * Filter by `/data/{index}/relationships/route/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[route]"?: string;
    /**
     * Filter by `/data/{index}/relationships/stop/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Parent station IDs are treated as though their child stops were also included. 
     */
    "filter[stop]"?: string;
    /**
     * Filter by `/data/{index}/relationships/trip/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[trip]"?: string;
    /**
     * Filter by `/data/{index}/relationships/facility/data/id`.
     *
     * Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     */
    "filter[facility]"?: string;
    /**
     * Filter by multiple IDs. Multiple IDs **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[id]"?: string;
    /**
     * When combined with other filters, filters by alerts with or without a banner. **MUST** be "true" or "false".
     */
    "filter[banner]"?: string;
    /**
     * Filter to alerts that are active at a given time (ISO8601 format).
     *
     * Additionally, the string "NOW" can be used to filter to alerts that are currently active.
     */
    "filter[datetime]"?: string;
    /**
     * Filters by an alert's lifecycle. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     */
    "filter[lifecycle]"?: string;
    /**
     * Filters alerts by list of severities. **MUST** be a comma-separated (U+002C COMMA, ",") list.
     *
     * Example: filter[severity]=3,4,10 returns alerts with severity levels 3, 4 and 10.
     */
    "filter[severity]"?: string;
}
class Client {
    readonly key: string | null;
    constructor(key?: string) {
        if (key !== undefined) {
            this.key = key;
        } else {
            this.key = null;
        }
    }

    #getRequest(endpoint: string, options?: RequestOptions) {
        const url = new URL(endpoint, BASE_URL);
        if (options?.query) {
            for (const key in options.query) {
                url.searchParams.append(key, options.query[key]);
            }
        }
        const headers = { ...options?.headers };
        if (this.key !== null) {
            headers['x-api-key'] = this.key;
        }
        return { url, headers };
    }
    async request(endpoint: string, options?: RequestOptions) {
        const { url, headers } = this.#getRequest(endpoint, options);
        headers['accept'] = 'application/vnd.api+json';
        const response = await fetch(url, { headers });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(await response.text());
        }
    }
    stream(endpoint: string, options?: RequestOptions) {
        const { url, headers } = this.#getRequest(endpoint, options);
        headers['accept'] = 'text/event-stream';
        const es = new EventSource(url, {
            fetch: (input, init) => fetch(input, { ...init, headers: { ...headers, ...init.headers } }),
        });
        return es;
    }
    /**
     * Single vehicle (bus, ferry, or train)
     * 
     * ## Direction
     * 
     * ### World
     * 
     * To figure out which way the vehicle is pointing at the location, use `/data/attributes/bearing`.  This can be the compass bearing, or the direction towards the next stop or intermediate location.
     * 
     * ### Trip
     * 
     * To get the direction around the stops in the trip use `/data/attributes/direction_id`.
     * 
     * ## Location
     * 
     * ### World
     * 
     * Use `/data/attributes/latitude` and `/data/attributes/longitude` to get the location of a vehicle.
     * 
     * ### Trip
     * 
     * Use `/data/attributes/current_stop_sequence` to get the stop number along the trip.  Useful for linear stop indicators.  Position relative to the current stop is in `/data/attributes/current_status`.
     * 
     * ## Movement
     * 
     * ### World
     * 
     * Use `/data/attributes/speed` to get the speed of the vehicle in meters per second.
     * 
     * @param id Unique identifier for a vehicle
     * @param options Options
     */
    async getVehicle(id: string, options?: getVehicleOptions): Promise<Vehicle> {
        return await this.request(`/vehicles/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List of vehicles (buses, ferries, and trains)
     * 
     * ## Direction
     * 
     * ### World
     * 
     * To figure out which way the vehicle is pointing at the location, use `/data/{index}/attributes/bearing`.  This can be the compass bearing, or the direction towards the next stop or intermediate location.
     * 
     * ### Trip
     * 
     * To get the direction around the stops in the trip use `/data/{index}/attributes/direction_id`.
     * 
     * ## Location
     * 
     * ### World
     * 
     * Use `/data/{index}/attributes/latitude` and `/data/{index}/attributes/longitude` to get the location of a vehicle.
     * 
     * ### Trip
     * 
     * Use `/data/{index}/attributes/current_stop_sequence` to get the stop number along the trip.  Useful for linear stop indicators.  Position relative to the current stop is in `/data/{index}/attributes/current_status`.
     * 
     * ## Movement
     * 
     * ### World
     * 
     * Use `/data/{index}/attributes/speed` to get the speed of the vehicle in meters per second.
     * 
     * @param options Options
     */
    async getVehicles(options?: getVehiclesOptions): Promise<Vehicles> {
        return await this.request('/vehicles', { query: options });
    }
    streamVehicles(options?: getVehiclesOptions): EventSource {
        return this.stream(`/vehicles`, { query: options })
    }
    /**
     * Single trip - the journey of a particular vehicle through a set of stops
     * 
     * ## Accessibility
     * 
     * Wheelchair accessibility (`/data/attributes/wheelchair_accessible`) [as defined in GTFS](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt):
     * 
     * | Value | Meaning                                            |
     * |-------|----------------------------------------------------|
     * | `0`   | No information                                     |
     * | `1`   | Accessible (at stops allowing wheelchair_boarding) |
     * | `2`   | Inaccessible                                       |
     * 
     * 
     * ## Grouping
     * 
     * Multiple trips **may** be grouped together using `/data/attributes/block_id`. A block represents a series of trips scheduled to be operated by the same vehicle.
     * 
     * ## Naming
     * 
     * There are 3 names associated with a trip.
     * 
     * | API Field                   | GTFS              | Show users? |
     * |-----------------------------|-------------------|-------------|
     * | `/data/attributes/headsign` | `trip_headsign`   | Yes         |
     * | `/data/attributes/name`     | `trip_short_name` | Yes         |
     * | `/data/id`                  | `trip_id`         | No          |
     * 
     * 
     * @param id Unique identifier for a trip
     * @param options Options
     */
    async getTrip(id: string, options?: getTripOptions): Promise<Trip> {
        return await this.request(`/trips/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * **NOTE:** A id, route, route_pattern, or name filter **MUST** be present for any trips to be returned.
     * 
     * List of trips, the journies of a particular vehicle through a set of stops on a primary `route` and zero or more alternative `route`s that can be filtered on.
     * 
     * ## Accessibility
     * 
     * Wheelchair accessibility (`/data/{index}/attributes/wheelchair_accessible`) [as defined in GTFS](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#tripstxt):
     * 
     * | Value | Meaning                                            |
     * |-------|----------------------------------------------------|
     * | `0`   | No information                                     |
     * | `1`   | Accessible (at stops allowing wheelchair_boarding) |
     * | `2`   | Inaccessible                                       |
     * 
     * 
     * ## Grouping
     * 
     * Multiple trips **may** be grouped together using `/data/{index}/attributes/block_id`. A block represents a series of trips scheduled to be operated by the same vehicle.
     * 
     * ## Naming
     * 
     * There are 3 names associated with a trip.
     * 
     * | API Field                   | GTFS              | Show users? |
     * |-----------------------------|-------------------|-------------|
     * | `/data/attributes/headsign` | `trip_headsign`   | Yes         |
     * | `/data/attributes/name`     | `trip_short_name` | Yes         |
     * | `/data/id`                  | `trip_id`         | No          |
     * 
     * 
     * @param options Options
     */
    async getTrips(options?: getTripsOptions): Promise<Trips> {
        return await this.request('/trips', { query: options });
    }
    streamTrips(options?: getTripsOptions): EventSource {
        return this.stream(`/trips`, { query: options })
    }
    /**
     * Detail for a specific stop.
     * 
     * ## Accessibility
     * 
     * Wheelchair boarding (`/data/attributes/wheelchair_boarding`) corresponds to [GTFS wheelchair_boarding](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt). The MBTA handles parent station inheritance itself, so value can be treated simply:
     * 
     * | Value | Meaning                                       |
     * |-------|-----------------------------------------------|
     * | `0`   | No Information                                |
     * | `1`   | Accessible (if trip is wheelchair accessible) |
     * | `2`   | Inaccessible                                  |
     * 
     * 
     * ## Location
     * 
     * ### World
     * 
     * Use `/data/attributes/latitude` and `/data/attributes/longitude` to get the location of a stop.
     * 
     * ### Entrance
     * 
     * The stop may be inside a station.  If `/data/relationships/parent_station/data/id` is present, you should look up the parent station (`/stops/{parent_id}`) and use its location to give direction first to the parent station and then route from there to the stop.
     * 
     * 
     * @param id Unique identifier for stop
     * @param options Options
     */
    async getStop(id: string, options?: getStopOptions): Promise<Stop> {
        return await this.request(`/stops/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List stops.
     * 
     * ## Accessibility
     * 
     * Wheelchair boarding (`/data/{index}/attributes/wheelchair_boarding`) corresponds to [GTFS wheelchair_boarding](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stopstxt). The MBTA handles parent station inheritance itself, so value can be treated simply:
     * 
     * | Value | Meaning                                       |
     * |-------|-----------------------------------------------|
     * | `0`   | No Information                                |
     * | `1`   | Accessible (if trip is wheelchair accessible) |
     * | `2`   | Inaccessible                                  |
     * 
     * 
     * ## Location
     * 
     * ### World
     * 
     * Use `/data/{index}/attributes/latitude` and `/data/{index}/attributes/longitude` to get the location of a stop.
     * 
     * ### Entrance
     * 
     * The stop may be inside a station.  If `/data/{index}/relationships/parent_station/data/id` is present, you should look up the parent station (`/stops/{parent_id}`) and use its location to give direction first to the parent station and then route from there to the stop.
     * 
     * 
     * 
     * ### Nearby
     * 
     * The `filter[latitude]` and `filter[longitude]` can be used together to find any stops near that latitude and longitude.  The distance is in degrees as if latitude and longitude were on a flat 2D plane and normal Pythagorean distance was calculated.  Over the region MBTA serves, `0.02` degrees is approximately `1` mile. How close is considered nearby, is controlled by `filter[radius]`, which default to `0.01` degrees (approximately a half mile).
     * @param options Options
     */
    async getStops(options?: getStopsOptions): Promise<Stops> {
        return await this.request('/stops', { query: options });
    }
    streamStops(options?: getStopsOptions): EventSource {
        return this.stream(`/stops`, { query: options })
    }
    /**
     * Detail of a particular shape.
     * 
     * ## Vertices
     * 
     * ### World
     * 
     * `/data/attributes/polyline` is in [Encoded Polyline Algorithm Format](https://developers.google.com/maps/documentation/utilities/polylinealgorithm), which encodes the latitude and longitude of a sequence of points in the shape.
     * 
     * @param id Unique identifier for shape
     * @param options Options
     */
    async getShape(id: string, options?: getShapeOptions): Promise<Shape> {
        return await this.request(`/shapes/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * **NOTE:** `filter[route]` **MUST** be given for any shapes to be returned.
     * 
     * List of shapes.
     * 
     * ## Vertices
     * 
     * ### World
     * 
     * `/data/{index}/attributes/polyline` is in [Encoded Polyline Algorithm Format](https://developers.google.com/maps/documentation/utilities/polylinealgorithm), which encodes the latitude and longitude of a sequence of points in the shape.
     * 
     * @param options Options
     */
    async getShapes(options: getShapesOptions): Promise<Shapes> {
        return await this.request('/shapes', { query: options });
    }
    streamShapes(options: getShapesOptions): EventSource {
        return this.stream(`/shapes`, { query: options })
    }
    /**
     * Single service, which represents the days of the week, as well as extra days, that a trip is valid.
     * @param id Unique identifier for a service
     * @param options Options
     */
    async getService(id: string, options?: getServiceOptions): Promise<Service> {
        return await this.request(`/services/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List of services. Service represents the days of the week, as well as extra days, that a trip is valid.
     * @param options Options
     */
    async getServices(options?: getServicesOptions): Promise<Services> {
        return await this.request('/services', { query: options });
    }
    streamServices(options?: getServicesOptions): EventSource {
        return this.stream(`/services`, { query: options })
    }
    /**
     * **NOTE:** `filter[route]`, `filter[stop]`, or `filter[trip]` **MUST** be present for any schedules to be returned.
     * 
     * List of schedules.  To get a realtime prediction instead of the scheduled times, use `/predictions`.
     * 
     * A schedule is the arrival drop off (`/data/{index}/attributes/drop_off_type`) time (`/data/{index}/attributes/arrival_time`) and departure pick up (`/data/{index}/attributes/pickup_type`) time (`/data/{index}/attributes/departure_time`) to/from a stop (`/data/{index}/relationships/stop/data/id`) at a given sequence (`/data/{index}/attributes/stop_sequence`) along a trip (`/data/{index}/relationships/trip/data/id`) going in a direction (`/data/{index}/attributes/direction_id`) on a route (`/data/{index}/relationships/route/data/id`) when the trip is following a service (`/data/{index}/relationships/service/data/id`) to determine when it is active.
     * 
     * See [GTFS `stop_times.txt`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#stop_timestxt) for base specification.
     * 
     * 
     * ## When a vehicle is scheduled to be at a stop
     * 
     * `/schedules?filter[stop]=STOP_ID`
     * 
     * ## The schedule for one route
     * 
     * `/schedules?filter[route]=ROUTE_ID`
     * 
     * ### When a route is open
     * 
     * Query for the `first` and `last` stops on the route.
     * 
     * `/schedules?filter[route]=ROUTE_ID&filter[stop_sequence]=first,last`
     * 
     * ## The schedule for a whole trip
     * 
     * `/schedule?filter[trip]=TRIP_ID`
     * 
     * @param options Options
     */
    async getSchedules(options?: getSchedulesOptions): Promise<Schedules> {
        return await this.request('/schedules', { query: options });
    }
    streamSchedules(options?: getSchedulesOptions): EventSource {
        return this.stream(`/schedules`, { query: options })
    }
    /**
     * Show a particular route by the route's id.
     * 
     * ## Names and Descriptions
     * 
     * There are 3 attributes with increasing details for naming and describing the route.
     * 
     * 1. `/data/attributes/short_name`
     * 2. `/data/attributes/long_name`
     * 3. `/data/attributes/description`
     * 
     * ## Directions
     * 
     * `/data/attributes/direction_names` is the only place to convert the `direction_id` used throughout the rest of the API to human-readable names.
     * 
     * ## Type
     * 
     * `/data/attributes/type` corresponds to [GTFS `routes.txt` `route_type`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt).
     * 
     * | Value | Name          | Example    |
     * |-------|---------------|------------|
     * | `0`   | Light Rail    | Green Line |
     * | `1`   | Heavy Rail    | Red Line   |
     * | `2`   | Commuter Rail |            |
     * | `3`   | Bus           |            |
     * | `4`   | Ferry         |            |
     * 
     * 
     * @param id Unique identifier for route
     * @param options Options
     */
    async getRoute(id: string, options?: getRouteOptions): Promise<Route> {
        return await this.request(`/routes/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List of routes.
     * 
     * ## Names and Descriptions
     * 
     * There are 3 attributes with increasing details for naming and describing the route.
     * 
     * 1. `/data/{index}/attributes/short_name`
     * 2. `/data/{index}/attributes/long_name`
     * 3. `/data/{index}/attributes/description`
     * 
     * ## Directions
     * 
     * `/data/{index}/attributes/direction_names` is the only place to convert the `direction_id` used throughout the rest of the API to human-readable names.
     * 
     * ## Type
     * 
     * `/data/{index}/attributes/type` corresponds to [GTFS `routes.txt` `route_type`](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md#routestxt).
     * 
     * | Value | Name          | Example    |
     * |-------|---------------|------------|
     * | `0`   | Light Rail    | Green Line |
     * | `1`   | Heavy Rail    | Red Line   |
     * | `2`   | Commuter Rail |            |
     * | `3`   | Bus           |            |
     * | `4`   | Ferry         |            |
     * 
     * 
     * @param options Options
     */
    async getRoutes(options?: getRoutesOptions): Promise<Routes> {
        return await this.request('/routes', { query: options });
    }
    streamRoutes(options?: getRoutesOptions): EventSource {
        return this.stream(`/routes`, { query: options })
    }
    /**
     * Show a particular route_pattern by the route's id.
     * 
     * Route patterns are used to describe the subsets of a route, representing different possible patterns of where trips may serve. For example, a bus route may have multiple branches, and each branch may be modeled as a separate route pattern per direction. Hierarchically, the route pattern level may be considered to be larger than the trip level and smaller than the route level.
     * 
     * For most MBTA modes, a route pattern will typically represent a unique set of stops that may be served on a route-trip combination. Seasonal schedule changes may result in trips within a route pattern having different routings. In simple changes, such a single bus stop removed or added between one schedule rating and the next (for example, between the Summer and Fall schedules), trips will be maintained on the same route_pattern_id. If the changes are significant, a new route_pattern_id may be introduced.
     * 
     * For Commuter Rail, express or skip-stop trips use the same route pattern as local trips. Some branches do have multiple route patterns when the train takes a different path. For example, `CR-Providence` has two route patterns per direction, one for the Wickford Junction branch and the other for the Stoughton branch.
     * 
     * @param id Unique identifier for route_pattern
     * @param options Options
     */
    async getRoutePattern(id: string, options?: getRoutePatternOptions): Promise<RoutePattern> {
        return await this.request(`/routepatterns/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List of route patterns.
     * 
     * Route patterns are used to describe the subsets of a route, representing different possible patterns of where trips may serve. For example, a bus route may have multiple branches, and each branch may be modeled as a separate route pattern per direction. Hierarchically, the route pattern level may be considered to be larger than the trip level and smaller than the route level.
     * 
     * For most MBTA modes, a route pattern will typically represent a unique set of stops that may be served on a route-trip combination. Seasonal schedule changes may result in trips within a route pattern having different routings. In simple changes, such a single bus stop removed or added between one schedule rating and the next (for example, between the Summer and Fall schedules), trips will be maintained on the same route_pattern_id. If the changes are significant, a new route_pattern_id may be introduced.
     * 
     * For Commuter Rail, express or skip-stop trips use the same route pattern as local trips. Some branches do have multiple route patterns when the train takes a different path. For example, `CR-Providence` has two route patterns per direction, one for the Wickford Junction branch and the other for the Stoughton branch.
     * 
     * @param options Options
     */
    async getRoutePatterns(options?: getRoutePatternsOptions): Promise<RoutePattern> {
        return await this.request('/routepatterns', { query: options });
    }
    streamRoutePatterns(options?: getRoutePatternsOptions): EventSource {
        return this.stream(`/routepatterns`, { query: options })
    }
    /**
     * **NOTE:** A filter **MUST** be present for any predictions to be returned.
     * 
     * List of predictions for trips.  To get the scheduled times instead of the predictions, use `/schedules`.
     * 
     * The predicted arrival time (`//data/{index}/attributes/arrival_time`) and departure time (`/data/{index}/attributes/departure_time`) to/from a stop (`/data/{index}/relationships/stop/data/id`) at a given sequence (`/data/{index}/attriutes/stop_sequence`) along a trip (`/data/{index}/relationships/trip/data/id`) going a direction (`/data/{index}/attributes/direction_id`) along a route (`/data/{index}/relationships/route/data/id`).
     * 
     * See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `TripDescriptor`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-tripdescriptor)
     * See [GTFS Realtime `FeedMesage` `FeedEntity` `TripUpdate` `StopTimeUpdate`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-stoptimeupdate)
     * 
     * 
     * ## When a vehicle is predicted to be at a stop
     * 
     * `/predictions?filter[stop]=STOP_ID`
     * 
     * ## The predicted schedule for one route
     * 
     * `/predictions?filter[route]=ROUTE_ID`
     * 
     * ## The predicted schedule for a whole trip
     * 
     * `/predictions?filter[trip]=TRIP_ID`
     * 
     * @param options Options
     */
    async getPredictions(options?: getPredictionsOptions): Promise<Predictions> {
        return await this.request('/predictions', { query: options });
    }
    streamPredictions(options?: getPredictionsOptions): EventSource {
        return this.stream(`/predictions`, { query: options })
    }
    /**
     * List live parking data for specific parking facility
     * 
     * Live data about a given facility.
     * 
     * @param id Unique identifier for facility
     * @param options Options
     */
    async getLiveFacility(id: string, options?: getLiveFacilityOptions): Promise<LiveFacility> {
        return await this.request(`/livefacilities/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * Live Facility Data
     * 
     * Live data about a given facility.
     * 
     * @param options Options
     */
    async getLiveFacilities(options?: getLiveFacilitiesOptions): Promise<LiveFacility> {
        return await this.request('/livefacilities', { query: options });
    }
    streamLiveFacilities(options?: getLiveFacilitiesOptions): EventSource {
        return this.stream(`/livefacilities`, { query: options })
    }
    /**
     * Single line, which represents a combination of routes.
     * @param id Unique identifier for a line
     * @param options Options
     */
    async getLine(id: string, options?: getLineOptions): Promise<Lines> {
        return await this.request(`/lines/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List of lines. A line is a combination of routes. This concept can be used to group similar routes when displaying them to customers, such as for routes which serve the same trunk corridor or bus terminal.
     * @param options Options
     */
    async getLines(options?: getLinesOptions): Promise<Lines> {
        return await this.request('/lines', { query: options });
    }
    streamLines(options?: getLinesOptions): EventSource {
        return this.stream(`/lines`, { query: options })
    }
    /**
     * Specific Escalator or Elevator
     * 
     * Amenities at a station stop (`/data/{index}/relationships/stop`) such as elevators, escalators, parking lots, and bike storage.
     * 
     * An [MBTA extension](https://groups.google.com/forum/#!topic/gtfs-changes/EzC5m9k45pA).  This spec is not yet finalized.
     * 
     * ## Accessibility
     * 
     * Riders with limited mobility can search any facility, either `ELEVATOR` or `ESCALATOR`, while riders that need wheelchair access can search for `ELEVATOR` only.
     * 
     * The lack of an `ELEVATOR` MAY NOT make a stop wheelchair inaccessible.  Riders should check `/stops/{id}` `/data/attributes/wheelchair_boarding` is `1` to guarantee a path is available from the station entrance to the stop or `0` if it MAY be accessible.  Completely avoid `2` as that is guaranteed to be INACCESSIBLE.
     * 
     * @param id Unique identifier for facility
     * @param options Options
     */
    async getFacility(id: string, options?: getFacilityOptions): Promise<Facility> {
        return await this.request(`/facilities/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List Escalators and Elevators
     * 
     * Amenities at a station stop (`/data/relationships/stop`) such as elevators, escalators, parking lots, and bike storage.
     * 
     * An [MBTA extension](https://groups.google.com/forum/#!topic/gtfs-changes/EzC5m9k45pA).  This spec is not yet finalized.
     * 
     * ## Accessibility
     * 
     * Riders with limited mobility can search any facility, either `ELEVATOR` or `ESCALATOR`, while riders that need wheelchair access can search for `ELEVATOR` only.
     * 
     * The lack of an `ELEVATOR` MAY NOT make a stop wheelchair inaccessible.  Riders should check `/stops/{id}` `/data/attributes/wheelchair_boarding` is `1` to guarantee a path is available from the station entrance to the stop or `0` if it MAY be accessible.  Completely avoid `2` as that is guaranteed to be INACCESSIBLE.
     * 
     * @param options Options
     */
    async getFacilities(options?: getFacilitiesOptions): Promise<Facilities> {
        return await this.request('/facilities', { query: options });
    }
    streamFacilities(options?: getFacilitiesOptions): EventSource {
        return this.stream(`/facilities`, { query: options })
    }
    /**
     * Show a particular alert by the alert's id
     * 
     * An effect (enumerated in `/data/attributes/effect` and human-readable in `/data/attributes/service_effect`) on a provided service (facility, route, route type, stop and/or trip in `//data/attributes/informed_entity`) described by a banner (`/data/attributes/banner`), short header (`/data/attributes/short_header`), header `/data/attributes/header`, description (`/data/attributes/description`), image (`/data/attributes/image`), and image alternative text (`/data/attributes/image_alternative_text`) that is active for one or more periods(`/data/attributes/active_period`) caused by a cause (`/data/attribute/cause`) that somewhere in its lifecycle (enumerated in `/data/attributes/lifecycle` and human-readable in `/data/attributes/timeframe`).
     * 
     * See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-alert)
     * 
     * ## Descriptions
     * 
     * There are 7 descriptive attributes.
     * 
     * | JSON pointer                                | Usage                                                                           |
     * |---------------------------------------------|---------------------------------------------------------------------------------|
     * | `/data/attributes/banner`       | Display as alert across application/website                                     |
     * | `/data/attributes/short_header` | When `/data/attributes/header` is too long to display               |
     * | `/data/attributes/header`       | Used before showing and prepended to `/data/attributes/description` |
     * | `/data/attributes/description`  | Used when user asks to expand alert.                                            |
     * | `/data/attributes/image`        | URL to descriptive image.                                                       |
     * | `/data/attributes/image_alternative_text`  | Text that describes image linked in url                              |
     * 
     * ## Effect
     * 
     * | JSON pointer                                  |                |
     * |-----------------------------------------------|----------------|
     * | `/data/attributes/effect`         | Enumerated     |
     * | `/data/attributes/service_effect` | Human-readable |
     * 
     * ## Timeline
     * 
     * There are 3 timeline related attributes
     * 
     * | JSON pointer                                 | Description                                                                              |
     * |----------------------------------------------|------------------------------------------------------------------------------------------|
     * | `/data/attributes/active_period` | Exact Date/Time ranges alert is active                                                   |
     * | `/data/attributes/lifecycle`     | Enumerated, machine-readable description of `/data/attributes/active_period` |
     * | `/data/attributes/timeframe`     | Human-readable description of `/data/attributes/active_period`               |
     * 
     * @param id Unique identifier for alert
     * @param options Options
     */
    async getAlert(id: string, options?: getAlertOptions): Promise<Alert> {
        return await this.request(`/alerts/${encodeURIComponent(id)}`, { query: options });
    }
    /**
     * List active and upcoming system alerts
     * 
     * An effect (enumerated in `/data/{index}/attributes/effect` and human-readable in `/data/{index}/attributes/service_effect`) on a provided service (facility, route, route type, stop and/or trip in `//data/{index}/attributes/informed_entity`) described by a banner (`/data/{index}/attributes/banner`), short header (`/data/{index}/attributes/short_header`), header `/data/{index}/attributes/header`, description (`/data/{index}/attributes/description`), image (`/data/{index}/attributes/image`), and image alternative text (`/data/{index}/attributes/image_alternative_text`) that is active for one or more periods(`/data/{index}/attributes/active_period`) caused by a cause (`/data/{index}/attribute/cause`) that somewhere in its lifecycle (enumerated in `/data/{index}/attributes/lifecycle` and human-readable in `/data/{index}/attributes/timeframe`).
     * 
     * See [GTFS Realtime `FeedMessage` `FeedEntity` `Alert`](https://github.com/google/transit/blob/master/gtfs-realtime/spec/en/reference.md#message-alert)
     * 
     * ## Descriptions
     * 
     * There are 7 descriptive attributes.
     * 
     * | JSON pointer                                | Usage                                                                           |
     * |---------------------------------------------|---------------------------------------------------------------------------------|
     * | `/data/{index}/attributes/banner`       | Display as alert across application/website                                     |
     * | `/data/{index}/attributes/short_header` | When `/data/{index}/attributes/header` is too long to display               |
     * | `/data/{index}/attributes/header`       | Used before showing and prepended to `/data/{index}/attributes/description` |
     * | `/data/{index}/attributes/description`  | Used when user asks to expand alert.                                            |
     * | `/data/{index}/attributes/image`        | URL to descriptive image.                                                       |
     * | `/data/{index}/attributes/image_alternative_text`  | Text that describes image linked in url                              |
     * 
     * ## Effect
     * 
     * | JSON pointer                                  |                |
     * |-----------------------------------------------|----------------|
     * | `/data/{index}/attributes/effect`         | Enumerated     |
     * | `/data/{index}/attributes/service_effect` | Human-readable |
     * 
     * ## Timeline
     * 
     * There are 3 timeline related attributes
     * 
     * | JSON pointer                                 | Description                                                                              |
     * |----------------------------------------------|------------------------------------------------------------------------------------------|
     * | `/data/{index}/attributes/active_period` | Exact Date/Time ranges alert is active                                                   |
     * | `/data/{index}/attributes/lifecycle`     | Enumerated, machine-readable description of `/data/{index}/attributes/active_period` |
     * | `/data/{index}/attributes/timeframe`     | Human-readable description of `/data/{index}/attributes/active_period`               |
     * 
     * 
     * ## Activities
     * 
     * Alerts are by default filtered to those where `/data/{index}/attributes/informed_entity/{informed_entity_index}/activities/{activity_index}` in one of BOARDEXITRIDE, as these cover most riders.  If you want all alerts without filtering by activity, you should use the special value `"ALL"`: `filter[activity]=ALL`.
     * 
     * ### Accessibility
     * 
     * The default activities cover if boarding, exiting, or riding is generally affected for all riders by the alert. If ONLY wheelchair using riders are affected, such as if a ramp, lift, or safety system for wheelchairs is affected, only the `"USING_WHEELCHAIR"` activity will be set. To cover wheelchair using rider, filter on the defaults and `"USING_WHEELCHAIR"`: `filter[activity]=USING_WHEELCHAIR,BOARD,EXIT,RIDE`.
     * 
     * Similarly for riders with limited mobility that need escalators, `"USING_ESCALATOR"` should be added to the defaults: `filter[activity]=USING_ESCALATOR,BOARD,EXIT,RIDE`.
     * 
     * @param options Options
     */
    async getAlerts(options?: getAlertsOptions): Promise<Alerts> {
        return await this.request('/alerts', { query: options });
    }
    streamAlerts(options?: getAlertsOptions): EventSource {
        return this.stream(`/alerts`, { query: options })
    }
}
export {
    ResourceMap,
    ResourceType,
    ResourceIdentifier,
    Resource,
    DataDocument,
    ErrorDocument,
    MetaDocument,
    Document,
    RouteType,
    ScheduleResource,
    TripResource,
    Facility,
    Stop,
    Facilities,
    ShapeResource,
    RouteResource,
    RoutePatterns,
    Vehicles,
    FacilityResource,
    AlertResource,
    Lines,
    BadRequest,
    InformedEntity,
    PredictionResource,
    StopResource,
    Schedules,
    LiveFacilityResource,
    Stops,
    Trip,
    NotFound,
    LiveFacility,
    Alert,
    Alerts,
    Services,
    FacilityProperty,
    Shapes,
    OccupancyResource,
    Route,
    Shape,
    VehicleResource,
    Forbidden,
    Predictions,
    ServiceResource,
    TooManyRequests,
    Trips,
    Routes,
    Service,
    Vehicle,
    RoutePatternResource,
    RoutePattern,
    NotAcceptable,
    LiveFacilities,
    ActivePeriod,
    Activity,
    LineResource,
    Line,
    RequestOptions,
    getVehicleOptions,
    getVehiclesOptions,
    getTripOptions,
    getTripsOptions,
    getStopOptions,
    getStopsOptions,
    getShapeOptions,
    getShapesOptions,
    getServiceOptions,
    getServicesOptions,
    getSchedulesOptions,
    getRouteOptions,
    getRoutesOptions,
    getRoutePatternOptions,
    getRoutePatternsOptions,
    getPredictionsOptions,
    getLiveFacilityOptions,
    getLiveFacilitiesOptions,
    getLineOptions,
    getLinesOptions,
    getFacilityOptions,
    getFacilitiesOptions,
    getAlertOptions,
    getAlertsOptions,
    Client
}