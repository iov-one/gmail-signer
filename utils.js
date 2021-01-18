const util = require("util");

const toPrettySize = (value) => {
  if (value < 1000) {
    return `${value} bytes`.padStart(10, " ");
  } else if (value < 1000000) {
    return `${(value / 1024, 2).toFixed(2)} KiB`.padStart(10, " ");
  } else if (value < 1000000000) {
    return `${(value / 1024 / 1024).toFixed(2)} MiB`.padStart(10, " ");
  }
};

const colorized = (value, color) => {
  return `\x1b[${color}m${value}\x1b[0m`;
};

const padded = (value, column, align = "left") => {
  if (align === "right") {
    return value.padStart(column.width, " ");
  } else {
    return value.padEnd(column.width, " ");
  }
};

const createColumns = (assets) => {
  return [
    {
      width: Math.max(...assets.map(({ name }) => name.length)),
    },
    {
      width: 10,
    },
    {
      width: 31,
    },
  ];
};

const logAssetStats = (asset, columns) => {
  const { name, chunks, chunkNames, info } = asset;
  const color = asset.isOverSizeLimit ? "33" : "32";
  const chunkTags = [
    asset.emmited ? colorized("[emitted]", 32) : "         ",
    info.development ? colorized("[dev]", 32) : "     ",
    asset.isOverSizeLimit ? colorized(" [big] ", 33) : "       ",
  ];
  const chunkIndices = (chunks.length > 0 ? [chunks, 1].join(", ") : "") + " ";
  const sizeColor = asset.isOverSizeLimit ? "33" : "0";
  const chunksColumnItems = [
    padded(chunkIndices, { width: 7 }, "right"),
    ...chunkTags,
  ];
  const line = util.format(
    "%s %s %s %s",
    colorized(padded(name, columns[0], "right"), color),
    colorized(padded(toPrettySize(asset.size), columns[1], "right"), sizeColor),
    chunksColumnItems.join(" "),
    chunkNames.join(" "),
  );
  console.log(line);
};

const logHeader = (stats, columns) => {
  const builtAt = new Date(stats.builtAt);
  const options = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };
  console.log(`Hash: ${stats.hash}`);
  console.log(`Version: webpack ${stats.version}`);
  console.log(`Time: ${stats.time}ms`);
  console.log(`Built at: ${builtAt.toLocaleString(undefined, options)}`);

  const header = util.format(
    "%s %s %s %s",
    padded("Asset", columns[0], "right"),
    padded("Size", columns[1], "right"),
    padded("Chunks", columns[2]),
    "Chunk Names",
  );
  console.log(header);
};

const logStats = (stats) => {
  const { assets } = stats;
  // Make columns first (computes 1st column width basically)
  const columns = createColumns(assets);
  // Show a header (like normal webpack does)
  logHeader(stats, columns);
  // Show each asset
  for (const asset of assets) {
    logAssetStats(asset, columns);
  }
};

module.exports = logStats;
