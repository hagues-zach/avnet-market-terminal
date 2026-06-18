import { getTam } from "./mock/tam";

// Single seam between UI and data. v1 wires mock implementations anchored to real
// WSTS/SIA figures; live WSTS/Gartner/FRED/internal adapters swap in here only.
export const dataProvider = {
  getTam,
};

export type DataProvider = typeof dataProvider;
