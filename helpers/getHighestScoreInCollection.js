// Given a collection, return the highest valued item.
// getHighestScoreInCollection({0: 'foo', 10: 'bar', 5: 'baz'})
// => 'bar'
module.exports = function getHighestScoreInCollection(collection) {
  let result, resultScore = 0;

  // For each item in the collection:
  // 1. If it's undefined, throw it out.
  // 2. If the item's score is bgger than the result, then promote the item to be the result.
  for (const item in collection) {
    if (collection[item] === undefined) {
      continue;
    } else if (
      !item ||
      collection[item] > resultScore
    ) {
      result = item;
      resultScore = collection[item]
    }
  }

  return result;
}

