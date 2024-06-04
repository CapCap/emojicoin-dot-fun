"use client";

import React from "react";

import { FlexGap } from "@containers";
import { Text } from "components/text";

import { Arrow } from "components/svg";
import { StyledBtn } from "./styled";

const ButtonsBlock: React.FC = () => {
  return (
    <FlexGap gap="17px" justifyContent="center" marginTop="30px">
      <StyledBtn>
        <Text textScale="pixelHeading2" fontSize="48px" color="darkGray">
          {"{"}
        </Text>

        <Arrow width="21px" rotate="180deg" />

        <Text textScale="pixelHeading2" fontSize="48px" color="darkGray">
          {"}"}
        </Text>
      </StyledBtn>

      <StyledBtn>
        <Text textScale="pixelHeading2" fontSize="48px" color="darkGray">
          {"{"}
        </Text>

        <Arrow width="21px" />

        <Text textScale="pixelHeading2" fontSize="48px" color="darkGray">
          {"}"}
        </Text>
      </StyledBtn>
    </FlexGap>
  );
};

export default ButtonsBlock;