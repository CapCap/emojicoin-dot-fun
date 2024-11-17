"use client";

// cspell:word martianwallet
// cspell:word pontem
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "styled-components";
import { GlobalStyle } from "styles";
import ThemeContextProvider, { useThemeContext } from "./theme-context";
import Loader from "components/loader";
import Header from "components/header";
import Footer from "components/footer";
import useMatchBreakpoints from "hooks/use-match-breakpoints/use-match-breakpoints";
import ContentWrapper from "./ContentWrapper";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AptosContextProvider } from "./wallet-context/AptosContextProvider";
import StyledToaster from "styles/StyledToaster";
import {
  EventStoreProvider,
  UserSettingsProvider,
} from "./event-store-context/StateStoreContextProviders";
import { enableMapSet } from "immer";
import { ConnectToWebSockets } from "./ConnectToWebSockets";
import { APTOS_API_KEY, APTOS_NETWORK } from "lib/env";
import { WalletModalContextProvider } from "./wallet-context/WalletModalContext";
import { PontemWallet } from "@pontem/wallet-adapter-plugin";
import { RiseWallet } from "@rise-wallet/wallet-adapter";
import { MartianWallet } from "@martianwallet/aptos-wallet-adapter";
import { EmojiPickerProvider } from "./emoji-picker-context/EmojiPickerContextProvider";
import { isMobile, isTablet } from "react-device-detect";
import { RewardsBanner } from "components/rewards-banner";
import { GeoblockedBanner } from "components/geoblocking";
import { HeaderSpacer } from "components/header-spacer";
import { useSearchParams } from "next/navigation";
import { Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

enableMapSet();

const queryClient = new QueryClient();

const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const { isDesktop } = useMatchBreakpoints();

  const isMobileMenuOpen = isOpen && !isDesktop;

  const wallets = useMemo(() => [new PontemWallet(), new RiseWallet(), new MartianWallet()], []);

  // Eventually, this needs to check local storage as well. For now, just check the search params.
  const searchParams = useSearchParams();
  const { aptosConnect } = useMemo(() => {
    const privateKeyString = searchParams.get("claim_key");
    let privateKey: Ed25519PrivateKey | undefined;
    try {
      privateKey = new Ed25519PrivateKey(privateKeyString ?? "");
    } catch {
      null;
    }
    return {
      aptosConnect: {
        claimSecretKey: privateKey?.toUint8Array(),
      },
    };
  }, [searchParams]);

  useEffect(() => {
    console.log(aptosConnect);
  }, [aptosConnect]);

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <EventStoreProvider>
          <UserSettingsProvider>
            <AptosWalletAdapterProvider
              plugins={wallets}
              autoConnect={true}
              dappConfig={{
                aptosApiKey: APTOS_API_KEY,
                network: APTOS_NETWORK,
                aptosConnect,
              }}
            >
              <WalletModalContextProvider>
                <AptosContextProvider>
                  <EmojiPickerProvider
                    initialState={{
                      nativePicker: isMobile || isTablet,
                    }}
                  >
                    <GlobalStyle />
                    <ConnectToWebSockets />
                    <Suspense fallback={<Loader />}>
                      <StyledToaster />
                      <ContentWrapper>
                        <Header isOpen={isMobileMenuOpen} setIsOpen={setIsOpen} />
                        <HeaderSpacer />
                        <GeoblockedBanner />
                        <RewardsBanner />
                        {children}
                        <Footer />
                      </ContentWrapper>
                    </Suspense>
                  </EmojiPickerProvider>
                </AptosContextProvider>
              </WalletModalContextProvider>
            </AptosWalletAdapterProvider>
          </UserSettingsProvider>
        </EventStoreProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [p, setP] = useState(false);

  // Hack for now because I'm unsure how to get rid of the warning.
  // Not sure if this is even the wrong way to do it, actually.
  useEffect(() => {
    setP(true);
  }, []);

  return (
    p && (
      <ThemeContextProvider>
        <ThemedApp>{children}</ThemedApp>
      </ThemeContextProvider>
    )
  );
};

export default Providers;
