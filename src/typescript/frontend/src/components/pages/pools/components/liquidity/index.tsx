"use client";

import React, { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useThemeContext } from "context";
import { translationFunction } from "context/language-context";
import { Flex, Column, FlexGap } from "@containers";
import { Text, Button, InputNumeric } from "components";
import { StyledAddLiquidityWrapper } from "./styled";
import { ProvideLiquidity, RemoveLiquidity } from "@sdk/emojicoin_dot_fun/emojicoin-dot-fun";
import { toCoinDecimalString } from "lib/utils/decimals";
import {
  AptosInputLabel,
  EmojiInputLabel,
  EmojiInputLabelStyles,
} from "components/pages/emojicoin/components/trade-emojicoin/InputLabels";
import { useAptos } from "context/wallet-context/AptosContextProvider";
import { toActualCoinDecimals } from "lib/utils/decimals";
import { toCoinTypes } from "@sdk/markets/utils";
import ButtonWithConnectWalletFallback from "components/header/wallet-button/ConnectWalletButton";
import {
  useSimulateProvideLiquidity,
  useSimulateRemoveLiquidity,
} from "lib/hooks/queries/use-simulate-provide-liquidity";
import { Arrows } from "components/svg";
import type { EntryFunctionTransactionBuilder } from "@sdk/emojicoin_dot_fun/payload-builders";
import { useSearchParams } from "next/navigation";
import AnimatedStatusIndicator from "components/pages/launch-emojicoin/animated-emoji-circle";
import { TypeTag } from "@aptos-labs/ts-sdk";
import Info from "components/info";
import { type AnyNumberString } from "@sdk/types/types";
import { type PoolsData } from "../../ClientPoolsPage";
import { EmojiPill } from "components/EmojiPill";

type LiquidityProps = {
  market: PoolsData | undefined;
};

const fmtCoin = (n: AnyNumberString | undefined) => {
  if (n === undefined) {
    return n;
  }
  return new Intl.NumberFormat().format(Number(toCoinDecimalString(n, 8)));
};

const InnerWrapper = ({
  children,
  id,
  className,
}: PropsWithChildren<{ id: string; className?: string }>) => (
  <div
    id={id}
    className={
      `flex justify-between px-[18px] py-[7px] items-center ` +
      `h-[55px] md:items-stretch ` +
      className
    }
  >
    {children}
  </div>
);

const grayLabel = `
  pixel-heading-4 mb-[-6px] text-light-gray !leading-5 uppercase
`;

const inputAndOutputStyles = `
  block text-[16px] font-normal h-[32px] outline-none w-full
  font-forma
  border-transparent !p-0 text-white
`;

const Liquidity = ({ market }: LiquidityProps) => {
  const { t } = translationFunction();
  const { theme } = useThemeContext();

  const searchParams = useSearchParams();

  const presetInputAmount =
    searchParams.get("add") !== null ? searchParams.get("add") : searchParams.get("remove");
  const presetInputAmountIsValid =
    presetInputAmount !== null &&
    presetInputAmount !== "" &&
    !Number.isNaN(Number(presetInputAmount));

  const [liquidity, setLiquidity] = useState<bigint>(
    toActualCoinDecimals({
      num: searchParams.get("add") !== null && presetInputAmountIsValid ? presetInputAmount! : "1",
    })
  );

  const [lp, setLP] = useState<bigint>(
    toActualCoinDecimals({
      num:
        searchParams.get("remove") !== null && presetInputAmountIsValid ? presetInputAmount! : "1",
    })
  );

  const [direction, setDirection] = useState<"add" | "remove">(
    searchParams.get("remove") !== null ? "remove" : "add"
  );

  const loadingComponent = useMemo(() => <AnimatedStatusIndicator numEmojis={4} />, []);

  const {
    aptos,
    account,
    submit,
    aptBalance,
    refetchIfStale,
    setEmojicoinType,
    emojicoinBalance,
    emojicoinLPBalance,
  } = useAptos();

  const provideLiquidityResult = useSimulateProvideLiquidity({
    marketAddress: market?.market.marketAddress,
    quoteAmount: liquidity ?? 0,
  });

  const { emojicoin } = market ? toCoinTypes(market?.market.marketAddress) : { emojicoin: "" };

  const removeLiquidityResult = useSimulateRemoveLiquidity({
    marketAddress: market?.market.marketAddress,
    lpCoinAmount: lp ?? 0,
    typeTags: [emojicoin ?? ""],
  });

  const enoughApt =
    direction === "add" ? aptBalance !== undefined && aptBalance >= (liquidity ?? 0) : true;
  const enoughEmoji =
    direction === "add"
      ? emojicoinBalance !== undefined &&
        emojicoinBalance >= BigInt(provideLiquidityResult?.base_amount ?? 0)
      : true;
  const enoughEmojiLP =
    direction === "remove"
      ? emojicoinLPBalance !== undefined && emojicoinLPBalance >= (lp ?? 0)
      : true;

  useEffect(() => {
    if (emojicoin instanceof TypeTag) {
      setEmojicoinType(emojicoin);
    }
  }, [emojicoin, setEmojicoinType]);

  useEffect(() => {
    if (account) {
      refetchIfStale("apt");
    }
    if (market && account) {
      refetchIfStale("emojicoin");
      refetchIfStale("emojicoinLP");
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [market, account]);

  const isActionPossible =
    market !== undefined &&
    (direction === "add" ? liquidity !== 0n : lp !== 0n) &&
    enoughApt &&
    enoughEmoji &&
    enoughEmojiLP;

  const balanceLabel = useMemo(() => {
    return ` (${t("Balance")}: `;
  }, [t]);

  const aptInput = (
    <InnerWrapper id="apt" className="liquidity-input">
      <Column>
        <div className={grayLabel}>
          {direction === "add" ? t("You deposit") : t("You get")}
          {balanceLabel}
          <span className={enoughApt ? "text-green" : "text-error"}>{fmtCoin(aptBalance)}</span>
          {")"}
        </div>
        {direction === "add" ? (
          <InputNumeric
            className={inputAndOutputStyles + " bg-transparent leading-[32px] text-white"}
            onUserInput={(e) => setLiquidity(e)}
            value={liquidity}
            decimals={8}
          />
        ) : (
          <input
            className={inputAndOutputStyles + " bg-transparent leading-[32px] text-medium-gray"}
            disabled={true}
            value={fmtCoin(removeLiquidityResult?.quote_amount) ?? "..."}
          />
        )}
      </Column>
      <AptosInputLabel />
    </InnerWrapper>
  );

  const emojiInput = (
    <InnerWrapper id="emoji" className="liquidity-input">
      <Column>
        <div className={grayLabel}>
          {direction === "add" ? "You deposit" : "You get"}
          {balanceLabel}
          <span className={enoughEmoji ? "text-green" : "text-error"}>
            {fmtCoin(emojicoinBalance)}
          </span>
          {")"}
        </div>
        <input
          className={inputAndOutputStyles + " bg-transparent leading-[32px]"}
          style={{
            color: theme.colors.lightGray + "99",
          }}
          value={
            direction === "add"
              ? (fmtCoin(provideLiquidityResult?.base_amount) ?? "...")
              : (fmtCoin(removeLiquidityResult?.base_amount) ?? "...")
          }
          disabled
        ></input>
      </Column>
      <div>
        <EmojiInputLabel emoji={market ? market.market.symbolData.symbol : "-"} />
        <span className={EmojiInputLabelStyles}>{market ? "" : "-"}</span>
      </div>
    </InnerWrapper>
  );

  const emojiLPInput = (
    <InnerWrapper id="lp" className="liquidity-input">
      <Column>
        <div className={grayLabel}>
          {direction === "remove" ? "You deposit" : "You get"}
          {balanceLabel}
          <span className={enoughEmojiLP ? "text-green" : "text-error"}>
            {fmtCoin(emojicoinLPBalance)}
          </span>
          {")"}
        </div>
        {direction === "add" ? (
          <input
            className={inputAndOutputStyles + " bg-transparent leading-[32px] text-medium-gray"}
            value={fmtCoin(provideLiquidityResult?.lp_coin_amount) ?? "..."}
            disabled={true}
          />
        ) : (
          <InputNumeric
            className={inputAndOutputStyles + " bg-transparent leading-[32px] text-white"}
            onUserInput={(e) => setLP(e)}
            value={lp}
            decimals={8}
          />
        )}
      </Column>
      <div>
        <EmojiInputLabel emoji={market ? `${market.market.symbolData.symbol}` : ""} />
        <span className={EmojiInputLabelStyles}>{market ? " LP" : "-"}</span>
      </div>
    </InnerWrapper>
  );

  return (
    <Flex width="100%" justifyContent="center" p={{ _: "64px 17px", mobileM: "64px 33px" }}>
      <Column width="100%" maxWidth="414px" justifyContent="center">
        <Flex width="100%" justifyContent="space-between" alignItems="baseline" mb="10px">
          <Flex flexDirection="row">
            <FlexGap gap="10px" position="relative" justifyContent="left" alignItems="baseline">
              <button
                onClick={() => setDirection(direction === "add" ? "remove" : "add")}
                className="absolute left-[-30px] top-[-2px]"
              >
                <Arrows color="econiaBlue" />
              </button>

              <Text textScale="heading1" textTransform="uppercase">
                {t(direction === "add" ? "Add liquidity" : "Remove liquidity")}
              </Text>

              <Info>
                <Text
                  textScale="pixelHeading4"
                  lineHeight="20px"
                  color="black"
                  textTransform="uppercase"
                >
                  Liquidity providers receive a 0.25% fee from all trades, proportional to their
                  pool share. Fees are continuously reinvested in the pool and can be claimed by
                  withdrawing liquidity.
                </Text>
              </Info>
            </FlexGap>
          </Flex>
          <FlexGap flexDirection="row" gap="5px">
            {direction === "add" ? (
              <>
                <EmojiPill
                  emoji={"waxing crescent moon"}
                  description="Deposit 25%"
                  onClick={() => {
                    setLiquidity(aptBalance / 4n);
                  }}
                />
                <EmojiPill
                  emoji={"first quarter moon"}
                  description="Deposit 50%"
                  onClick={() => {
                    setLiquidity(aptBalance / 2n);
                  }}
                />
                <EmojiPill
                  emoji={"full moon"}
                  description="Deposit 100%"
                  onClick={() => {
                    setLiquidity(aptBalance);
                  }}
                />
              </>
            ) : (
              <>
                <EmojiPill
                  emoji="nauseated face"
                  description="Withdraw 50%"
                  onClick={() => {
                    setLP(emojicoinLPBalance / 2n);
                  }}
                />
                <EmojiPill
                  emoji="face vomiting"
                  description="Withdraw 100%"
                  onClick={() => {
                    setLP(emojicoinLPBalance);
                  }}
                />
              </>
            )}
          </FlexGap>
        </Flex>

        {direction === "add" ? (
          <StyledAddLiquidityWrapper>
            {aptInput}
            {emojiInput}
            {emojiLPInput}
          </StyledAddLiquidityWrapper>
        ) : (
          <StyledAddLiquidityWrapper>
            {emojiLPInput}
            {aptInput}
            {emojiInput}
          </StyledAddLiquidityWrapper>
        )}

        <Flex
          width="100%"
          justifyContent="center"
          mb={{ _: "17px", tablet: "37px" }}
          position="relative"
        >
          <ButtonWithConnectWalletFallback>
            <Button
              scale="lg"
              disabled={!isActionPossible}
              style={{ cursor: isActionPossible ? "pointer" : "not-allowed" }}
              onClick={async () => {
                if (!account) {
                  return;
                }
                const { emojicoin, emojicoinLP } = toCoinTypes(market!.market.marketAddress);
                let builderLambda: () => Promise<EntryFunctionTransactionBuilder>;
                if (direction === "add") {
                  builderLambda = () =>
                    ProvideLiquidity.builder({
                      aptosConfig: aptos.config,
                      provider: account.address,
                      marketAddress: market!.market.marketAddress,
                      quoteAmount: liquidity ?? 0,
                      typeTags: [emojicoin, emojicoinLP],
                      minLpCoinsOut: 1n,
                    });
                } else {
                  builderLambda = () =>
                    RemoveLiquidity.builder({
                      aptosConfig: aptos.config,
                      provider: account.address,
                      marketAddress: market!.market.marketAddress,
                      lpCoinAmount: lp,
                      typeTags: [emojicoin, emojicoinLP],
                      minQuoteOut: 1n,
                    });
                }
                await submit(builderLambda);
              }}
            >
              {t(direction === "add" ? "Add liquidity" : "Remove liquidity")}
            </Button>
          </ButtonWithConnectWalletFallback>
        </Flex>

        <Text textScale="heading1" textTransform="uppercase" mb="16px">
          {t("Reserves")}
        </Text>

        <StyledAddLiquidityWrapper>
          <Flex
            p={{ _: "10px 12px 7px 10px", tablet: "18px 25px 7px 25px" }}
            justifyContent="space-between"
            alignItems="center"
          >
            <AptosInputLabel />

            <Text textScale={{ _: "bodySmall", tablet: "bodyLarge" }} textTransform="uppercase">
              {market ? (fmtCoin(market.state.cpammRealReserves.quote) ?? loadingComponent) : "-"}
            </Text>
          </Flex>

          <Flex
            p={{ _: "0px 12px 10px 12px", tablet: "0px 25px 18px 25px" }}
            justifyContent="space-between"
            alignItems="center"
          >
            <EmojiInputLabel emoji={market ? market.market.symbolData.symbol : "-"} />

            <Text textScale={{ _: "bodySmall", tablet: "bodyLarge" }} textTransform="uppercase">
              {market ? (fmtCoin(market.state.cpammRealReserves.base) ?? loadingComponent) : "-"}
            </Text>
          </Flex>
        </StyledAddLiquidityWrapper>
      </Column>
    </Flex>
  );
};

export default Liquidity;
