var assert = require('assert'),
	TrieSearch = require('../src/TrieSearch');

describe('TrieSearch', function() {
	describe('new TrieSearch(keyFields) should work', function() {
		it('should set keyfields (1)', function() {
      var ts = new TrieSearch(['key']);
			assert.equal(ts.keyFields.length, 1);
		});

		it('should set keyfields (2)', function() {
      var ts = new TrieSearch('key');
			assert.equal(ts.keyFields.length, 1);
		});
	});
  
	describe('new TrieSearch(keyFields).keyToArr should work', function() {
		it('\'key\' -> [\'k\', \'e\', \'y\']', function() {
      var ts = new TrieSearch();
			assert.equal(ts.keyToArr('key')[0], 'k');
      assert.equal(ts.keyToArr('key')[1], 'e');
      assert.equal(ts.keyToArr('key')[2], 'y');
		});

		it('for options.min == 2, \'key\' -> [\'ke\', \'y\']', function() {
      var ts = new TrieSearch('blah', {min: 2});
			assert.equal(ts.keyToArr('key')[0], 'ke');
      assert.equal(ts.keyToArr('key')[1], 'y');
		});
    
		it('for options.min == 2, \'keyset\' -> [\'ke\', \'y\', \'s\', \'e\', \'t\']', function() {
      var ts = new TrieSearch('blah', {min: 2});
			assert.equal(ts.keyToArr('keyset')[0], 'ke');
      assert.equal(ts.keyToArr('keyset')[1], 'y');
      assert.equal(ts.keyToArr('keyset')[2], 's');
      assert.equal(ts.keyToArr('keyset')[3], 'e');
      assert.equal(ts.keyToArr('keyset')[4], 't');
		});

		it('for options.min == 3, \'key\' -> [\'key\']', function() {
      var ts = new TrieSearch('blah', {min: 3});
			assert.equal(ts.keyToArr('key')[0], 'key');
		});

		it('for options.min == 4, \'key\' -> []', function() {
      var ts = new TrieSearch('blah', {min: 4});
			assert.equal(ts.keyToArr('key').length, 0);
		});
	});

	describe('TrieSearch::add(...) and TrieSearch::get(...) should work for a single item', function() {
    var ts = new TrieSearch('key'),
      item = {key: 'blah'};

    ts.add(item);

		it('add(\'blah\') should build map of nodes', function() {
			assert(ts.root['b'] !== undefined, 'b does not exist');
      assert(ts.root['b']['l'] !== undefined, 'bl does not exist');
      assert(ts.root['b']['l']['a'] !== undefined, 'bla does not exist');
      assert(ts.root['b']['l']['a']['h'] !== undefined, 'blah does not exist');
		});

		it('get(\'blah\') for each subkey should work', function() {
			assert.equal(ts.get('b')[0], item);
      assert.equal(ts.get('bl')[0], item);
      assert.equal(ts.get('bla')[0], item);
      assert.equal(ts.get('blah')[0], item);
      assert.equal(ts.get('blab').length, 0);
      assert.equal(ts.get('nope').length, 0);
		});
	});
  
	describe('TrieSearch::get(...) should work for multiple keys and union the result', function() {
    var ts = new TrieSearch('key', {min: 2}),
      item1 = {key: 'the quick brown fox'},
      item2 = {key: 'the quick brown'},
      item3 = {key: 'the quick fox'},
      item4 = {key: 'the fox'};

    ts.add(item1);
    ts.add(item2);
    ts.add(item3);
    ts.add(item4);

		it('get(\'the quick\') should return all entries', function() {
			assert(ts.get('the quick').length == 3);
		});
    
		it('get(\'the brown\') should return 2 entries', function() {
			assert(ts.get('the brown').length == 2);
		});
    
		it('get(\'the fox\') should return 3 entries', function() {
			assert(ts.get('the fox').length == 3);
		});
    
		it('get(\'fox brown\') should return 1 entry', function() {
			assert(ts.get('fox brown').length == 1);
		});
    
		it('get(\'brown fox\') should return 1 entry', function() {
			assert(ts.get('brown fox').length == 1);
		});
    
		it('get(\'brown f\') should return 2 entry, ignoring the shortness of the second word', function() {
			assert(ts.get('brown f').length == 2);
		});
    
		it('get(\'br f\') should return 1 entry, ignoring the shortness of the second word', function() {
			assert(ts.get('br f').length == 2);
		});
    
		it('get(\'qui b c d e f g h\') should return 3 entries, ignoring the shortness of all subsequent words', function() {
			assert(ts.get('qui b c d e f g h').length == 3);
		});
	});
  
	describe('TrieSearch::get(...) should work for multiple keys and union the result with an indexField', function() {
    var ts = new TrieSearch(['key', 'key2'], {min: 2, indexField: 'ix'}),
      item1 = {key: 'the quick brown fox', key2: 'jumped', ix: 1},
      item2 = {key: 'the quick brown', key2: 'jumped',ix: 2},
      item3 = {key: 'the quick fox', key2: 'brown', ix: 3},
      item4 = {key: 'the fox', key2: 'quick brown', ix: 4};

    ts.add(item1);
    ts.add(item2);
    ts.add(item3);
    ts.add(item4);

		it('get(\'the quick\') should return all 4 entries', function() {
			assert(ts.get('the quick').length == 4);
		});
    
		it('get(\'the brown\') should return all 4 entries', function() {
			assert(ts.get('the brown').length == 4);
		});

		it('get(\'the fox\') should return 3 entries', function() {
			assert(ts.get('the fox').length == 3);
		});
    
		it('get(\'fox brown\') should return 3 entries', function() {
			assert(ts.get('fox brown').length == 3);
		});
    
		it('get(\'brown fox\') should return 3 entries', function() {
			assert(ts.get('brown fox').length == 3);
		});
    
		it('get(\'brown z\') should return 4 entries', function() {
			assert(ts.get('brown z').length == 4);
		});
    
		it('get(\'br f\') should return all entries', function() {
			assert(ts.get('br f').length == 4);
		});
    
		it('get(\'jum b c d e f g h\') should return 2 entries, ignoring the shortness of all subsequent words', function() {
			assert(ts.get('jum b c d e f g h').length == 2);
		});
	});
  
	describe('TrieSearch::add(...) and TrieSearch::get(...) should work for a single item with multiple subphrases', function() {
    var ts = new TrieSearch('key'),
      item = {key: 'blah whatever yeah man'};

    ts.add(item);

		it('add(\'blah\') should build map of nodes', function() {
			assert(ts.root['b'] !== undefined, 'b does not exist');
      assert(ts.root['b']['l'] !== undefined, 'bl does not exist');
      assert(ts.root['b']['l']['a'] !== undefined, 'bla does not exist');
      assert(ts.root['b']['l']['a']['h'] !== undefined, 'blah does not exist');
		});

		it('get(\'blah\') and get(\'whatever\') for each subkey should work', function() {
			assert.equal(ts.get('b')[0], item);
      assert.equal(ts.get('bl')[0], item);
      assert.equal(ts.get('bla')[0], item);
      assert.equal(ts.get('blah')[0], item);
      
			assert.equal(ts.get('w')[0], item);
      assert.equal(ts.get('wh')[0], item);
      assert.equal(ts.get('whatever')[0], item);
		});
    
		it('get(\'whatever\') for each subkey should work', function() {
			assert.equal(ts.get('w')[0], item);
      assert.equal(ts.get('what')[0], item);
      assert.equal(ts.get('whatever')[0], item);
		});
    
		it('get(\'yeah\') for each subkey should work', function() {
			assert.equal(ts.get('y')[0], item);
      assert.equal(ts.get('ye')[0], item);
      assert.equal(ts.get('yea')[0], item);
      assert.equal(ts.get('yeah')[0], item);
		});
    
		it('get(\'man\') for each subkey should work', function() {
			assert.equal(ts.get('m')[0], item);
      assert.equal(ts.get('ma')[0], item);
      assert.equal(ts.get('man')[0], item);
		});
	});
  
	describe('TrieSearch::add(...) and TrieSearch::get(...) should work for multiple items', function() {
    var ts = new TrieSearch('key'),
      item1 = {key: 'I am item1!'},
      item2 = {key: 'I am item2!'};

    ts.add(item1);
    ts.add(item2);

		it('add(item1) and add(item2) should build map of nodes', function() {
			assert(ts.root['i'] !== undefined, 'I does not exist');
      assert(ts.root['a']['m'] !== undefined, 'am does not exist');
      assert(ts.root['i']['t']['e']['m']['1'] !== undefined, 'item1 does not exist');
      assert(ts.root['i']['t']['e']['m']['2'] !== undefined, 'item2 does not exist');
		});

		it('get(\'i\') should return 2 items', function() {
			assert(ts.get('i').length == 2, 'did not return 2 items!');
      assert(ts.get('item').length == 2, 'did not return 2 items!');
		});

		it('get(\'item1\') and get(\'item2\') should return 1 item', function() {
			assert(ts.get('item1').length == 1, 'did not return 1 item!');
      assert(ts.get('item2').length == 1, 'did not return 1 item!');
		});
	});
  
	describe('TrieSearch::add(...) and TrieSearch::get(...) should work with options.min', function() {
    var ts = new TrieSearch('key', {min: 2}),
      item1 = {key: 'I am item1!'},
      item2 = {key: 'I am item2!'};

    ts.add(item1);
    ts.add(item2);
    
		it('add(item1) and add(item2) should build map of nodes', function() {
			assert(ts.root['i'] === undefined, 'I should not exist!');
      assert(ts.root['am'] !== undefined, 'am does not exist');
      assert(ts.root['it']['e']['m']['1'] !== undefined, 'item1 does not exist');
      assert(ts.root['it']['e']['m']['2'] !== undefined, 'item2 does not exist');
		});

		it('get(\'i\') should return 0 items', function() {
			assert(ts.get('i').length == 0, 'did not return 0 items!');
      assert(ts.get('item').length == 2, 'did not return 2 items!');
		});
    
		it('get(\'item\') should return 2 items', function() {
      assert(ts.get('item').length == 2, 'did not return 2 items!');
		});

		it('get(\'item1\') and get(\'item2\') should return 1 item', function() {
			assert(ts.get('item1').length == 1, 'did not return 1 item!');
      assert(ts.get('item2').length == 1, 'did not return 1 item!');
		});
	});
});