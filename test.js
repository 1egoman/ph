const {default: getBranchAndRemoteFromArgs, predicateNeedleMatchScore, tokenizer, rewriter, parser} = require('./index');
const assert = require('assert');

describe('matching a predicate given a search item', function() {
  it('should match master', function() {
    assert.equal(predicateNeedleMatchScore('master', 'master'), 1);
    assert.equal(predicateNeedleMatchScore('prefix/master', 'master'), 1);
    assert.equal(predicateNeedleMatchScore('master', 'm'), 1/6);
    assert.equal(predicateNeedleMatchScore('prefix/master', 'm'), 1/6);
  });
});

describe('parse entries', function() {
  const things = [
    {type: 'remote', name: 'origin'},
    {type: 'branch', name: 'master'},
    {type: 'branch', name: 'feature-test'},
    {type: 'branch', name: 'feature-tsuperlong'},
  ];

  it('should parse a remote and branch', function() {
    const tokens = tokenizer('origin master');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin master');
  });
  it('should parse an abbreviated remote and branch', function() {
    const tokens = tokenizer('om');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin master');
  });
  it('should "see through" a prefix and parse the base of a branch', function() {
    const tokens = tokenizer('ot');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin feature-test');
  });
  it('should fall back to using the prefix if there\'s no other option', function() {
    const tokens = tokenizer('of');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin feature-test');
  });
  it('should correctly parse an alternate branch destination', function() {
    const tokens = tokenizer('om:t');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin master:feature-test');
  });
  it('should correctly parse an alternate branch destination (non-prefixed branch as source)', function() {
    const tokens = tokenizer('o master:t');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin master:feature-test');
  });
  it('should correctly parse an alternate branch destination (non-prefixed branch as dest)', function() {
    const tokens = tokenizer('om:test');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin master:feature-test');
  });
  it('should correctly parse an origin, then a branch without a source', function() {
    const tokens = tokenizer('o:m');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'push origin :master');
  });

  it('should correctly parse the current branch', function() {
    const tokens = tokenizer('');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten, 'current-branch'), 'push origin current-branch');
  });
  it('should correctly parse the current branch, with explicit identifier', function() {
    const tokens = tokenizer('.');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten, 'current-branch'), 'push origin current-branch');
  });
  it('should correctly parse the current branch with an explicit destination', function() {
    const tokens = tokenizer('.:m');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten, 'current-branch'), 'push origin current-branch:master');
  });
  it('should correctly parse the current branch with an explicit source', function() {
    const tokens = tokenizer('m:.');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten, 'current-branch'), 'push origin master:current-branch');
  });

  describe('flags', () => {
    it('should correctly parse a -f flag', function() {
      const tokens = tokenizer('om-f');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'push origin master --force');
    });
    it('should correctly parse a --force flag', function() {
      const tokens = tokenizer('om--force');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'push origin master --force');
    });
    it('should correctly parse a -v flag', function() {
      const tokens = tokenizer('om-v');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'push origin master --verbose');
    });
    it('should correctly parse a --verbose flag', function() {
      const tokens = tokenizer('om --verbose');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'push origin master --verbose');
    });
    it('should correctly parse a --some-super-long-unknown-flag flag', function() {
      const tokens = tokenizer('om --some-super-long-unknown-flag');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'push origin master --some-super-long-unknown-flag');
    });
  });

  describe('pulling', function() {
    it('should correctly pull from origin master', function() {
      const tokens = tokenizer('pull origin master');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'pull origin master');
    });
    it('should correctly pull from origin master (abbreviated branch name and origin)', function() {
      const tokens = tokenizer('pull om');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'pull origin master');
    });
    it('should correctly pull from origin master, with short flag', function() {
      const tokens = tokenizer('-lom');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'pull origin master');
    });
    it('should correctly pull from origin master, with short flag at the end', function() {
      const tokens = tokenizer('om-l');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'pull origin master');
    });
    it('should correctly pull from origin master, with pull abbreviation', function() {
      const tokens = tokenizer('om,');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'pull origin master');
    });
  });
});
