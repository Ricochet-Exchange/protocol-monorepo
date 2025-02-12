import SFError from "./SFError";
import { AllEvents, IEventFilter } from "./events";
import {
    IAccountTokenSnapshotFilter,
    IIndex,
    IIndexRequestFilter,
    IIndexSubscription,
    IIndexSubscriptionRequestFilter,
    ILightAccountTokenSnapshot,
    ILightEntity,
    IStream,
    IStreamRequestFilter,
    ISuperToken,
    ISuperTokenRequestFilter,
} from "./interfaces";
import { mapGetAllEventsQueryEvents } from "./mapGetAllEventsQueryEvents";
import { Ordering } from "./ordering";
import {
    createLastIdPaging,
    createPagedResult,
    createSkipPaging,
    PagedResult,
    Paging,
    takePlusOne,
} from "./pagination";
import { SubgraphClient } from "./subgraph/SubgraphClient";
import {
    GetAccountTokenSnapshotsDocument,
    GetAccountTokenSnapshotsQuery,
    GetAccountTokenSnapshotsQueryVariables,
} from "./subgraph/queries/getAccountTokenSnapshots.generated";
import {
    GetAllEventsDocument,
    GetAllEventsQuery,
    GetAllEventsQueryVariables,
} from "./subgraph/queries/getAllEvents.generated";
import {
    GetIndexSubscriptionsDocument,
    GetIndexSubscriptionsQuery,
    GetIndexSubscriptionsQueryVariables,
} from "./subgraph/queries/getIndexSubscriptions.generated";
import {
    GetIndexesDocument,
    GetIndexesQuery,
    GetIndexesQueryVariables,
} from "./subgraph/queries/getIndexes.generated";
import {
    GetStreamsDocument,
    GetStreamsQuery,
    GetStreamsQueryVariables,
} from "./subgraph/queries/getStreams.generated";
import {
    GetTokensDocument,
    GetTokensQuery,
    GetTokensQueryVariables,
} from "./subgraph/queries/getTokens.generated";
import {
    AccountTokenSnapshot_OrderBy,
    Event_OrderBy,
    Index_OrderBy,
    IndexSubscription_OrderBy,
    Stream_OrderBy,
    Token_OrderBy,
} from "./subgraph/schema.generated";
import { DataMode } from "./types";
import {
    validateAccountTokenSnapshotRequest,
    validateEventRequest,
    validateIndexRequest,
    validateIndexSubscriptionRequest,
    validateStreamRequest,
    validateSuperTokenRequest,
} from "./validation";

export interface IQueryOptions {
    readonly customSubgraphQueriesEndpoint: string;
    readonly dataMode: DataMode;
}

/**
 * @dev Query Helper Class
 * @description A helper class to create `Query` objects which can be used to query different data.
 */
export default class Query {
    options: IQueryOptions;
    private subgraphClient: SubgraphClient;

    constructor(options: IQueryOptions) {
        this.options = options;
        this.subgraphClient = new SubgraphClient(
            this.options.customSubgraphQueriesEndpoint
        );
    }

    /**
     * A recursive function to fetch all possible results of a paged query.
     * @param pagedQuery A paginated query that takes {@link Paging} as input.
     */
    listAllResults = async <T extends ILightEntity>(
        pagedQuery: (paging: Paging) => Promise<PagedResult<T>>
    ): Promise<T[]> => {
        const listAllRecursively = async (paging: Paging): Promise<T[]> => {
            const pagedResult = await pagedQuery(paging);
            if (!pagedResult.nextPaging) return pagedResult.data;
            const nextResults = await listAllRecursively(
                pagedResult.nextPaging
            );
            return pagedResult.data.concat(nextResults);
        };
        return listAllRecursively(createLastIdPaging({ take: 999 }));
    };

    listAllSuperTokens = async (
        filter: ISuperTokenRequestFilter,
        paging: Paging = createSkipPaging(),
        ordering: Ordering<Token_OrderBy> = {
            orderBy: "createdAtBlockNumber",
            orderDirection: "desc",
        }
    ): Promise<PagedResult<ISuperToken>> => {
        if (this.options.dataMode === "WEB3_ONLY") {
            throw new SFError({
                type: "UNSUPPORTED_WEB_3_ONLY",
                customMessage: "This query is not supported in WEB3_ONLY mode.",
            });
        }

        validateSuperTokenRequest(filter);

        const response = await this.subgraphClient.request<
            GetTokensQuery,
            GetTokensQueryVariables
        >(GetTokensDocument, {
            where: {
                isListed: filter.isListed,
                isSuperToken: true,
                id_gt: paging.lastId,
            },
            orderBy: ordering?.orderBy,
            orderDirection: ordering?.orderDirection,
            first: takePlusOne(paging),
            skip: paging.skip,
        });

        const mappedResult = response.result.map((x) =>
            typeGuard<ISuperToken>({
                ...x,
                createdAtTimestamp: Number(x.createdAtTimestamp),
                createdAtBlockNumber: Number(x.createdAtBlockNumber),
            })
        );

        return createPagedResult<ISuperToken>(mappedResult, paging);
    };

    listIndexes = async (
        filter: IIndexRequestFilter,
        paging: Paging = createSkipPaging(),
        ordering: Ordering<Index_OrderBy> = {
            orderBy: "createdAtBlockNumber",
            orderDirection: "desc",
        }
    ): Promise<PagedResult<IIndex>> => {
        if (this.options.dataMode === "WEB3_ONLY") {
            throw new SFError({
                type: "UNSUPPORTED_WEB_3_ONLY",
                customMessage: "This query is not supported in WEB3_ONLY mode.",
            });
        }

        validateIndexRequest(filter);

        const response = await this.subgraphClient.request<
            GetIndexesQuery,
            GetIndexesQueryVariables
        >(GetIndexesDocument, {
            where: {
                indexId: filter.indexId,
                publisher: filter.publisher?.toLowerCase(),
                token: filter.token?.toLowerCase(),
                id_gt: paging.lastId,
            },
            orderBy: ordering?.orderBy,
            orderDirection: ordering?.orderDirection,
            first: takePlusOne(paging),
            skip: paging.skip,
        });

        const mappedResult = response.result.map((x) =>
            typeGuard<IIndex>({
                ...x,
                publisher: x.publisher.id,
                createdAtTimestamp: Number(x.createdAtTimestamp),
                createdAtBlockNumber: Number(x.createdAtBlockNumber),
                updatedAtTimestamp: Number(x.updatedAtTimestamp),
                updatedAtBlockNumber: Number(x.updatedAtBlockNumber),
                token: {
                    ...x.token,
                    createdAtTimestamp: Number(x.token.createdAtTimestamp),
                    createdAtBlockNumber: Number(x.token.createdAtBlockNumber),
                },
            })
        );

        return createPagedResult<IIndex>(mappedResult, paging);
    };

    listIndexSubscriptions = async (
        filter: IIndexSubscriptionRequestFilter,
        paging: Paging = createSkipPaging(),
        ordering: Ordering<IndexSubscription_OrderBy> = {
            orderBy: "createdAtBlockNumber",
            orderDirection: "desc",
        }
    ): Promise<PagedResult<IIndexSubscription>> => {
        if (this.options.dataMode === "WEB3_ONLY") {
            throw new SFError({
                type: "UNSUPPORTED_WEB_3_ONLY",
                customMessage: "This query is not supported in WEB3_ONLY mode.",
            });
        }

        validateIndexSubscriptionRequest(filter);

        const response = await this.subgraphClient.request<
            GetIndexSubscriptionsQuery,
            GetIndexSubscriptionsQueryVariables
        >(GetIndexSubscriptionsDocument, {
            where: {
                subscriber: filter.subscriber?.toLowerCase(),
                approved: filter.approved,
                id_gt: paging.lastId,
            },
            orderBy: ordering?.orderBy,
            orderDirection: ordering?.orderDirection,
            first: takePlusOne(paging),
            skip: paging.skip,
        });

        const mappedResult = response.result.map((x) =>
            typeGuard<IIndexSubscription>({
                ...x,
                subscriber: x.subscriber.id,
                createdAtTimestamp: Number(x.createdAtTimestamp),
                createdAtBlockNumber: Number(x.createdAtBlockNumber),
                updatedAtTimestamp: Number(x.updatedAtTimestamp),
                updatedAtBlockNumber: Number(x.updatedAtBlockNumber),
                index: {
                    ...x.index,
                    token: {
                        ...x.index.token,
                        createdAtTimestamp: Number(
                            x.index.token.createdAtTimestamp
                        ),
                        createdAtBlockNumber: Number(
                            x.index.token.createdAtBlockNumber
                        ),
                    },
                },
            })
        );

        return createPagedResult<IIndexSubscription>(mappedResult, paging);
    };

    listStreams = async (
        filter: IStreamRequestFilter,
        paging: Paging = createSkipPaging(),
        ordering: Ordering<Stream_OrderBy> = {
            orderBy: "createdAtBlockNumber",
            orderDirection: "desc",
        }
    ): Promise<PagedResult<IStream>> => {
        if (this.options.dataMode === "WEB3_ONLY") {
            throw new SFError({
                type: "UNSUPPORTED_WEB_3_ONLY",
                customMessage: "This query is not supported in WEB3_ONLY mode.",
            });
        }

        validateStreamRequest(filter);

        const response = await this.subgraphClient.request<
            GetStreamsQuery,
            GetStreamsQueryVariables
        >(GetStreamsDocument, {
            where: {
                sender: filter.sender?.toLowerCase(),
                receiver: filter.receiver?.toLowerCase(),
                token: filter.token?.toLowerCase(),
                id_gt: paging.lastId,
            },
            orderBy: ordering?.orderBy,
            orderDirection: ordering?.orderDirection,
            first: takePlusOne(paging),
            skip: paging.skip,
        });

        const mappedResult = response.result.map((x) =>
            typeGuard<IStream>({
                ...x,
                sender: x.sender.id,
                receiver: x.receiver.id,
                createdAtTimestamp: Number(x.createdAtTimestamp),
                createdAtBlockNumber: Number(x.createdAtBlockNumber),
                updatedAtTimestamp: Number(x.updatedAtTimestamp),
                updatedAtBlockNumber: Number(x.updatedAtBlockNumber),
                token: {
                    ...x.token,
                    createdAtTimestamp: Number(x.token.createdAtTimestamp),
                    createdAtBlockNumber: Number(x.token.createdAtBlockNumber),
                },
                flowUpdatedEvents: x.flowUpdatedEvents.map((y) => ({
                    ...y,
                    blockNumber: Number(y.blockNumber),
                    timestamp: Number(y.timestamp),
                })),
            })
        );

        return createPagedResult<IStream>(mappedResult, paging);
    };

    listUserInteractedSuperTokens = async (
        filter: IAccountTokenSnapshotFilter,
        paging: Paging = createSkipPaging(),
        ordering: Ordering<AccountTokenSnapshot_OrderBy> = {
            orderBy: "updatedAtBlockNumber",
            orderDirection: "desc",
        }
    ): Promise<PagedResult<ILightAccountTokenSnapshot>> => {
        if (this.options.dataMode === "WEB3_ONLY") {
            throw new SFError({
                type: "UNSUPPORTED_WEB_3_ONLY",
                customMessage: "This query is not supported in WEB3_ONLY mode.",
            });
        }

        validateAccountTokenSnapshotRequest(filter);

        const response = await this.subgraphClient.request<
            GetAccountTokenSnapshotsQuery,
            GetAccountTokenSnapshotsQueryVariables
        >(GetAccountTokenSnapshotsDocument, {
            where: {
                account: filter.account?.toLowerCase(),
                token: filter.token?.toLowerCase(),
                id_gt: paging.lastId,
            },
            orderBy: ordering?.orderBy,
            orderDirection: ordering?.orderDirection,
            first: takePlusOne(paging),
            skip: paging.skip,
        });

        const mappedResult = response.result.map((x) =>
            typeGuard<ILightAccountTokenSnapshot>({
                ...x,
                account: x.account.id,
                updatedAtTimestamp: Number(x.updatedAtTimestamp),
                updatedAtBlockNumber: Number(x.updatedAtBlockNumber),
                token: {
                    ...x.token,
                    createdAtTimestamp: Number(x.token.createdAtTimestamp),
                    createdAtBlockNumber: Number(x.token.createdAtBlockNumber),
                },
            })
        );

        return createPagedResult<ILightAccountTokenSnapshot>(
            mappedResult,
            paging
        );
    };

    listEvents = async (
        filter: IEventFilter,
        paging: Paging = createSkipPaging(),
        ordering: Ordering<Event_OrderBy> = {
            orderBy: "blockNumber",
            orderDirection: "desc",
        }
    ): Promise<PagedResult<AllEvents>> => {
        if (this.options.dataMode === "WEB3_ONLY") {
            throw new SFError({
                type: "UNSUPPORTED_WEB_3_ONLY",
                customMessage: "This query is not supported in WEB3_ONLY mode.",
            });
        }

        validateEventRequest(filter);

        const response = await this.subgraphClient.request<
            GetAllEventsQuery,
            GetAllEventsQueryVariables
        >(GetAllEventsDocument, {
            orderBy: ordering?.orderBy,
            orderDirection: ordering?.orderDirection,
            where: {
                addresses_contains: filter.account
                    ? [filter.account?.toLowerCase()]
                    : undefined,
                timestamp_gt: filter.timestamp_gt?.toString(),
                id_gt: paging.lastId,
            },
            first: takePlusOne(paging),
            skip: paging.skip,
        });

        return createPagedResult<AllEvents>(
            mapGetAllEventsQueryEvents(response),
            paging
        );
    };

    // TODO(KK): error callback?
    // TODO(KK): retries?
    // TODO(KK): tests
    on(
        callback: (events: AllEvents[], unsubscribe: () => void) => void,
        ms: number,
        account?: string,
        timeout?: number
    ): () => void {
        if (ms < 1000) throw Error("Let's not go crazy with the queries...");

        // Account for the fact that Subgraph has lag and will insert events with the timestamp of the event from blockchain.
        const clockSkew = 25000;

        // Convert millisecond-based time to second-based time (which Subgraph uses).
        let eventQueryTimestamp = Math.floor(
            (new Date().getTime() - clockSkew) / 1000
        );

        let isUnsubscribed = false;
        const unsubscribe = () => {
            isUnsubscribed = true;
        };

        const pollingStep = async () => {
            if (isUnsubscribed) {
                return;
            }

            const allEvents = await this.listAllResults((paging) =>
                this.listEvents(
                    {
                        account: account,
                        timestamp_gt: eventQueryTimestamp,
                    },
                    paging,
                    {
                        orderBy: "timestamp",
                        orderDirection: "asc",
                    }
                )
            );

            if (allEvents.length) {
                callback(allEvents, unsubscribe);
                // Filter next events by last timestamp of an event.
                // NOTE: Make sure to order events by timestamp in ascending order.
                const lastEvent = allEvents.slice(-1)[0];
                // Next event polling is done for events that have a timestamp later than the current latest event.
                eventQueryTimestamp = lastEvent!.timestamp;
            }

            // This solution sets the interval based on last query returning, opposed to not taking request-response cycles into account at all.
            // This solution is more friendly to the Subgraph & more effective resource-wise with slow internet.
            return setTimeout(() => {
                // Fire and forget
                pollingStep();
            }, ms);
        };

        if (timeout) {
            setTimeout(() => {
                unsubscribe();
            }, timeout);
        }

        // Fire and forget
        pollingStep();

        return unsubscribe;
    }
}

// Why? Because `return obj as T` and `return <T>obj` are not safe type casts.
const typeGuard = <T>(obj: T) => obj;
