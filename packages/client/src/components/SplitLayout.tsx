import React from "react";
import { CSSProperties } from "react";
import styled from "styled-components";

const SplitLayoutRoot = styled.div<{ $layout: "columns" | "rows" }>`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  flex-direction: ${(p) => (p.$layout === "columns" ? "row" : "column")};
`;

const Slot = styled.div<{
  $size: number | undefined;
  $layout: "columns" | "rows";
}>`
  ${(p) =>
    p.$size && `${p.$layout === "columns" ? "width" : "height"}: ${p.$size}px`};
`;

type SplitLayoutProps = {
  layout: "rows" | "columns";
  first: () => React.ReactNode;
  firstStyles?: CSSProperties;
  second: () => React.ReactNode;
  secondStyles?: CSSProperties;
  size: { first: number } | { second: number };
};
const SplitLayout = ({
  layout,
  first,
  firstStyles,
  second,
  secondStyles,
  size,
}: SplitLayoutProps): JSX.Element => {
  const [firstSize, secondSize] =
    "first" in size ? [size.first, undefined] : [undefined, size.second];

  return (
    <SplitLayoutRoot $layout={layout}>
      <Slot $size={firstSize} $layout={layout} style={firstStyles}>
        {first()}
      </Slot>
      <Slot $size={secondSize} $layout={layout} style={secondStyles}>
        {second()}
      </Slot>
    </SplitLayoutRoot>
  );
};

export default SplitLayout;
