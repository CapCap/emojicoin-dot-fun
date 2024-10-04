if (process.env.NODE_ENV !== "test") {
  require("server-only");
}

import { LIMIT, ORDER_BY } from "../../../queries";
import { type AnyNumberString } from "../../../types";
import { type DatabaseJsonType, TableName } from "../../types/json-types";
import { postgrest, toQueryArray } from "../client";
import { queryHelper, queryHelperSingle } from "../utils";
import { toChatEventModel, toMarketStateModel, toSwapEventModel } from "../../types";
import { type PeriodicStateEventQueryArgs, type MarketStateQueryArgs } from "../../types/common";
import { type SymbolEmoji } from "../../../emoji_data/types";

const selectSwapsByMarketID = ({
  marketID,
  page = 1,
  pageSize = LIMIT,
}: { marketID: AnyNumberString } & MarketStateQueryArgs) =>
  postgrest
    .from(TableName.SwapEvents)
    .select("*")
    .eq("market_id", marketID)
    .order("market_nonce", ORDER_BY.DESC)
    .range((page - 1) * pageSize, page * pageSize - 1);

const selectChatsByMarketID = ({
  marketID,
  page = 1,
  pageSize = LIMIT,
}: { marketID: AnyNumberString } & MarketStateQueryArgs) =>
  postgrest
    .from(TableName.ChatEvents)
    .select("*")
    .eq("market_id", marketID)
    .order("market_nonce", ORDER_BY.DESC)
    .range((page - 1) * pageSize, page * pageSize - 1);

// This query uses `offset` instead of `page` because the periodic state events query requires
// more granular pagination due to the requirements of the private TradingView charting library.
const selectPeriodicEventsSince = ({
  marketID,
  period,
  start,
  offset,
  limit = LIMIT,
}: PeriodicStateEventQueryArgs) =>
  postgrest
    .from(TableName.PeriodicStateEvents)
    .select("*")
    .eq("market_id", marketID)
    .eq("period", period)
    .gte("start_time", start.toISOString())
    .order("start_time", ORDER_BY.ASC)
    .range(offset, offset + limit - 1);

const selectMarketState = ({ searchEmojis }: { searchEmojis: SymbolEmoji[] }) =>
  postgrest
    .from(TableName.MarketState)
    .select("*")
    .eq("symbol_emojis", toQueryArray(searchEmojis))
    .limit(1)
    .single();

export const fetchSwapEvents = queryHelper(selectSwapsByMarketID, toSwapEventModel);
export const fetchChatEvents = queryHelper(selectChatsByMarketID, toChatEventModel);
// Note the lack of a conversion function here- this is because we must cache the data
// with no bigints, so we store it as the raw database JSON data.
export const fetchPeriodicEventsSince = queryHelper(
  selectPeriodicEventsSince,
  (r: DatabaseJsonType["periodic_state_events"]) => r
);
export const fetchMarketState = queryHelperSingle(selectMarketState, toMarketStateModel);
