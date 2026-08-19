"use client";

import * as React from "react";

import type { CarouselApi, CarouselContextProps } from "./carousel-types";

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

export { CarouselContext, useCarousel };
export type { CarouselApi };
