// What characters is a branch seperated by usually?
const SEPERATORS = /[/_.-]/g;

// Given a "predicate" (ie, an entity name) and a needle (the thing to evaluate againt the
// predicate), return a number indicating how closely the needle matches the predicate. A perfect
// match is a `1`, and a false match is `0`.
module.exports = function entityMatch(predicate, needle) {
  // A perfect match.
  if (predicate === needle) {
    return 1;
  }

  const parts = predicate.split(SEPERATORS);
  const allButFirstPart = parts.length === 1 ? predicate : parts.slice(1).join('-');

  // Matches the last part of the branch
  if (allButFirstPart === needle) {
    return 1;
  }

  // Matches the first letter of the last part of the branch
  // As the final part gets longer, we're more unsure of the answer.
  if (allButFirstPart[0] === needle[0]) {
    return 1 / allButFirstPart.length
  }

  // Hail mary - if the first letter of the prefix matches, use that.
  // This could be bad though because `f` would match both `feature-foo` and `feature-bar`, for
  // example.
  if (predicate[0] === needle[0]) {
    return 1 / allButFirstPart.length
  }

  return 0;
}

module.exports.SEPERATORS = SEPERATORS;
