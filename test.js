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
  ];

  it('should parse a remote and branch', function() {
    const tokens = tokenizer('origin master');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'origin master');
  });
  it('should parse an abbreviated remote and branch', function() {
    const tokens = tokenizer('om');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'origin master');
  });
  it('should "see through" a prefix and parse the base of a branch', function() {
    const tokens = tokenizer('ot');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'origin feature-test');
  });
  it('should fall back to using the prefix if there\'s no other option', function() {
    const tokens = tokenizer('of');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'origin feature-test');
  });
  it('should correctly parse an alternate branch destination', function() {
    const tokens = tokenizer('om:t');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'origin master:feature-test');
  });
  it('should correctly parse an alternate branch destination (non-prefixed branch as source)', function() {
    const tokens = tokenizer('o master:t');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'origin master:feature-test');
  });
  it('should correctly parse an alternate branch destination (non-prefixed branch as dest)', function() {
    const tokens = tokenizer('om:test');
    const rewritten = rewriter(things, tokens);
    assert.equal(parser(rewritten), 'origin master:feature-test');
  });

  describe('flags', () => {
    it('should correctly parse a -f flag', function() {
      const tokens = tokenizer('om-f');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'origin master --force');
    });
    it('should correctly parse a --force flag', function() {
      const tokens = tokenizer('om--force');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'origin master --force');
    });
    it('should correctly parse a -v flag', function() {
      const tokens = tokenizer('om-v');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'origin master --verbose');
    });
    it('should correctly parse a --verbose flag', function() {
      const tokens = tokenizer('om-verbose');
      const rewritten = rewriter(things, tokens);
      assert.equal(parser(rewritten), 'origin master --verbose');
    });
  });
});
