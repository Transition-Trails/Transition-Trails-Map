import type { TrailConfig } from "../types/salesforce.js";

export const DEFAULT_TRAIL_CONFIG: TrailConfig = {
  id:                  "",
  name:                "Default",
  trailId:             "explorer-journey",
  pennyRole:           null,
  tone:                null,
  focalPoints:         null,
  specialInstructions: null,
  isActive:            true,
};
