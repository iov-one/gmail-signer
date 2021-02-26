import { Slip10RawIndex } from "@cosmjs/crypto";

export const parseHDPath = (path: string): ReadonlyArray<Slip10RawIndex> => {
  const regexp = /m\/(\d+)'\/(\d+)'\/(\d+)'\/(\d+)\/(\d+)/;
  const matched: RegExpMatchArray | null = regexp.exec(path);
  if (matched === null || matched.length !== 6) {
    throw new Error("cannot parse string as HDPath: `" + path + "'");
  }
  return [
    Slip10RawIndex.hardened(Number(matched[1])),
    Slip10RawIndex.hardened(Number(matched[2])),
    Slip10RawIndex.hardened(Number(matched[3])),
    Slip10RawIndex.normal(Number(matched[4])),
    Slip10RawIndex.normal(Number(matched[5])),
  ];
};
