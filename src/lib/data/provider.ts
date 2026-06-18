import { getTam } from "./mock/tam";
import { getOverview } from "./mock/overview";
import { getForecast } from "./mock/forecast";
import { getSignals } from "./mock/signals";
import { getChannel } from "./mock/channel";
import { getNews } from "./mock/news";

// Single seam between UI and data. v1 wires mock implementations anchored to real
// WSTS/SIA figures; live WSTS/Gartner/FRED/internal adapters swap in here only.
export const dataProvider = {
  getTam,
  getOverview,
  getForecast,
  getSignals,
  getChannel,
  getNews,
};

export type DataProvider = typeof dataProvider;
