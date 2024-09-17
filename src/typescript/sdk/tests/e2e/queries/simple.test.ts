import { type EmojiName, getEvents, ONE_APT } from "../../../src";
import TestHelpers, { EXACT_TRANSITION_INPUT_AMOUNT } from "../../utils/helpers";
import { Chat, ProvideLiquidity, Swap } from "../../../src/emojicoin_dot_fun/emojicoin-dot-fun";
import {
  fetchChats,
  fetchLiquidityEvents,
  fetchLatestStateEventForMarket,
  fetchSwaps,
  fetchUserLiquidityPools,
} from "../../../src/indexer-v2/queries";
import { getAptosClient } from "../../utils";
import RowEqualityChecks from "./equality-checks";
import { withQueryConfig } from "../../../src/indexer-v2/queries/utils";
import { TableName } from "../../../src/indexer-v2/types/snake-case-types";
import { getFundedAccounts } from "../../utils/test-accounts";
import { postgrest } from "../../../src/indexer-v2/queries/client";

jest.setTimeout(20000);

describe("queries swap_events and returns accurate swap row data", () => {
  const { aptos } = getAptosClient();
  const [registrant, user, swapper, provider] = getFundedAccounts(
    "0x00739effd4b9979ff5c51f57d37248911786d4039afd4e31270e2e37661f4007",
    "0x008e3dfa7bc7dd3ae0eb59919a1cd5f70155bd0b4d26bf146742bdba2d44b008",
    "0x0097ca77b3896cc62f0e390c268727f175d5835773da19011c2d3942240d2009",
    "0x0105ede7d798728422d2c9c9a07306a4a1df01dd2784623a386926b76a3e0010"
  );
  const marketEmojiNames: EmojiName[][] = [
    ["scroll"],
    ["selfie"],
    ["Japanese \"discount\" button"],
    ["adhesive bandage"],
  ];

  it("performs a simple registerMarket fetch accurately", async () => {
    const { registerResponse: response } = await TestHelpers.registerMarketFromNames({
      registrant,
      emojiNames: marketEmojiNames[0],
    });
    const events = getEvents(response);
    const { marketID } = events.marketRegistrationEvents[0];
    const marketLatestStateRes = await fetchLatestStateEventForMarket({
      marketID,
      minimumVersion: response.version,
    });
    const marketLatestStateRow = marketLatestStateRes[0];

    RowEqualityChecks.marketLatestStateRow(marketLatestStateRow, response);
  });

  it("performs a simple swap fetch accurately", async () => {
    const { marketAddress, emojicoin, emojicoinLP } = await TestHelpers.registerMarketFromNames({
      registrant: swapper,
      emojiNames: marketEmojiNames[1],
    });
    const res = await Swap.submit({
      aptosConfig: aptos.config,
      swapper,
      marketAddress,
      inputAmount: 90n,
      isSell: false,
      typeTags: [emojicoin, emojicoinLP],
      integrator: registrant.accountAddress,
      integratorFeeRateBPs: 0,
      minOutputAmount: 1n,
    });

    const events = getEvents(res);
    const { marketID } = events.swapEvents[0];

    const queryRes = await fetchSwaps({ marketID, minimumVersion: res.version, limit: 1 });
    const row = queryRes[0];

    RowEqualityChecks.swapRow(row, res);
  });

  it("performs a simple chat fetch accurately", async () => {
    const { marketAddress, emojicoin, emojicoinLP, emojis } =
      await TestHelpers.registerMarketFromNames({
        registrant: user,
        emojiNames: marketEmojiNames[2],
      });

    const res = await Chat.submit({
      aptosConfig: aptos.config,
      user,
      marketAddress,
      emojiBytes: emojis.map((e) => e.hex),
      emojiIndicesSequence: new Uint8Array(Array.from({ length: emojis.length }, (_, i) => i)),
      typeTags: [emojicoin, emojicoinLP],
    });

    const events = getEvents(res);
    const { marketID } = events.chatEvents[0];

    const queryRes = await fetchChats({ marketID, minimumVersion: res.version, limit: 1 });
    const row = queryRes[0];

    RowEqualityChecks.chatRow(row, res);
  });

  it("performs a simple liquidity fetch accurately", async () => {
    const { marketAddress, emojicoin, emojicoinLP } = await TestHelpers.registerMarketFromNames({
      registrant: provider,
      emojiNames: marketEmojiNames[3],
    });

    const res = await Swap.submit({
      aptosConfig: aptos.config,
      swapper: provider,
      marketAddress,
      inputAmount: EXACT_TRANSITION_INPUT_AMOUNT,
      isSell: false,
      integrator: registrant.accountAddress,
      integratorFeeRateBPs: 0,
      typeTags: [emojicoin, emojicoinLP],
      minOutputAmount: 1n,
    });

    const events = getEvents(res);
    const swapEvent = events.swapEvents[0];
    const { marketID } = swapEvent;
    const transitioned = swapEvent.startsInBondingCurve && swapEvent.resultsInStateTransition;
    if (!transitioned) {
      throw new Error("The swap buy did not trigger a state transition.");
    }

    const liquidityRes = await ProvideLiquidity.submit({
      aptosConfig: aptos.config,
      provider,
      marketAddress,
      quoteAmount: ONE_APT,
      minLpCoinsOut: 1n,
      typeTags: [emojicoin, emojicoinLP],
    });

    const liquidityEvent = getEvents(liquidityRes).liquidityEvents.at(0);
    if (!liquidityEvent) {
      throw new Error("No liquidity event found.");
    }

    const liquidityEventsQueryRes = await fetchLiquidityEvents({
      marketID,
      marketNonce: liquidityEvent.marketNonce,
      // Note we must wait for the liquidity event to be indexed.
      // We very likely only need to wait for the first one.
      minimumVersion: liquidityRes.version,
    });

    const poolQueryRes = (await fetchLatestStateEventForMarket({ marketID })).at(0);
    const foundMarketInLatestStateTable = poolQueryRes?.market.marketID === marketID;
    const marketsWithPools = await withQueryConfig(
      () =>
        postgrest
          .from(TableName.MarketLatestStateEvent)
          .select("market_id")
          .eq("in_bonding_curve", false)
          .eq("market_id", marketID),
      ({ market_id }) => ({ marketID: BigInt(market_id as string) })
    )({ marketID });

    const foundInMarketsWithPools = marketsWithPools.find((m) => m.marketID === marketID);

    const userPoolQueryRes = await fetchUserLiquidityPools({
      provider,
      minimumVersion: res.version,
    });

    const foundInUserPools = userPoolQueryRes.find((row) => row.marketID === marketID);
    const row = liquidityEventsQueryRes[0];

    RowEqualityChecks.liquidityRow(row, liquidityRes);
    expect(foundMarketInLatestStateTable).toBe(true);
    expect(foundInMarketsWithPools).toBeTruthy();
    expect(foundInUserPools).toBeTruthy();
  });
});
