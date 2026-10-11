import { request } from "./client";
import type {
  PlantSearchResult,
  SpeciesCareProfile,
  PlantRangeStatus,
} from "./types";

export const plantbookApi = {
  /**
   * Search OpenPlantbook database by query alias (minimum 3 characters).
   */
  search: (query: string) =>
    request<PlantSearchResult[]>(`/plantbook/search?q=${encodeURIComponent(query)}`),

  /**
   * Link an existing plant to an OpenPlantbook species PID.
   */
  linkPlant: (plantId: number | string, pid: string) =>
    request<SpeciesCareProfile>(`/plants/${plantId}/plantbook-link`, {
      method: "POST",
      body: JSON.stringify({ pid }),
    }),

  /**
   * Get the species care profile for a plant.
   */
  getCareProfile: (plantId: number | string) =>
    request<SpeciesCareProfile>(`/plants/${plantId}/care-profile`),

  /**
   * Get ideal range evaluation comparing live ESP32 sensors against the species range.
   */
  getRangeStatus: (plantId: number | string) =>
    request<PlantRangeStatus>(`/plants/${plantId}/range-status`),
};
