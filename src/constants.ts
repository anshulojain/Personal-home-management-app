/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category } from "./types";

export const INITIAL_CATEGORIES: Category[] = [
  { id: "water", name: "Water Filters", icon: "Droplets" },
  { id: "car", name: "Car Maintenance", icon: "Car" },
];

export const FREQUENCY_OPTIONS = [
  { label: "1 Month", value: 1 },
  { label: "3 Months", value: 3 },
  { label: "6 Months", value: 6 },
  { label: "1 Year", value: 12 },
  { label: "2 Years", value: 24 },
];
