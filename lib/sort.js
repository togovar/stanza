import {DATASETS} from "./constants";

export const sortBySource = (array, fn) => array.sort((a, b) => {
  return (DATASETS[fn(a)]?.idx || Number.MAX_SAFE_INTEGER) - (DATASETS[fn(b)]?.idx || Number.MAX_SAFE_INTEGER);
});
