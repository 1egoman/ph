const entityMatch = require('./helpers/entityMatch');
const getHighestScoreInCollection = require('./helpers/getHighestScoreInCollection');

// ----------------------------------------------------------------------------
// IDENTIFIERS
// ----------------------------------------------------------------------------

// Simple Tokens - these are parsed directly from the source.
const FLAG = 'FLAG';
const SHORT_FLAG = 'SHORT_FLAG';
const FLAG_AT_END = 'FLAG_AT_END';
const PULL = 'PULL';
const PUSH_TO = 'PUSH_TO';
const CURRENT_BRANCH = 'CURRENT_BRANCH';
const FULL = 'FULL';
const ABBREVIATED = 'ABBREVIATED';
const WHITESPACE = 'WHITESPACE';

// Complex Tokens - combinations of simple tokens are rewritten into these complex tokens
const ENTITY = 'ENTITY' ;
/* FLAG is also a complex token - SHORT_FLAG and FLAG_AT_END are rewritten into a FLAG token */

// ----------------------------------------------------------------------------
// TOKENIZER
// A tokenizer typically takes raw input and converts it into tokens. The below
// tokenizer looks for the first regular expression match from the start of
// the input as far into the input as possible and removes that, converting the
// input to a token.
// ----------------------------------------------------------------------------
const TOKENS = {
  SHORT_FLAG: /^-([a-zA-Z0-9])/,
  FLAG: /^--([a-zA-Z0-9-]{2,})/,
  FLAG_AT_END: /^-([a-zA-Z0-9-]{2,})$/,

  PULL: /^(pull |,)/,

  PUSH_TO: /^:/,
  CURRENT_BRANCH: /^\./,
  // GROUP_OPEN: /^\(/,
  // GROUP_CLOSE: /^\)/,

  // Branches or remotes
  FULL: /^([^()+:,& -]{3,})( |$|(?=:|\(|\)))/,
  ABBREVIATED: /^([^()+:,& ])/,

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
        continue outer; // Continue on to the next iteration of the while loop.
      }
    }

    throw new Error(`No such token can be found at the start of '${stack}'`);
  }

  return tokens;
}

// ----------------------------------------------------------------------------
// REWRITER
// Typically seen as a hack by compiler nerds, a rewriter takes AST, performs
// a transformation, and returns AST. In our case, the rewiter takes a list of
// all available entities as well as a list of tokens, returning a modified set
// of tokens.
// ----------------------------------------------------------------------------
module.exports.rewriter = function rewrite(entities, tokens) {
  return tokens.map(token => {
    switch (token.type) {
    // Rewrite branch and remote names. Takes branch abbreviations and turns them into full entities.
    case ABBREVIATED:
      // Reduce through all possible items that could be matched.
      const scores = entities.reduce((scores, item, index) => {
        const score = entityMatch(item.name, token.match[1])

        // If the new ranking is higher than the existing one, then replace the lower one.
        if (scores[index] === undefined || score > scores[index]) {
          scores[index] = score;
        }

        return scores;
      }, {});

      const value = entities[getHighestScoreInCollection(scores)];

      if (!value) {
        throw new Error(`No such remote or branch found matching the entity '${token.match[1]}'`);
      }

      return {type: ENTITY, value};

    // Rewrite branch and remote names. Takes a full branch and converts it into an entity.
    case FULL:
      // Find the first item that matches.
      const v = entities.find(item => {
        if (token.match[1] === item.name) {
          return item;
        } else if (token.match[1] === item.name.slice(item.name.split(entityMatch.SEPERATORS)[0].length+1)) {
          return item;
        }
      });

      if (!v) {
        throw new Error(`No such remote or branch found matching the entity '${token.match[1]}'`);
      }

      // Return the entity.
      return {type: ENTITY, value: v};

    // Rewrite flag names to 
    case FLAG:
    case SHORT_FLAG:
    case FLAG_AT_END:
      // Find the first capture group that matched (don't look at index 0 since that's the whole
      // match)
      const name = token.match.slice(1).find(i => i);
      switch (name) {
        // Common flags
        case 'v': return {type: FLAG, name: 'verbose'};

        // Push flags
        case 'f': return {type: FLAG, name: 'force'};
        case 't': return {type: FLAG, name: 'tags'};
        case 'n':
        case 'dry':
          return {type: FLAG, name: 'dry-run'};

        // Pull flags
        case 'l':
        case 'pull':
          return {type: PULL};
        case 'nf':
        case 'no-ff':
          return {type: FLAG, name: 'no-ff'}
        case 'ff':
        case 'ff-only':
          return {type: FLAG, name: 'ff-only'}
        default: return {type: FLAG, name};
      }
    default:
      return token;
    }
  });
}

// ----------------------------------------------------------------------------
// GENERATOR
// THe generator takes a list of tokens and converts them to a string, their
// final representation. In addition, this generator takes the contents of the
// current branch, which is used when no branch was specified.
// ----------------------------------------------------------------------------
module.exports.generator = function generator(tokens, currentBranch='master') {
  let isPulling = false;
  const hasOrigin = Boolean(tokens.find(t => t.type === ENTITY && t.value.type === 'remote'));
  const hasBranch = Boolean(tokens.find(t =>
    (t.type === ENTITY && t.value.type === 'branch') ||
    (t.type === CURRENT_BRANCH)
  ));

  const branch = i => i.type === ENTITY && i.value.type === 'branch';
  const remote = i => i.type === ENTITY && i.value.type === 'remote';
  const pushTo = i => i.type === PUSH_TO;
  const flag = i => i.type === FLAG;
  const whitespace = i => i.type === WHITESPACE;
  const pull = i => i.type === PULL
  const currentBranchMatch = i => i.type === CURRENT_BRANCH;

  const MATCHES = [
    {match: [whitespace], then: a => ''},
    {match: [flag], then: a => a.name.length === 1 ? `-${a.name}` : `--${a.name}`},
    {match: [branch], then: a => `${a.value.name} `},
    {match: [remote], then: a => `${a.value.name} `},
    {match: [branch, pushTo, branch], then: (a, b, c) => `${a.value.name}:${c.value.name} `},
    {match: [pushTo, branch], then: (a, b) => `:${b.value.name} `},
    {match: [currentBranchMatch, pushTo, branch], then: (a, b, c) => `${currentBranch}:${c.value.name} `},
    {match: [branch, pushTo, currentBranchMatch], then: (a, b, c) => `${a.value.name}:${currentBranch} `},
    {match: [pull], then: a => { isPulling = true; return ''; }},
    {match: [currentBranchMatch], then: a => currentBranch},
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

  if (!hasBranch) {
    result = `${currentBranch} ${result}`
  }
  if (!hasOrigin) {
    result = `origin ${result}`
  }

  if (isPulling) {
    result = `pull ${result}`
  } else {
    result = `push ${result}`
  }

  // Remove any surrounding whitespace before returning.
  return result.trim();
}
