const SEPERATORS = /[/_.-]/g;

function predicateNeedleMatchScore(predicate, needle) {
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

function getHighestScoreInCollection(collection) {
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

const TOKENS = {
  FLAG: /^--?([a-zA-Z]+)/,

  PUSH_TO: /^:/,
  GROUP_OPEN: /^\(/,
  GROUP_CLOSE: /^\)/,

  // Branches or remotes
  FULL: /^([^ :()-]{3,})( |$|(?=:|\(|\)))/,
  ABBREVIATED: /^([^()+: ])/,

  // Always resort to whitespace last.
  WHITESPACE: /^[ ]/,
};
module.exports.tokenizer = function tokenizer(stack) {
  let match, tokens = [];
  outer:
  while (stack.length > 0) {
    for (let token in TOKENS) {
      if (match = TOKENS[token].exec(stack)) {
        tokens.push({match, type: token})
        stack = stack.slice(match[0].length);
        continue outer;
      }
    }

    throw new Error(`No such token can be found at the start of '${stack}'`);
  }

  return tokens;
}

// Rewrite branch and remote names. Takes branch abbreviations and turns them into full entities.
module.exports.rewriter = function rewrite(things, tokens) {
  return tokens.map(token => {
    switch (token.type) {
    case 'ABBREVIATED':
      // Reduce through all possible items that could be matched.
      const scores = things.reduce((scores, item, index) => {
        const score = predicateNeedleMatchScore(item.name, token.match[1])

        // If the new ranking is higher than the existing one, then replace the lower one.
        if (scores[index] === undefined || score > scores[index]) {
          scores[index] = score;
        }

        return scores;
      }, {});

      const value = things[getHighestScoreInCollection(scores)];

      if (!value) {
        throw new Error(`No such remote or branch found matching the entity '${token.match[1]}'`);
      }

      return {type: 'ENTITY', value};
    case 'FULL':
      // Find the first item that matches.
      const v = things.find(item => {
        if (token.match[1] === item.name) {
          return item;
        } else if (token.match[1] === item.name.slice(item.name.split(SEPERATORS)[0].length+1)) {
          return item;
        }
      });

      if (!v) {
        throw new Error(`No such remote or branch found matching the entity '${token.match[1]}'`);
      }

      // Return the entity.
      return {type: 'ENTITY', value: v};
    case 'FLAG':
      const name = token.match[1];
      switch (name) {
        case 'f': return {type: 'FLAG', name: 'force'};
        case 'v': return {type: 'FLAG', name: 'verbose'};
        case 't': return {type: 'FLAG', name: 'tags'};
        case 'n':
        case 'dry':
          return {type: 'FLAG', name: 'dry-run'};
        case 'l':
        case 'pull':
          return {type: 'PULL'};
        default: return {type: 'FLAG', name};
      }
    default:
      return token;
    }
  });
}

module.exports.parser = function parser(tokens) {
  const branch = i => i.type === 'ENTITY' && i.value.type === 'branch';
  const remote = i => i.type === 'ENTITY' && i.value.type === 'remote';
  const pushTo = i => i.type === 'PUSH_TO';
  const flag = i => i.type === 'FLAG';
  const whitespace = i => i.type === 'WHITESPACE';

  const MATCHES = [
    {match: [whitespace], then: a => ''},
    {match: [flag], then: a => a.name.length === 1 ? `-${a.name}` : `--${a.name}`},
    {match: [branch], then: a => `${a.value.name} `},
    {match: [remote], then: a => `${a.value.name} `},
    {match: [branch, pushTo, branch], then: (a, b, c) => `${a.value.name}:${c.value.name} `},
  ];

  let result = "";
  while (tokens.length > 0) {
    // Pick the largest match that matches.
    const bestMatchIndex = MATCHES.reduce((bestIndex, {match, then}, index) => {
      const validMatch = match.every((item, ct) => {
        return tokens[ct] && item(tokens[ct]); // Verify that the match function succceeds for each item.
      });

      if (validMatch && bestIndex === -1) { // If no best index has been set, then set one.
        return index;
      } else if (validMatch) {
        return MATCHES[bestIndex].match.length > match.length ? bestIndex : index;
      } else {
        return bestIndex;
      }
    }, -1);

    if (bestMatchIndex === -1) {
      const tokenStack = tokens.map(i => i.type).join(',');
      throw new Error(`Parser: no tokens are able to be pulled off the front of the token stack ${tokenStack}`)
    }

    // Pull the matched tokens off the front of the tokens array, and pass them to the text
    // generator.
    const tokensThatWereMatched = tokens.splice(0, MATCHES[bestMatchIndex].match.length);
    result += MATCHES[bestMatchIndex].then.apply(null, tokensThatWereMatched);
  }

  // Remove any surrounding whitespace before returning.
  return result.trim();
}

module.exports.predicateNeedleMatchScore = predicateNeedleMatchScore;
