
// Undocumented (but exposed) vue method for making properties reactive.
declare module "vue/types/vue" {
    interface VueConstructor<V extends Vue = Vue> {
        util: {
            defineReactive: (obj: any, key: string, val: any, setter: Function | null, shallow: boolean) => void
        }
    }
}

// Works around https://github.com/axios/axios/issues/1365 (PR https://github.com/axios/axios/pull/1401)
declare module "axios" {
    export interface AxiosInstance {
      delete<T = any>(url: string, config?: AxiosRequestConfig): AxiosPromise<T>;
      head<T = any>(url: string, config?: AxiosRequestConfig): AxiosPromise<T>;
    }
  }

import { ModelType, ClassType, Method, Service, ApiRoutedType, DataSourceType, Value, ModelValue, CollectionValue, VoidValue } from './metadata'
import { Model, convertToModel, mapToDto, mapValueToDto, DataSource, convertValueToModel } from './model'
import { OwnProps, Indexable } from './util'

import axios, { AxiosPromise, AxiosResponse, AxiosError, AxiosRequestConfig, Canceler, CancelTokenSource, CancelToken, AxiosInstance, Cancel} from 'axios'
import * as qs from 'qs'
import Vue from 'vue';


/* Api Response Objects */

export interface ApiResult {
    wasSuccessful: boolean
    message?: string
}

export interface ValidationIssue {
    property: string
    issue: string
}

export interface ItemResult<T = any> extends ApiResult {
    object?: T
    validationIssues?: ValidationIssue[]
}

export interface ListResult<T = any> extends ApiResult {
    list?: T[]
    page: number
    pageSize: number
    pageCount: number
    totalCount: number
}


/* Api Parameter Objects */

export interface DataSourceParameters {
    includes?: string
    dataSource?: DataSource<DataSourceType>
}
export interface FilterParameters extends DataSourceParameters {
    search?: string
    filter?: { [fieldName: string]: string }
}
export interface ListParameters extends FilterParameters {
    page?: number
    pageSize?: number
    orderBy?: string
    orderByDescending?: string
    fields?: string[]
}

export type ApiResponse<T> = Promise<AxiosResponse<T>>
export type AxiosItemResult<T> = AxiosResponse<ItemResult<T>>
export type AxiosListResult<T> = AxiosResponse<ListResult<T>>
export type ItemResultPromise<T> = Promise<AxiosResponse<ItemResult<T>>>
export type ListResultPromise<T> = Promise<AxiosResponse<ListResult<T>>>
// ApiResultPromise must be the inner union of the promise types, not the outer union of two promises.
// Otherwise, typescript doesn't like us calling a function with a union return type. For some reason.
export type ApiResultPromise<T> = Promise<AxiosItemResult<T> | AxiosListResult<T>>

/** Axios instance to be used by all Coalesce API requests. Can be configured as needed. */
export const AxiosClient = axios.create()
AxiosClient.defaults.baseURL = '/api'

export type ItemApiReturnType<T extends (this: null, ...args: any[]) => ItemResultPromise<any>> 
    = ReturnType<T> extends void ? void
    : ReturnType<T> extends ItemResultPromise<infer R> ? R 
    : any;

export type ListApiReturnType<T extends (this: null, ...args: any[]) => ListResultPromise<any>> 
    = ReturnType<T> extends ListResultPromise<infer S> ? S
    : any;

type AnyApiReturnType<T extends (this: null, ...args: any[]) => ApiResultPromise<any>> 
    = ReturnType<T> extends ApiResultPromise<infer S> ? S : any;

export type ApiCallerConcurrency = "cancel" | "disallow" | "allow"

export class ApiClient<T extends ApiRoutedType> {

    constructor(public $metadata: T) {
    }

    /** Cancellation token to inject into the next request. */
    private _nextCancelToken: CancelTokenSource | null = null

    /**
     * Create a wrapper function for an API call. This function maintains properties which represent the state of its previous invocation.
     * @param resultType "item" indicating that the API endpoint returns an ItemResult<T>
     * @param invokerFactory method that will return a function that can be used to call the API. The signature of the returned function will be the call signature of the wrapper.
     */
    $makeCaller<TCall extends (this: any, ...args: any[]) => ItemResultPromise<any>>(
        resultType: "item",
        invokerFactory: (client: this) => TCall
    ): ItemApiState<TCall, ItemApiReturnType<TCall>> & TCall

    /**
     * Create a wrapper function for an API call. This function maintains properties which represent the state of its previous invocation.
     * @param resultType "list" indicating that the API endpoint returns an ListResult<T>
     * @param invokerFactory method that will return a function that can be used to call the API. The signature of the returned function will be the call signature of the wrapper.
     */
    $makeCaller<TCall extends (this: any, ...args: any[]) => ListResultPromise<any>>(
        resultType: "list",
        invokerFactory: (client: this) => TCall
    ): ListApiState<TCall, ListApiReturnType<TCall>> & TCall
    
    $makeCaller<TCall extends (this: any, ...args: any[]) => Promise<AxiosResponse<ApiResult>>>(
        resultType: "item" | "list", // TODO: Eventually this should be replaced with a metadata object I think
        invokerFactory: (client: this) => TCall
    ): ApiState<TCall, AnyApiReturnType<TCall>> & TCall
    {
        type TResult = AnyApiReturnType<TCall>;
        
        var instance: ApiState<TCall, TResult>;
        switch (resultType){
            case "item": 
                instance = new ItemApiState<TCall, TResult>(this, invokerFactory(this));
                break;
            // Typescript is unhappy with giving TCall to ListApiState. No idea why, since the item one is fine.
            case "list": 
                instance = new ListApiState<any, TResult>(this, invokerFactory(this));
                break;
            default: throw `Unknown result type ${resultType}`
        }
        
        return instance as any;
    }

    /**
     * Maps the given method parameters to values suitable for transport.
     * @param method The method whose parameters need mapping
     * @param params The values of the parameter to map
     */
    protected $mapParams(
        method: Method,
        params: { [paramName: string]: any }
    ) {
        const formatted: { [paramName: string]: any } = {};
        for (var paramName in params) {
            const paramMeta = method.params[paramName];
            const paramValue = params[paramName];
            formatted[paramName] = mapValueToDto(params[paramName], paramMeta)
        }
        return formatted;
    }

    /**
     * Combines the input into a single `AxiosRequestConfig` object.
     * @param parameters The Coalesce parameters for the standard API endpoints.
     * @param config A full `AxiosRequestConfig` to merge in.
     * @param queryParams An object with an additional querystring parameters.
     */
    protected $options(
        parameters?: ListParameters | FilterParameters | DataSourceParameters, 
        config?: AxiosRequestConfig,
        queryParams?: any
    ): AxiosRequestConfig {
        // Merge standard Coalesce params with general configured params if there are any.
        var mergedParams: any = Object.assign({}, 
            queryParams,
            config && config.params ? config.params : null, 
            this.$serializeParams(parameters)
        )

        // Params come last to overwrite config.params with our merged params object.
        return Object.assign({}, 
            { cancelToken: this._nextCancelToken && this._nextCancelToken.token }, 
            config, 
            { params: mergedParams }
        )
    }

    private $serializeParams(parameters?: ListParameters | FilterParameters | DataSourceParameters) {
        if (!parameters) return null

        // Assume the widest type, which is ListParameters.
        var wideParams = parameters as Partial<ListParameters>;

        // The list of 'simple' params where we just pass along the exact value.
        var simpleParams = [
            'includes', 'search', 'page', 'pageSize', 'orderBy', 'orderByDescending'
        ] as Array<keyof typeof wideParams>;
        
        // Map all the simple params to `paramsObject`
        var paramsObject = simpleParams.reduce((obj, key) => {
            if (key in wideParams) obj[key] = wideParams[key];
            return obj;
        }, {} as any);

        // Map the 'filter' object, ensuring all values are strings.
        const filter = wideParams.filter;
        if (typeof filter == 'object') {
            for (var key in filter) {
                if (filter[key] !== undefined) {
                    paramsObject["filter." + key] = filter[key];
                }
            }
        }

        if (Array.isArray(wideParams.fields)) {
            paramsObject.fields = wideParams.fields.join(',')
        }

        // Map the data source and its params
        const dataSource = wideParams.dataSource as Indexable<typeof wideParams.dataSource>
        if (dataSource) {
            // Add the data source name
            paramsObject["dataSource"] = dataSource.$metadata.name;
            var paramsMeta = dataSource.$metadata.params;

            // Add the data source parameters.
            // Note that we use "dataSource.{paramName}", not a nested object. 
            // This is what the model binder expects.
            for (var paramName in paramsMeta) {
                const paramMeta = paramsMeta[paramName];
                if (paramName in dataSource) {
                    const paramValue = dataSource[paramName];
                    paramsObject["dataSource." + paramMeta.name] = mapValueToDto(paramValue, paramMeta)
                }
            }
        }

        return paramsObject;
    }

    protected $hydrateItemResult<TResult>(value: AxiosItemResult<TResult>, metadata: Value | VoidValue) {
        // Do nothing for void returns - there will be no object.
        if (metadata.type !== "void") {
            // This function is NOT PURE - we mutate the result object on the response.
            value.data.object = convertValueToModel(value.data.object, metadata)
        }
        return value;
    }

    protected $hydrateListResult<TResult>(value: AxiosListResult<TResult>, metadata: CollectionValue) {
        // This function is NOT PURE - we mutate the result object on the response.
        value.data.list = convertValueToModel(value.data.list, metadata)
        return value;
    }
}

export class ModelApiClient<TModel extends Model<ModelType>> extends ApiClient<TModel["$metadata"]> {

    // TODO: should the standard set of endpoints be prefixed with '$'?

    public get(id: string | number, parameters?: DataSourceParameters, config?: AxiosRequestConfig) {
        return AxiosClient
            .get(
                `/${this.$metadata.controllerRoute}/get/${id}`, 
                this.$options(parameters, config)
            )
            .then<AxiosItemResult<TModel>>(r => this.$hydrateItemResult(r, this.$itemValueMeta))
    }
    
    public list(parameters?: ListParameters, config?: AxiosRequestConfig) {
        return AxiosClient
            .get(
                `/${this.$metadata.controllerRoute}/list`, 
                this.$options(parameters, config)
            )
            .then<AxiosListResult<TModel>>(r => this.$hydrateListResult(r, this.$collectionValueMeta))
    }
    
    public count(parameters?: FilterParameters, config?: AxiosRequestConfig) {
        return AxiosClient
            .get<ItemResult<number>>(
                `/${this.$metadata.controllerRoute}/count`, 
                this.$options(parameters, config)
            )
    }
    
    public save(item: TModel, parameters?: DataSourceParameters, config?: AxiosRequestConfig) {
        return AxiosClient
            .post(
                `/${this.$metadata.controllerRoute}/save`,
                qs.stringify(mapToDto(item)),
                this.$options(parameters, config)
            )
            .then<AxiosItemResult<TModel>>(r => this.$hydrateItemResult(r, this.$itemValueMeta))
    }
    
    public delete(id: string | number, parameters?: DataSourceParameters, config?: AxiosRequestConfig) {
        return AxiosClient
            .post(
                `/${this.$metadata.controllerRoute}/delete/${id}`,
                null,
                this.$options(parameters, config)
            )
            .then<AxiosItemResult<TModel>>(r => this.$hydrateItemResult(r, this.$itemValueMeta))
    }
    
    /** Value metadata for handling ItemResult returns from the standard API endpoints. */
    private $itemValueMeta = Object.freeze(<ModelValue>{
        name: "object", displayName: "",
        type: "model",
        role: "value",
        typeDef: this.$metadata,
    })

    /** Value metadata for handling ListResult returns from the standard API endpoints. */
    private $collectionValueMeta = Object.freeze(<CollectionValue>{
        name: "list", displayName: "",
        type: "collection",
        role: "value",
        itemType: this.$itemValueMeta,
    })
}

export abstract class ServiceApiClient<TMeta extends Service> extends ApiClient<TMeta> {
    
}

export abstract class ApiState<TCall extends (this: null, ...args: any[]) => ApiResultPromise<TResult>, TResult> extends Function {

    /** True if a request is currently pending. */
    isLoading: boolean = false
    
    /** True if the previous request was successful. */
    wasSuccessful: boolean | null = null
    
    /** Error message returned by the previous request. */
    message: string | null = null

    private _concurrencyMode: ApiCallerConcurrency = "disallow"

    /** 
     * Function that can be called to cancel a pending request.
    */
    cancel() {
        if (this._cancelToken) {
            this._cancelToken.cancel();
            this.isLoading = false;
        }
    }

    /**
     * Set the concurrency mode for this API caller. Default is "disallow".
     * @param mode Behavior for when a request is made while there is already an outstanding request.
     * 
     * "cancel" - cancel the outstanding request first. 
     * 
     * "disallow" - throw an error. 
     * 
     * "allow" - permit the second request to be made. The ultimate state of the state fields may not be representative of the last request made.
     */
    setConcurrency(mode: ApiCallerConcurrency) {
        this._concurrencyMode = mode;
        return this;
    }

    // Undefined initially to prevent unneeded reactivity
    private _cancelToken: CancelTokenSource | undefined;

    // Frozen to prevent unneeded reactivity.
    private _callbacks = Object.freeze<{
        onFulfilled: Array<Function>, 
        onRejected: Array<Function>
    }>({onFulfilled: [], onRejected: []})

    /**
     * Attach a callback to be invoked when the request to this endpoint succeeds.
     * @param onFulfilled A callback to be called when a request to this endpoint succeeds.
     */
    onFulfilled(callback: (this: any, state: this) => void): this {
        this._callbacks.onFulfilled.push(callback)
        return this;
    }

    /**
     * Attach a callback to be invoked when the request to this endpoint fails.
     * @param onFulfilled A callback to be called when a request to this endpoint fails.
     */
    onRejected(callback: (this: any, state: this) => void): this {
        this._callbacks.onRejected.push(callback)
        return this;
    }

    protected abstract setResponseProps(data: ApiResult): void

    public invoke!: TCall

    private _invokeInternal(thisArg: any, args: IArguments) {
        if (this.isLoading) {
            if (this._concurrencyMode === "disallow") {
                throw `Request is already pending for invoker ${this.invoker.toString()}`
            } else if (this._concurrencyMode === "cancel") {
                this.cancel()
            }
        }


        // Change no state except `isLoading` until after the promise is resolved.
        // this.wasSuccessful = null
        // this.message = null
        this.isLoading = true

        // Inject a cancellation token into the request.
        var promise: ApiResultPromise<TResult>
        try {
            const token = (this.apiClient as any)._nextCancelToken = axios.CancelToken.source()
            this._cancelToken = token
            promise = this.invoker.apply(thisArg, args)
        } finally {
            (this.apiClient as any)._nextCancelToken = null
        }

        return promise
            .then(resp => {
                const data = resp.data
                delete this._cancelToken
                this.setResponseProps(data)

                this._callbacks.onFulfilled.forEach(cb => cb.apply(thisArg, [this]))

                this.isLoading = false

                // We have to maintain the shape of the promise of the stateless invoke method.
                // This means we can't re-shape ourselves into a Promise<ApiState<T>> with `return fn` here.
                // The reason for this is that we can't change the return type of TCall while maintaining 
                // the param signature (unless we required a full, explicit type annotation as a type parameter,
                // but this would make the usability of apiCallers very unpleasant.)
                // We could do this easily with https://github.com/Microsoft/TypeScript/issues/5453,
                // but changing the implementation would be a significant breaking change by then.
                return resp
            }, (thrown: AxiosError | Cancel) => {
                if (axios.isCancel(thrown)) {
                    // No handling of anything for cancellations.
                    // A cancellation is deliberate and shouldn't be treated as an error state. Callbacks should not be called either - pretend the request never happened.
                    // If a compelling case for invoking callbacks on cancel is found,
                    // it should probably be implemented as a separate set of callbacks.
                    // We don't set isLoading to false here - we set it in the cancel() method to ensure that we don't set isLoading=false for a subsequent call,
                    // since the promise won't reject immediately after requesting cancelation. There could already be another request pending when this code is being executed.
                    return;
                } else {
                    var error = thrown as AxiosError;
                }

                delete this._cancelToken
                this.wasSuccessful = false
                const result = error.response as AxiosResponse<ListResult<TResult> | ItemResult<TResult>> | undefined
                if (result && typeof result.data === "object") {
                    this.setResponseProps(result.data)
                } else {
                    this.message = 
                        typeof error.message === "string" ? error.message : 
                        typeof error === "string" ? error :
                        "A network error occurred" // TODO: i18n
                }

                this._callbacks.onRejected.forEach(cb => cb.apply(thisArg, [this]))

                this.isLoading = false

                return error
            })
    }

    protected _makeReactive() {
        // Make properties reactive. Works around https://github.com/vuejs/vue/issues/6648 
        for (const stateProp in this) {
            const value = this[stateProp]
            // Don't define sealed object properties (e.g. this._callbacks)
            if (value == null || typeof value !== "object" || !Object.isSealed(value)) {
                Vue.util.defineReactive(this, stateProp, this[stateProp], null, true)
            }
        }
    }

    constructor(
        private readonly apiClient: ApiClient<any>,
        private readonly invoker: TCall
    ) { 
        super();
        
        // Create our invoker function that will ultimately be our instance object.
        const invokeFunc: TCall = function invokeFunc() {
            return invoke._invokeInternal(this, arguments);
        } as TCall
        // Copy all properties from the class to the function.
        const invoke = Object.assign(invokeFunc, this);
        invoke.invoke = invoke;

        Object.setPrototypeOf(invoke, new.target.prototype);
        return invoke
    }
}

export class ItemApiState<TCall extends (this: null, ...args: any[]) => ItemResultPromise<TResult>, TResult> extends ApiState<TCall, TResult> {
    /** Validation issues returned by the previous request. */
    validationIssues: ValidationIssue[] | null = null

    /** Principal data returned by the previous request. */
    result: TResult | null = null

    constructor(
        apiClient: ApiClient<any>,
        invoker: TCall) 
    {
        super(apiClient, invoker);
        this._makeReactive();
    }

    protected setResponseProps(data: ItemResult<TResult>) {
        this.wasSuccessful = data.wasSuccessful
        this.message = data.message || null

        if ("validationIssues" in data) {
            this.validationIssues = data.validationIssues || null;
        } else {
            this.validationIssues = null;
        }
        if ("object" in data) {
            this.result = data.object || null
        } else {
            this.result = null
        }
    }
}

export class ListApiState<TCall extends (this: null, ...args: any[]) => ListResultPromise<TResult>, TResult> extends ApiState<TCall, TResult> {
    /** Page number returned by the previous request. */
    page: number | null = null
    /** Page size returned by the previous request. */
    pageSize: number | null = null
    /** Page count returned by the previous request. */
    pageCount: number | null = null
    /** Total Count returned by the previous request. */
    totalCount: number | null = null

    /** Principal data returned by the previous request. */
    result: TResult[] | null = null

    constructor(
        apiClient: ApiClient<any>,
        invoker: TCall) 
    {
        super(apiClient, invoker);
        this._makeReactive();
    }

    protected setResponseProps(data: ListResult<TResult>) {
        this.wasSuccessful = data.wasSuccessful
        this.message = data.message || null

        this.page = data.page
        this.pageSize = data.pageSize
        this.pageCount = data.pageCount
        this.totalCount = data.totalCount

        if ("list" in data) {
            this.result = data.list || []
        } else {
            this.result = null
        }
    }
}